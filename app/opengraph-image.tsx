import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "JadwalinUjian - Upload KRS, jadwal ujian langsung ketemu.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROWS = [
  { d: "Sen", n: "30 Nov", t: "10:00", m: "Pengembangan Aplikasi Web", k: "B", r: "G1.6" },
  { d: "Sel", n: "1 Des", t: "10:00", m: "Teknologi Basis Data Non Relasional", k: "A", r: "G1.5" },
  { d: "Rab", n: "2 Des", t: "10:00", m: "Kriptografi", k: "A", r: "F4.10" },
  { d: "Sen", n: "7 Des", t: "13:00", m: "Internet of Things", k: "D", r: "F3.14" },
  { d: "Sel", n: "8 Des", t: "10:00", m: "Information Retrieval", k: "A", r: "G1.6" },
];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 72px",
          gap: 56,
          backgroundColor: "#F8FAFC",
          fontFamily: "sans-serif",
          color: "#0F172A",
        }}
      >
        {/* Left: name + tagline */}
        <div style={{ display: "flex", flexDirection: "column", width: 440 }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#2563EB", letterSpacing: 3 }}>
            FILKOM UB
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 68, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05 }}>
            <span>Jadwalin</span>
            <span style={{ color: "#2563EB" }}>Ujian</span>
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: "#475569", lineHeight: 1.35 }}>
            Upload KRS, jadwal ujian langsung ketemu.
          </div>
        </div>

        {/* Right: table preview, same look as the site */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            backgroundColor: "#FFFFFF",
            border: "2px solid #E2E8F0",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "14px 24px",
              backgroundColor: "#F8FAFC",
              borderBottom: "2px solid #E2E8F0",
              fontSize: 14,
              fontWeight: 700,
              color: "#64748B",
              letterSpacing: 1.5,
            }}
          >
            <div style={{ display: "flex", width: 120 }}>TANGGAL</div>
            <div style={{ display: "flex", width: 80 }}>JAM</div>
            <div style={{ display: "flex", flex: 1 }}>MATA KULIAH</div>
            <div style={{ display: "flex", width: 80, justifyContent: "flex-end" }}>RUANG</div>
          </div>

          {ROWS.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 24px",
                borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                fontSize: 20,
              }}
            >
              <div style={{ display: "flex", width: 120, fontWeight: 700 }}>
                {r.d}, {r.n}
              </div>
              <div style={{ display: "flex", width: 80, color: "#475569" }}>{r.t}</div>
              <div style={{ display: "flex", flex: 1, fontWeight: 700, paddingRight: 12 }}>{r.m}</div>
              <div style={{ display: "flex", width: 80, justifyContent: "flex-end", fontWeight: 700 }}>{r.r}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
