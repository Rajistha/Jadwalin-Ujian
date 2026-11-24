import { NextRequest, NextResponse } from "next/server";

// Rate limiting in-memory
const requestCounts = new Map<string, { count: number; reset: number }>();

function getRateLimitKey(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "localhost";
  return ip.split(",")[0].trim();
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  // Allow unrestricted testing on localhost / dev
  if (key === "localhost" || key === "127.0.0.1" || key === "::1" || key === "unknown" || process.env.NODE_ENV !== "production") {
    return { allowed: true, remaining: 999 };
  }

  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const limit = 60; // 60 requests per 15 min

  const entry = requestCounts.get(key);
  if (!entry || now > entry.reset) {
    requestCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

export async function POST(req: NextRequest) {
  // Rate limit check
  const key = getRateLimitKey(req);
  const { allowed, remaining } = checkRateLimit(key);
  if (!allowed) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "Terlalu banyak permintaan. Coba lagi dalam 15 menit." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "INVALID_TYPE", message: "Format tidak didukung. Gunakan JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "FILE_TOO_LARGE", message: "Ukuran file maksimal 10 MB." },
        { status: 400 }
      );
    }

    // Convert to base64 for LLM API
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;

    // Try Gemini API (if key is configured)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const result = await extractWithGemini(base64, mimeType, geminiKey);
        return NextResponse.json(result, {
          headers: { "X-RateLimit-Remaining": String(remaining) },
        });
      } catch (err) {
        console.error("Gemini extraction failed:", err);
        // In production never show sample data as if it were the user's KRS
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "EXTRACT_FAILED" }, { status: 502 });
        }
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("GEMINI_API_KEY is not set");
      return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
    }

    // Dev only: sample data matching real TI course codes
    const mockCourses = extractMockCourses();
    return NextResponse.json(
      {
        detected_study_program: "Teknologi Informasi",
        courses: mockCourses,
        demo: true,
      },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (err) {
    console.error("/api/extract error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

async function extractWithGemini(
  base64: string,
  mimeType: string,
  apiKey: string
): Promise<{ detected_study_program?: string; courses: Array<{ code: string; name: string; class: string; study_program?: string; confidence: number }> }> {
  const prompt = `Kamu adalah sistem ekstraksi data KRS/jadwal kuliah mahasiswa FILKOM Universitas Brawijaya.

Dari gambar ini (screenshot KRS SIAM atau jadwal kuliah), ekstrak SEMUA mata kuliah yang terdaftar dan PROGRAM STUDI mahasiswa.

Format tabel KRS biasanya memiliki kolom: NAMA MK, KODE MK, PROGRAM STUDI, KELAS, SKS, STATUS.

Untuk setiap mata kuliah, ekstrak:
- code: kode mata kuliah persis seperti di gambar (mis. CIT60045, CIT61006, COM60051)
- name: nama mata kuliah lengkap persis seperti di gambar
- class: kelas persis seperti di gambar (A, B, C, D, dll). Jika tidak ada, gunakan "A"
- study_program: nilai dari kolom PROGRAM STUDI jika ada (mis. "Teknologi Informasi", "Teknik Informatika", "Sistem Informasi", "Teknik Komputer", "Pendidikan Teknologi Informasi")
- confidence: tingkat keyakinan ekstraksi (0.0 sampai 1.0)

Juga tentukan:
- detected_study_program: program studi dominan/utama yang tertera di KRS

PENTING:
- Ekstrak SEMUA baris matkul, jangan ada yang terlewat
- Kode matkul biasanya format: 3 huruf + 5 angka (mis. CIT60045, COM60051)
- Hanya ekstrak yang STATUS-nya "Disetujui" jika ada kolom STATUS
- Abaikan baris TOTAL SKS

Kembalikan HANYA JSON valid:
{
  "detected_study_program": "Teknologi Informasi",
  "courses": [
    { "code": "CIT60045", "name": "Kriptografi", "class": "A", "study_program": "Teknologi Informasi", "confidence": 0.98 }
  ]
}

Jika gambar tidak terbaca atau bukan KRS/jadwal, kembalikan:
{"courses": [], "error": "UNREADABLE"}`;

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          // Reading a table needs no reasoning; skipping it cuts latency a lot (2.5 models only)
          ...(model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(text);
}

function extractMockCourses() {
  // Demo fallback matching the real FILKOM TI KRS courses
  return [
    { code: "CIT60045", name: "Kriptografi", class: "A", study_program: "Teknologi Informasi", confidence: 0.98 },
    { code: "CIT60047", name: "Tata kelola dan Kebijakan Keamanan Siber", class: "A", study_program: "Teknologi Informasi", confidence: 0.96 },
    { code: "CIT60048", name: "Information Retrieval", class: "A", study_program: "Teknologi Informasi", confidence: 0.97 },
    { code: "CIT60049", name: "Teknologi Basis Data Non Relational", class: "A", study_program: "Teknologi Informasi", confidence: 0.96 },
    { code: "CIT61006", name: "Pengembangan Aplikasi Web", class: "B", study_program: "Teknologi Informasi", confidence: 0.98 },
    { code: "CIT61024", name: "Teknologi Keamanan Siber", class: "C", study_program: "Teknologi Informasi", confidence: 0.95 },
    { code: "CIT61026", name: "Internet of Things", class: "D", study_program: "Teknologi Informasi", confidence: 0.96 },
    { code: "COM60051", name: "Metodologi Penelitian dan Penulisan Ilmiah", class: "B", study_program: "Teknologi Informasi", confidence: 0.97 },
  ];
}
