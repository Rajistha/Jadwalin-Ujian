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
const toDigit = (c: string) => ({ O: "0", o: "0", I: "1", l: "1", "!": "1", "|": "1", S: "5", B: "8", G: "6" } as Record<string, string>)[c] ?? c;

// Digits part may contain look-alike chars; trailing "!" is a common misread "1".
// Ambiguous ones (e.g. B for 6 or 8) are corrected against known codes in /api/match.
const CODE_RE = /\b([A-Z0-9]{3})([0-9OoIlSBG!]{5})(?=\s|$)/;

// Class names in the schedule: A..H, INT, and multi-char like N1A / N7W.
const CLASS_TOKEN = "(?:INT|N\\d[A-Z0-9]|[A-Z])";

// Returns "" when the class can't be read, so the matcher doesn't silently assume "A".
function extractClass(after: string): string {
  const upper = after.replace(/[|]/g, " ");
  // 1. Class token right before a number (SKS / capacity), e.g. "B 40 4" or "N1A 3,00"
  const beforeNumber = new RegExp(`(?:^|\\s)(${CLASS_TOKEN})\\s+\\d`).exec(upper)?.[1];
  if (beforeNumber) return beforeNumber;
  // 2. Lowercase single letter OCR slip right before a number, e.g. "b 35"
  const lower = /(?:^|\s)([a-h])\s+\d/.exec(upper)?.[1];
  if (lower) return lower.toUpperCase();
  // 3. Any standalone class token
  return new RegExp(`(?:^|\\s)(${CLASS_TOKEN})(?:\\s|$)`).exec(upper)?.[1] ?? "";
}

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
    const cls = extractClass(after);

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

// Upscale small screenshots, convert to grayscale, and invert dark-theme screenshots
// (light text on dark background is read very poorly by Tesseract).
async function preprocessImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = bmp.width < 2400 ? Math.min(3, 2400 / bmp.width) : 1;
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
