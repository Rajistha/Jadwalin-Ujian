import type { DetectedCourse, KrsIssue } from "./types";

// Prodi assumed when the PROGRAM STUDI column can't be read.
export const DEFAULT_PROGRAM = "Teknologi Informasi";

// Column headers of the SIAM UB KRS table (used to recognise the header row).
const HEADER_COLUMNS = ["NAMA MK", "KODE MK", "PROGRAM STUDI", "KELAS", "SKS", "STATUS"] as const;

const PROGRAMS = [
  "Pendidikan Teknologi Informasi",
  "Teknologi Informasi",
  "Teknik Informatika",
  "Sistem Informasi",
  "Teknik Komputer",
  "Bioinformatika",
  "Ilmu Komputer",
];

// Fix common OCR confusions: letters part of the code should be letters, number part digits.
const toLetter = (c: string) => ({ "0": "O", "1": "I", "5": "S", "8": "B" } as Record<string, string>)[c] ?? c;
const toDigit = (c: string) =>
  ({ O: "0", o: "0", I: "1", l: "1", "!": "1", "|": "1", S: "5", B: "8", G: "6", e: "6", Z: "2", z: "2", g: "9", q: "9" } as Record<string, string>)[c] ?? c;

// Digits part may contain look-alike chars; trailing "!" is a common misread "1".
// An optional stray letter between prefix and digits ("COMB60051") is dropped.
// Ambiguous ones (e.g. B for 6 or 8) are corrected against known codes in /api/match.
// "e" is how small fonts often render a 6 ("CITe0048" = CIT60048).
const CODE_RE = /\b([A-Z0-9]{3})[A-Z]?([0-9OoIlSBGeZzgq!]{5})(?=\s|$)/;

// Fallback when the code is unreadable: "<name> <garbled code> <prodi> <class> <SKS x.00> ..."
// - greedy name so it anchors on the LAST prodi (course names can contain a prodi name,
//   e.g. "Tata Kelola Teknologi Informasi")
// - the garbled token must still look like a code (5-12 alphanumerics with at least 3 digits)
// - a class + SKS must follow the prodi, so biodata lines ("Program Studi: ... IPK 3.75") are ignored
const PROGRAM_ALT = PROGRAMS.map((p) => p.replace(/\s+/g, "\\s+")).join("|");
// A class cell: A..Z (doubled by OCR sometimes), INT, or N1A style. Not any 3-letter word ("IPK").
const CLASS_CELL = "(?:INT|N\\d[A-Za-z0-9]|[A-Za-z]{1,2})";
const AFTER_PROGRAM = `(\\s+${CLASS_CELL}\\s+\\d[.,]?\\d{2}\\b.*)$`;
const ROW_RE = new RegExp(`^(.+)\\s+((?=(?:\\D*\\d){3})\\S{5,12})\\s+(${PROGRAM_ALT})${AFTER_PROGRAM}`, "i");
// Whole KODE MK column missing (cut off in the screenshot): "<name> <prodi> <class> <SKS>"
const ROW_NO_CODE_RE = new RegExp(`^(.+)\\s+(${PROGRAM_ALT})${AFTER_PROGRAM}`, "i");

// Class names in the schedule: A..H, INT, and multi-char like N1A / N7W.
const CLASS_TOKEN = "(?:INT|N\\d[A-Z0-9]|[A-Z])";

// Returns "" when the class can't be read, so the matcher doesn't silently assume "A".
function extractClass(after: string): string {
  const upper = after.replace(/[|]/g, " ");
  // 1. Class token right before a number (SKS / capacity), e.g. "B 40 4" or "N1A 3,00"
  const beforeNumber = new RegExp(`(?:^|\\s)(${CLASS_TOKEN})\\s+\\d`).exec(upper)?.[1];
  if (beforeNumber) return beforeNumber;
  // 2. Single letter OCR slip: lowercase ("b 35") or doubled ("Cc 3.00", "cC", "CC")
  const doubled = /(?:^|\s)([A-I])\1\s+\d/i.exec(upper)?.[1];
  if (doubled) return doubled.toUpperCase();
  const lower = /(?:^|\s)([a-i])\s+\d/.exec(upper)?.[1];
  if (lower) return lower.toUpperCase();
  // 3. Any standalone class token
  return new RegExp(`(?:^|\\s)(${CLASS_TOKEN})(?:\\s|$)`).exec(upper)?.[1] ?? "";
}

