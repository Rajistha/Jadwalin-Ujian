import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export const alt = "JadwalinUjian - Upload KRS, jadwal ujian langsung ketemu.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette mirrors the site (Tailwind slate + blue-600)
const BLUE = "#2563EB";
const INK = "#0F172A"; // slate-900
const MUTED = "#64748B"; // slate-500
const FAINT = "#94A3B8"; // slate-400
const LINE = "#E2E8F0"; // slate-200
const SOFT = "#F1F5F9"; // slate-100
const BG = "#F8FAFC"; // slate-50

const ROWS = [
  { d: "Senin, 30 Nov 2026", t: "10:00 – 11:40", m: "Pengembangan Aplikasi Web", k: "B", r: "G1.6" },
  { d: "Selasa, 1 Des 2026", t: "10:00 – 11:40", m: "Basis Data Non Relasional", k: "A", r: "G1.5" },
  { d: "Rabu, 2 Des 2026", t: "10:00 – 11:40", m: "Kriptografi", k: "A", r: "F4.10" },
  { d: "Senin, 7 Des 2026", t: "13:00 – 14:40", m: "Internet of Things", k: "D", r: "F3.14" },
  { d: "Selasa, 8 Des 2026", t: "10:00 – 11:40", m: "Information Retrieval", k: "A", r: "G1.6" },
];

async function font(weight: number) {
  return readFile(join(process.cwd(), "app", "fonts", `inter-${weight}.woff`));
}

export default async function Image() {
  const [w500, w700, w800] = await Promise.all([font(500), font(700), font(800)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: BG,
          fontFamily: "Inter",
          color: INK,
        }}
      >
        {/* Left */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 580,
            padding: "0 0 0 64px",
          }}
        >
          {/* Logo, same as the site header */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: 11,
                backgroundColor: BLUE,
                boxShadow: "0 1px 2px rgba(15,23,42,0.15)",
              }}
            >
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                <path d="M22 10v6" />
                <path d="M6 12.5V16a6 6 0 0 0 12 0v-3.5" />
              </svg>
            </div>
            <div style={{ display: "flex", marginLeft: 14, fontSize: 30, letterSpacing: -0.6 }}>
              <span style={{ fontWeight: 700 }}>Jadwalin</span>
              <span style={{ fontWeight: 800, color: BLUE, marginLeft: 2 }}>Ujian</span>
            </div>
          </div>

          {/* Pill badge, same as the site hero */}
          <div style={{ display: "flex", marginTop: 40 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px 8px 12px",
                borderRadius: 999,
                backgroundColor: "#EFF6FF",
                border: "1px solid #BFDBFE",
                color: "#1D4ED8",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={BLUE}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span style={{ marginLeft: 8 }}>UAS FILKOM Ganjil 2026/2027</span>
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 22,
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: -2.3,
              lineHeight: 1.08,
            }}
          >
            <div style={{ display: "flex" }}>Upload KRS,</div>
            <div style={{ display: "flex", color: BLUE }}>jadwal ujian</div>
            <div style={{ display: "flex" }}>langsung ketemu.</div>
          </div>
        </div>

        {/* Right: the real schedule card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            padding: "0 48px 0 0",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              backgroundColor: "#FFFFFF",
              border: `1px solid ${LINE}`,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 1px 2px rgba(15,23,42,0.06), 0 18px 40px rgba(15,23,42,0.08)",
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "18px 22px",
                borderBottom: `1px solid ${LINE}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
                Jadwal Ujian Akhir Semester (UAS)
              </div>
              <div style={{ display: "flex", marginTop: 3, fontSize: 14, fontWeight: 500, color: MUTED }}>
                Fakultas Ilmu Komputer Universitas Brawijaya
              </div>
            </div>

            {/* Table head */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "11px 22px",
                backgroundColor: BG,
                borderBottom: `1px solid ${LINE}`,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.2,
                color: "#475569",
              }}
            >
              <div style={{ display: "flex", width: 160 }}>HARI & TANGGAL</div>
              <div style={{ display: "flex", flex: 1 }}>MATA KULIAH</div>
              <div style={{ display: "flex", width: 52, justifyContent: "center" }}>KELAS</div>
              <div style={{ display: "flex", width: 62, justifyContent: "flex-end" }}>RUANG</div>
            </div>

            {/* Rows */}
            {ROWS.map((r, i) => (
              <div
                key={r.m}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "13px 22px",
                  borderTop: i === 0 ? "none" : `1px solid ${SOFT}`,
                  backgroundColor: i % 2 === 1 ? "rgba(248,250,252,0.6)" : "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", width: 160 }}>
                  <div style={{ display: "flex", fontSize: 14.5, fontWeight: 700 }}>{r.d.replace(" 2026", "")}</div>
                  <div style={{ display: "flex", marginTop: 3, fontSize: 13, fontWeight: 500, color: MUTED }}>{r.t}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 8 }}>
                  <div style={{ display: "flex", fontSize: 15.5, fontWeight: 700, letterSpacing: -0.2 }}>{r.m}</div>
                  <div style={{ display: "flex", marginTop: 3, fontSize: 12.5, fontWeight: 500, color: FAINT }}>
                    Teknologi Informasi
                  </div>
                </div>

                <div style={{ display: "flex", width: 52, justifyContent: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      padding: "2px 9px",
                      borderRadius: 5,
                      backgroundColor: SOFT,
                      border: `1px solid ${LINE}`,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {r.k}
                  </div>
                </div>

                <div style={{ display: "flex", width: 62, justifyContent: "flex-end", fontSize: 15, fontWeight: 700 }}>
                  {r.r}
                </div>
              </div>
            ))}

            {/* Card footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 22px",
                backgroundColor: "rgba(248,250,252,0.8)",
                borderTop: `1px solid ${LINE}`,
                fontSize: 12.5,
                fontWeight: 500,
                color: FAINT,
              }}
            >
              <div style={{ display: "flex" }}>Total: 5 Matkul</div>
              <div style={{ display: "flex" }}>FILKOM UB · 2026/2027</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: w500, weight: 500, style: "normal" },
        { name: "Inter", data: w700, weight: 700, style: "normal" },
        { name: "Inter", data: w800, weight: 800, style: "normal" },
      ],
    }
  );
}
