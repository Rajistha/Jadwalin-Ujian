// Regression test: real OCR output (Tesseract, browser-scale preprocessing) of two KRS screenshots,
// including the misreads seen in practice (COMB60051, COMB0052, "Cc", "c").
//
// Run:  npm run dev   (in another terminal)
//       node --experimental-strip-types scripts/test-krs.mts [baseUrl]
import { parseKrsText } from "../lib/ocr.ts";

const BASE = process.argv[2] || "http://localhost:3000";

type Expect = { name: string; class: string; date: string; start: string; room: string };

const CASES: { title: string; ocr: string; expect: Expect[] }[] = [
  {
    title: "KRS tema gelap (Teknologi Informasi)",
    ocr: `Teknologi Berbasis Cloud CIT60036 Teknologi Informasi A 3.00 Disetujui Peseta Brome wv
Teknologi Blockchain dan Platform Keuangan Dijital CIT60042 Teknologi Informasi B 2.00 Disetujui Pesos Brome wv
information Retrieval CIT60048 Teknologi Informasi A 2.00 Disetujui Poecerta Brome wv
Forensik Dijital CIT60055 Teknologi Informasi A 2.00 Disetujui Peseta Brome wv
Teknologi Keamanan Siber CIT61024 Teknologi Informasi A 3.00 Disetujui Peseta Brose wv
Internet of Things CIT61026 Teknologi Informasi A 4.00 Disetujui Pesos Brome wv
Metodologi Penelitian dan Penulisan llmiah COMB60051 Teknologi Informasi A 3.00 Disetujui Peseta Brome wv
Etika Profesi COMB0052 Teknologi Informasi c 2.00 Disetujui Peseta Brome wv
Tata Kelola Teknologi Informasi CSD60703 Teknologi Informasi A 3.00 Disetujui Peseta Brome wv
TOTAL SKS 24`,
    expect: [
      { name: "Teknologi Berbasis Cloud", class: "A", date: "2026-12-07", start: "07:30", room: "G1.3" },
      { name: "Teknologi Blockchain dan Platform Keuangan Dijital", class: "B", date: "2026-12-02", start: "07:30", room: "F2.4" },
      { name: "Information Retrieval", class: "A", date: "2026-12-08", start: "10:00", room: "G1.6" },
      { name: "Forensik Dijital", class: "A", date: "2026-12-01", start: "07:30", room: "G1.3" },
      { name: "Teknologi Keamanan Siber", class: "A", date: "2026-12-10", start: "13:00", room: "F3.8" },
      { name: "Internet of Things", class: "A", date: "2026-12-07", start: "13:00", room: "F3.13" },
      { name: "Metodologi Penelitian dan Penulisan Ilmiah", class: "A", date: "2026-12-08", start: "13:00", room: "F3.10A" },
      { name: "Etika Profesi", class: "C", date: "2026-12-08", start: "07:30", room: "F2.4" },
      { name: "Tata Kelola Teknologi Informasi", class: "A", date: "2026-12-11", start: "09:30", room: "F3.14" },
    ],
  },
  {
    title: "KRS tema terang (Teknologi Informasi)",
    ocr: `NAMA MK KODE MK PROGRAM STUDI KELAS SKS STATUS
Kriptografi CIT60045 Teknologi Informasi A 3.00 Disetujui
Tata kelola dan Kebijakan Keamanan Siber CIT60047 Teknologi Informasi A 2.00 Disetujui
Information Retrieval CIT60048 Teknologi Informasi A 2.00 Disetujui
Teknologi Basis Data Non Relational CIT60049 Teknologi Informasi A 3.00 Disetujui
Pengembangan Aplikasi Web CIT61006 Teknologi Informasi B 4.00 Disetujui
Teknologi Keamanan Siber CIT61024 Teknologi Informasi Cc 3.00 Disetujui
Internet of Things CIT61026 Teknologi Informasi D 4.00 Disetujui
Metodologi Penelitian dan Penulisan llmiah COM60051 Teknologi Informasi B 3.00 Disetujui
TOTAL SKS 24`,
    expect: [
      { name: "Kriptografi", class: "A", date: "2026-12-02", start: "10:00", room: "F4.10" },
      { name: "Tata kelola dan Kebijakan Keamanan Siber", class: "A", date: "2026-12-11", start: "07:30", room: "G1.3" },
      { name: "Information Retrieval", class: "A", date: "2026-12-08", start: "10:00", room: "G1.6" },
      { name: "Teknologi Basis Data Non Relational", class: "A", date: "2026-12-01", start: "10:00", room: "G1.5" },
      { name: "Pengembangan Aplikasi Web", class: "B", date: "2026-11-30", start: "10:00", room: "G1.6" },
      { name: "Teknologi Keamanan Siber", class: "C", date: "2026-12-10", start: "13:00", room: "F3.13" },
      { name: "Internet of Things", class: "D", date: "2026-12-07", start: "13:00", room: "F3.14" },
      { name: "Metodologi Penelitian dan Penulisan Ilmiah", class: "B", date: "2026-12-08", start: "13:00", room: "F2.8" },
    ],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
let failures = 0;
const fail = (msg: string) => { failures++; console.log("  FAIL", msg); };

for (const c of CASES) {
  console.log(`\n# ${c.title}`);
  const parsed = parseKrsText(c.ocr);
  if (parsed.courses.length !== c.expect.length) fail(`parse: ${parsed.courses.length} matkul, harusnya ${c.expect.length}`);

  const res = await fetch(`${BASE}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courses: parsed.courses, study_program: parsed.detected_study_program }),
  });
  const data = await res.json();
  if (data.unmatched.length) fail(`unmatched: ${data.unmatched.map((u: { name: string; class: string }) => `${u.name} (${u.class || "?"})`).join(", ")}`);

  for (const e of c.expect) {
    // Compare against the schedule's own course name (OCR names may contain typos like "llmiah")
    const got = data.matched.find((m: { course?: { name: string } }) => norm(m.course?.name ?? "") === norm(e.name));
    if (!got) { fail(`${e.name}: tidak ada di hasil`); continue; }
    const ok = got.class_name === e.class && got.exam_date === e.date && got.start_time === e.start &&
      got.room === e.room && got.course?.study_program === "Teknologi Informasi";
    if (ok) console.log(`  ok   ${e.name} kelas ${e.class} | ${e.date} ${e.start} ${e.room}`);
    else fail(`${e.name}: dapat kelas ${got.class_name} ${got.exam_date} ${got.start_time} ${got.room} ${got.course?.study_program}, harusnya kelas ${e.class} ${e.date} ${e.start} ${e.room}`);
  }
}

// Parser edge cases found in code review.
console.log("\n# Parser: kode rusak, nama berisi nama prodi, baris biodata");
{
  const p = parseKrsText(`Mahasiswa Program Studi: Teknologi Informasi IPK 3.75
Program Studi Teknologi Informasi Semester 5 SKS 24.00
Tata Kelola Teknologi Informasi CSD6O7O3X Teknologi Informasi A 3.00 Disetujui
Pengantar Sistem Informasi CS!6100Z Sistem Informasi B 3.00 Disetujui`);
  const got = p.courses.map((c) => `${c.name}|${c.class}|${c.study_program}`);
  const want = ["Tata Kelola Teknologi Informasi|A|Teknologi Informasi", "Pengantar Sistem Informasi|B|Sistem Informasi"];
  if (JSON.stringify(got) === JSON.stringify(want)) console.log("  ok   " + got.join(" ; "));
  else fail(`dapat ${JSON.stringify(got)}, harusnya ${JSON.stringify(want)}`);
}

// Full-screen screenshot: SIAM's side menu text lands in front of the row, and small fonts turn 6 into "e".
console.log("\n# Screenshot layar penuh (menu samping + angka 6 jadi e)");
{
  const ocr = `NAMA MK KODE MK PROGRAM STUDI KELAS SKS STATUS ACTIONS
KRS Kriptografi CIT60045 Teknologi Informasi A 3.00 Disetujui Peserta Brone
KHS Tata kelola dan Kebijakan Keamanan Siber CIT60047 Teknologi Informasi A 2.00 Disetujui Peserta
Jadwal Kuliah Information Retrieval CITe0048 Teknologi Informasi A 2.00 Disetujui Peserta
Jadwal Ujian Teknologi Basis Data Non Relational CIT60049 Teknologi Informasi A 3.00 Disetujui
Rekap Kehadiran Pengembangan Aplikasi Web CIT61006 Teknologi Informasi B 4.00 Disetujui
Presensi Kuliah Teknologi Keamanan Siber CIT61024 Teknologi Informasi C 3.00 Disetujui
Tugas Akhir Internet of Things CIT61026 Teknologi Informasi D 4.00 Disetujui
Rekap Kehadiran Metodologi Penelitian dan Penulisan Ilmiah COM60051 Teknologi Informasi B 3.00 Disetujui
TOTAL SKS 24`;
  const p = parseKrsText(ocr);
  const bad = p.courses.filter((c) => !c.code).map((c) => c.name);
  if (bad.length) fail(`kode tidak terbaca: ${bad.join(", ")}`);
  if (p.issues.length) fail(`peringatan palsu: ${JSON.stringify(p.issues)}`);
  const res = await fetch(`${BASE}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courses: p.courses, study_program: p.detected_study_program }),
  });
  const data = await res.json();
  const want: [string, string][] = [
    ["Kriptografi", "A"], ["Tata kelola dan Kebijakan Keamanan Siber", "A"], ["Information Retrieval", "A"],
    ["Teknologi Basis Data Non Relational", "A"], ["Pengembangan Aplikasi Web", "B"], ["Teknologi Keamanan Siber", "C"],
    ["Internet of Things", "D"], ["Metodologi Penelitian dan Penulisan Ilmiah", "B"],
  ];
  if (data.unmatched.length) fail(`unmatched: ${data.unmatched.map((u: { name: string }) => u.name).join(" | ")}`);
  for (const [n, c] of want) {
    const got = data.matched.find((m: { course?: { name: string }; class_name: string }) => m.course?.name === n && m.class_name === c);
    if (got) console.log(`  ok   ${n} kelas ${c}`);
    else fail(`${n} kelas ${c} tidak ketemu`);
  }
  // A longer real course name must not be cut down to a shorter one.
  const lanjut = await (await fetch(`${BASE}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ study_program: "Teknologi Informasi", courses: [{ code: "", name: "Pengembangan Aplikasi Web Lanjut", class: "A", confidence: 0.9 }] }),
  })).json();
  const got = lanjut.matched[0]?.course?.name;
  if (got === "Pengembangan Aplikasi Web Lanjut") console.log("  ok   nama panjang tidak dipotong: " + got);
  else fail(`Pengembangan Aplikasi Web Lanjut -> ${got}`);
}

// Column warnings: none for a clean KRS, the right one for each kind of damage.
console.log("\n# Peringatan kolom");
{
  const light = CASES[1].ocr;
  // "!" = blocking (a whole column is unreadable: only the warning is shown, no schedule)
  const cols = (t: string) => parseKrsText(t).issues.map((i) => (i.blocking ? "!" : "") + i.column).sort().join(",");
  const checks: [string, string, string][] = [
    ["KRS gelap normal", CASES[0].ocr, ""],
    ["KRS terang normal", light, ""],
    ["kolom KELAS terpotong", `NAMA MK KODE MK PROGRAM STUDI SKS STATUS
Kriptografi CIT60045 Teknologi Informasi 3.00 Disetujui
Information Retrieval CIT60048 Teknologi Informasi 2.00 Disetujui`, "!KELAS"],
    ["satu baris hilang (TOTAL SKS beda)", light.replace(/^Kriptografi.*\n/m, ""), "BARIS"],
    ["baris tabel tidak terbaca", light.replace(/^Kriptografi.*$/m, "Kr!pt0 ### ~~ Disetujui"), "BARIS"],
    ["kolom PROGRAM STUDI tidak terbaca", `Kriptografi CIT60045 A 3.00 Disetujui
Information Retrieval CIT60048 A 2.00 Disetujui`, "!PROGRAM STUDI"],
    ["kode di satu baris rusak total (tetap cocok lewat nama, tanpa peringatan)", light.replace("CIT60047", "C?T6@047"), ""],
    ["seluruh kolom KODE MK hilang", `Kriptografi Teknologi Informasi A 3.00 Disetujui
Information Retrieval Teknologi Informasi A 2.00 Disetujui`, "!KODE MK"],
    // exactly what a screenshot with the NAMA MK column cut off looks like
    ["kolom NAMA MK terpotong", `CIT60045 Teknologi Informasi A 3.00 Disetujui
CIT60047 Teknologi Informasi A 2.00 Disetujui
CIT60048 Teknologi Informasi A 2.00 Disetujui`, "!NAMA MK"],
    ["kolom STATUS terpotong", `Kriptografi CIT60045 Teknologi Informasi A 3.00
Information Retrieval CIT60048 Teknologi Informasi A 2.00`, "!STATUS"],
    ["kolom SKS terpotong", `Kriptografi CIT60045 Teknologi Informasi A Disetujui
Information Retrieval CIT60048 Teknologi Informasi A Disetujui`, "!SKS"],
    ["matkul belum disetujui", light.replace(/(Kriptografi.*)Disetujui/, "$1Ditolak").replace("TOTAL SKS 24", "TOTAL SKS 21"), "STATUS"],
    ["tanpa kolom SKS & STATUS", `NAMA MK KODE MK PROGRAM STUDI KELAS
Kriptografi CIT60045 Teknologi Informasi A
Information Retrieval CIT60048 Teknologi Informasi C`, "!SKS,!STATUS"],
  ];
  for (const [label, text, want] of checks) {
    const got = cols(text);
    if (got === want) console.log(`  ok   ${label}: ${want || "tanpa peringatan"}`);
    else fail(`${label}: dapat [${got}], harusnya [${want}] -> ${JSON.stringify(parseKrsText(text).issues)}`);
  }
}

// "Perbaiki kelas": every matched row carries its index and the classes that exist for it, and a
// misread class (C read as E) is corrected by re-sending that one course with the right class.
console.log("\n# Perbaiki kelas (C terbaca E)");
{
  const post = async (cls: string) =>
    (await (await fetch(`${BASE}/api/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        study_program: "Teknologi Informasi",
        courses: [
          { code: "CIT61024", name: "Teknologi Keamanan Siber", class: cls, confidence: 0.9 },
          { code: "CIT61026", name: "Internet of Things", class: "D", confidence: 0.9 },
        ],
      }),
    })).json());
  const wrong = await post("E");
  const w = wrong.matched.find((m: { index: number }) => m.index === 0);
  if (w?.class_name === "E" && w.room === "F4.2" && w.available_classes?.join(",") === "A,B,C,D,E") console.log("  ok   salah baca E: tampil E/F4.2, pilihan kelas A,B,C,D,E tersedia");
  else fail(`respons kelas E tidak sesuai: ${JSON.stringify(w && { c: w.class_name, r: w.room, a: w.available_classes })}`);
  const fixed = await post("C");
  const f = fixed.matched.find((m: { index: number }) => m.index === 0);
  if (f?.class_name === "C" && f.room === "F3.13" && f.exam_date === "2026-12-10") console.log("  ok   setelah dikoreksi ke C: F3.13, 2026-12-10");
  else fail(`respons kelas C tidak sesuai: ${JSON.stringify(f && { c: f.class_name, r: f.room, d: f.exam_date })}`);
  const other = fixed.matched.find((m: { index: number }) => m.index === 1);
  if (other?.class_name === "D") console.log("  ok   matkul lain tidak ikut berubah");
  else fail("matkul lain ikut berubah");
}