export function parseKrsText(text: string): {
  detected_study_program?: string;
  courses: DetectedCourse[];
  issues: KrsIssue[];
} {
  const courses: DetectedCourse[] = [];
  const seen = new Set<string>();
  const programCount = new Map<string, number>();
  // Bookkeeping for the column warnings
  const sksByCourse: (number | null)[] = [];
  let hasStatus = false;
  let notApproved = 0;
  let lostRows = 0;
  let totalSks: number | null = null;
  let headerLine: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/[|]/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;

    // Header detection ignores spaces: OCR often merges words ("NAMAMK").
    const compactLine = line.toUpperCase().replace(/\s+/g, "");
    if (!headerLine && HEADER_COLUMNS.filter((h) => compactLine.includes(h.replace(/\s+/g, ""))).length >= 3) {
      headerLine = compactLine;
      continue;
    }
    const total = /TOTAL\s*SKS\D{0,5}(\d{1,3})\b/i.exec(line);
    if (total) {
      totalSks = Number(total[1]);
      continue;
    }

    if (/ditolak|menunggu|dibatalkan/i.test(line) && !/disetujui/i.test(line)) {
      notApproved++;
      continue;
    }
    const approved = /disetujui/i.test(line);

    let code = "";
    let before: string;
    let after: string;
    const m = CODE_RE.exec(line);
    const fixed = m ? (m[1].split("").map(toLetter).join("") + m[2].split("").map(toDigit).join("")).toUpperCase() : "";
    if (m && /^[A-Z]{3}\d{5}$/.test(fixed)) {
      code = fixed;
      before = line.slice(0, m.index).trim();
      after = line.slice(m.index + m[0].length).trim();
    } else {
      // Code unreadable: still keep the row, it will be matched by name + class + prodi.
      const r = ROW_RE.exec(line);
      const n = r ? null : ROW_NO_CODE_RE.exec(line);
      if (!r && !n) {
        // A table row ("Disetujui") we couldn't read: name wrapped to another line, blur, ...
        if (approved) lostRows++;
        continue;
      }
      before = (r ? r[1] : n![1]).trim();
      after = (r ? `${r[3]}${r[4]}` : `${n![2]}${n![3]}`).trim();
    }

    const program = PROGRAMS.find((p) => after.toLowerCase().includes(p.toLowerCase()));
    // Class is a single letter right before the SKS number (e.g. "A 3.00")
    const cls = extractClass(after);

    // Drop leading row-number noise from the name
    const name = before.replace(/^\d+[.)]?\s+/, "").trim() || code;
    if (!name) continue;

    const key = `${code || name.toLowerCase()}-${cls}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (program) programCount.set(program, (programCount.get(program) ?? 0) + 1);
    if (approved) hasStatus = true;
    // SKS "3.00"; OCR sometimes drops the dot ("200" = 2.00)
    const sks = /(?:^|\s)(\d)[.,]?(\d{2})(?:\s|$)/.exec(after);
    const credits = sks ? Number(`${sks[1]}.${sks[2]}`) : null;
    sksByCourse.push(credits);
    courses.push({ code, name, class: cls, study_program: program, confidence: program ? 0.9 : 0.7, credits });
  }

  const detected = [...programCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const issues = collectIssues({ courses, sksByCourse, hasStatus, notApproved, lostRows, totalSks, headerLine });
  return { detected_study_program: detected, courses, issues };
}

// Which columns can't be read, judged from the DATA (not the header text, which OCR may garble):
// a column counts as missing when no row has it. Missing columns are "blocking": the schedule is
// not shown at all, only the warning, because every match would be a guess.
// Non-blocking issues (lost rows, unapproved courses) are shown above the results.
function collectIssues(s: {
  courses: DetectedCourse[];
  sksByCourse: (number | null)[];
  hasStatus: boolean;
  notApproved: number;
  lostRows: number;
  totalSks: number | null;
  headerLine: string | null;
}): KrsIssue[] {
  const issues: KrsIssue[] = [];
  const { courses } = s;

  if (courses.length === 0) {
    if (s.lostRows > 0) {
      issues.push({ column: "BARIS", blocking: false, message: `${s.lostRows} baris tabel terdeteksi tapi isinya tidak bisa dibaca. Gunakan screenshot yang lebih jelas dan tidak diperkecil.` });
    }
    return issues;
  }

  const block = (column: KrsIssue["column"]) =>
    issues.push({ column, blocking: true, message: `Kolom ${column} tidak terbaca.` });
  if (courses.every((c) => !c.name || c.name === c.code)) block("NAMA MK");
  if (courses.every((c) => !c.code)) block("KODE MK");
  if (courses.every((c) => !c.study_program)) block("PROGRAM STUDI");
  if (courses.every((c) => !c.class)) block("KELAS");
  if (s.sksByCourse.every((x) => x === null)) block("SKS");
  if (!s.hasStatus && s.notApproved === 0) block("STATUS");
  if (issues.length > 0) return issues;

  if (s.totalSks !== null && s.sksByCourse.every((x) => x !== null)) {
    const sum = s.sksByCourse.reduce<number>((a, x) => a + (x ?? 0), 0);
    if (Math.abs(sum - s.totalSks) > 0.001) {
      issues.push({
        column: "BARIS",
        blocking: false,
        message: `Total SKS yang terbaca (${sum}) berbeda dengan TOTAL SKS di KRS (${s.totalSks}). Kemungkinan ada mata kuliah yang tidak terbaca; bandingkan hasil dengan KRS-mu.`,
      });
    }
  }
  if (s.notApproved > 0) {
    issues.push({ column: "STATUS", blocking: false, message: `${s.notApproved} mata kuliah belum disetujui (Ditolak/Menunggu/Dibatalkan) dan tidak dicari jadwalnya.` });
  }
  if (s.lostRows > 0 && !issues.some((i) => i.column === "BARIS")) {
    issues.push({
      column: "BARIS",
      blocking: false,
      message: `${s.lostRows} baris tabel tidak bisa dibaca. Kemungkinan nama mata kuliah terpotong ke baris berikutnya atau gambar buram.`,
    });
  }
  return issues;
}

// Upscale small screenshots, convert to grayscale, and invert dark-theme screenshots
// (light text on dark background is read very poorly by Tesseract).
async function preprocessImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  // Upscale narrow screenshots (max 3x), but keep the canvas under ~16M pixels:
  // larger canvases fail on iOS Safari and use a lot of memory.
  const MAX_PIXELS = 16_000_000;
  const scale = Math.min(
    bmp.width < 2400 ? Math.min(3, 2400 / bmp.width) : 1,
    Math.sqrt(MAX_PIXELS / (bmp.width * bmp.height))
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  const dark = sum / (px.length / 4) < 128;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const v = dark ? 255 - g : g;
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("CANVAS"))), "image/png"));
}

export async function extractCoursesFromImage(file: File) {
  const { recognize } = await import("tesseract.js");
  const image = await preprocessImage(file);
  const { data } = await recognize(image, "eng");
  return parseKrsText(data.text);
}
