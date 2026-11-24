import type { DetectedCourse } from "./types";

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
const toDigit = (c: string) => ({ O: "0", o: "0", I: "1", l: "1", S: "5", B: "8" } as Record<string, string>)[c] ?? c;

const CODE_RE = /\b([A-Z0-9]{3})([0-9OoIlSB]{5})\b/;

export function parseKrsText(text: string): { detected_study_program?: string; courses: DetectedCourse[] } {
  const courses: DetectedCourse[] = [];
  const seen = new Set<string>();
  const programCount = new Map<string, number>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/[|]/g, " ").replace(/\s+/g, " ").trim();
    const m = CODE_RE.exec(line);
    if (!m) continue;

    const code = (m[1].split("").map(toLetter).join("") + m[2].split("").map(toDigit).join("")).toUpperCase();
    if (!/^[A-Z]{3}\d{5}$/.test(code)) continue;
    if (/ditolak|menunggu|dibatalkan/i.test(line) && !/disetujui/i.test(line)) continue;

    const before = line.slice(0, m.index).trim();
    const after = line.slice(m.index + m[0].length).trim();

    const program = PROGRAMS.find((p) => after.toLowerCase().includes(p.toLowerCase()));
    // Class is a single letter right before the SKS number (e.g. "A 3.00")
    const cls = /(?:^|\s)([A-Z])\s+\d+[.,]\d{2}\b/.exec(after)?.[1] ?? /\s([A-Z])(?:\s|$)/.exec(after)?.[1] ?? "A";

    // Drop leading row-number noise from the name
    const name = before.replace(/^\d+[.)]?\s+/, "").trim() || code;

    const key = `${code}-${cls}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (program) programCount.set(program, (programCount.get(program) ?? 0) + 1);
    courses.push({ code, name, class: cls, study_program: program, confidence: program ? 0.9 : 0.7 });
  }

  const detected = [...programCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { detected_study_program: detected, courses };
}

async function upscaleIfSmall(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = bmp.width < 1800 ? Math.min(3, 1800 / bmp.width) : 1;
  if (scale <= 1) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("CANVAS"))), "image/png"));
}

export async function extractCoursesFromImage(file: File) {
  const { recognize } = await import("tesseract.js");
  const image = await upscaleIfSmall(file);
  const { data } = await recognize(image, "eng");
  return parseKrsText(data.text);
}