// Unreadable class must never be guessed, and must offer the real classes to choose from.
console.log("\n# Kelas tidak terbaca");
{
  const res = await fetch(`${BASE}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      study_program: "Teknologi Informasi",
      courses: [{ code: "CIT61024", name: "Teknologi Keamanan Siber", class: "", confidence: 0.9 }],
    }),
  });
  const data = await res.json();
  if (data.matched.length) fail(`kelas kosong malah dicocokkan ke kelas ${data.matched[0].class_name}`);
  const avail = data.unmatched[0]?.available_classes?.join(",");
  if (avail === "A,B,C,D,E") console.log("  ok   tidak ditebak, pilihan kelas: " + avail);
  else fail(`pilihan kelas: ${avail}, harusnya A,B,C,D,E`);
}

// Every S1 schedule row must be findable from a KRS line, also with typical OCR noise in the name
// and with a code that is one digit away from a known code (must not hijack the match).
console.log("\n# Semua nama matkul S1 di jadwal");
{
  const { readFileSync } = await import("node:fs");
  const csvPath = new URL("../lib/raw_jadwal.csv", import.meta.url);
  const rows = readFileSync(csvPath, "utf8").split(/\r?\n/).filter((l) => /^2026-.*,S1 /.test(l)).map((l) => l.split(","));
  const variants: Record<string, { name: (s: string) => string; code: (k: number) => string }> = {
    bersih: { name: (s) => s, code: (k) => `ZZZ${90000 + k}` },
    "huruf awal kecil": { name: (s) => s[0].toLowerCase() + s.slice(1), code: (k) => `ZZZ${90000 + k}` },
    "I jadi l": { name: (s) => s.replace(/I/g, "l"), code: (k) => `ZZZ${90000 + k}` },
    "1 huruf hilang": { name: (s) => (s.length > 8 ? s.slice(0, 5) + s.slice(6) : s), code: (k) => `ZZZ${90000 + k}` },
    // CSD60700..CSD60739: distinct per row, many one digit away from the known CSD60703
    "kode tetangga kode lain": { name: (s) => s, code: (k) => `CSD60${700 + k}` },
    // Side menu of a full-screen SIAM screenshot in front of the name
    "menu samping": {
      name: (s) => `${["Presensi Kuliah", "Rekap Kehadiran", "Jadwal Ujian", "KRS", "Rekap Hasil Studi"][s.length % 5]} ${s}`,
      code: (k) => `ZZZ${90000 + k}`,
    },
  };
  const byProg = new Map<string, string[][]>();
  for (const r of rows) {
    const p = r[2].replace(/^S1 /, "");
    if (!byProg.has(p)) byProg.set(p, []);
    byProg.get(p)!.push(r);
  }
  let total = 0;
  const bad: string[] = [];
  for (const [vname, v] of Object.entries(variants)) {
    for (const [prog, rs] of byProg) {
      for (let i = 0; i < rs.length; i += 40) {
        const chunk = rs.slice(i, i + 40);
        const parsed = parseKrsText(chunk.map((r, k) => `${v.name(r[3])} ${v.code(k)} ${prog} ${r[4]} 3.00 Disetujui`).join("\n"));
        const res = await fetch(`${BASE}/api/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courses: parsed.courses, study_program: prog }),
        });
        const data = await res.json();
        for (const r of chunk) {
          total++;
          const ok = data.matched.some(
            (m: { course?: { name: string; study_program?: string }; class_name: string; exam_date: string; room: string }) =>
              m.course?.name === r[3] && m.class_name === r[4] && m.exam_date === r[0] && m.room === r[6] && m.course?.study_program === prog
          );
          if (!ok) bad.push(`[${vname}] ${prog} | ${r[3]} kelas ${r[4]}`);
        }
      }
    }
  }
  if (bad.length) fail(`${bad.length}/${total} baris tidak cocok:\n    ${bad.slice(0, 30).join("\n    ")}`);
  else console.log(`  ok   ${total}/${total} baris (${rows.length} jadwal x ${Object.keys(variants).length} varian)`);
}

console.log(failures ? `\n${failures} GAGAL` : "\nSEMUA LULUS");
process.exitCode = failures ? 1 : 0;
