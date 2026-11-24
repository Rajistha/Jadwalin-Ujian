"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle, Download, FileText,
  Info, ChevronDown, Sun, Moon, Image as ImageIcon
} from "lucide-react";
import { cn, formatDate, resolveCredits } from "@/lib/utils";
import type { MatchedSchedule, SortKey, SortDir } from "@/lib/types";

interface ScheduleTableProps {
  schedules: MatchedSchedule[];
  onExportPng: () => void;
  onExportPdf: () => void;
  exportRef: React.RefObject<HTMLDivElement | null>;
}

export default function ScheduleTable({
  schedules,
  onExportPng,
  onExportPdf,
  exportRef,
}: ScheduleTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("exam_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [exportingWallpaper, setExportingWallpaper] = useState<"light" | "dark" | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const lightWallpaperRef = useRef<HTMLDivElement>(null);
  const darkWallpaperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const enrichedSchedules = useMemo(() => {
    return schedules.map((s) => {
      return { ...s, resolvedCredits: resolveCredits(s) };
    });
  }, [schedules]);

  const sorted = useMemo(() => {
    return [...enrichedSchedules].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "exam_date") {
        cmp = a.exam_date.localeCompare(b.exam_date) || a.start_time.localeCompare(b.start_time);
      } else if (sortKey === "start_time") {
        cmp = a.start_time.localeCompare(b.start_time);
      } else if (sortKey === "course_name") {
        cmp = (a.course?.name || a.detected_name || "").localeCompare(b.course?.name || b.detected_name || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [enrichedSchedules, sortKey, sortDir]);

  const totalCredits = useMemo(() => {
    return enrichedSchedules.reduce((acc, s) => acc + s.resolvedCredits, 0);
  }, [enrichedSchedules]);

  const hasConflict = schedules.some((s) => s.conflict);

  const handleExportWallpaper = useCallback((theme: "light" | "dark") => {
    setExportingWallpaper(theme);
  }, []);

  // Generate and download wallpaper only when requested, then unmount immediately
  useEffect(() => {
    if (!exportingWallpaper) return;
    const target = exportingWallpaper === "dark" ? darkWallpaperRef.current : lightWallpaperRef.current;
    if (!target) return;

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const dataUrl = await toPng(target, {
          width: 420,
          height: 910,
          pixelRatio: 2.5,
          backgroundColor: exportingWallpaper === "dark" ? "#0E1B30" : "#CFE6FA",
        });
        if (!active) return;
        const link = document.createElement("a");
        link.download = `Wallpaper-Ujian-FILKOM-${exportingWallpaper === "dark" ? "Dark" : "Light"}-${format(new Date(), "yyyyMMdd-HHmm")}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Gagal membuat wallpaper:", err);
        alert("Gagal membuat wallpaper. Coba lagi.");
      } finally {
        if (active) setExportingWallpaper(null);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [exportingWallpaper]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Conflict banner */}
      {hasConflict && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-xs sm:text-sm font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>Perhatian: Ada jadwal ujian yang bentrok pada jam yang sama! Periksa baris bertanda merah.</span>
        </div>
      )}

      {/* Main Schedule Card (Export Target) */}
      <div
        ref={exportRef}
        className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
      >
        {/* Clean Header with Download Options */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Jadwal Ujian Akhir Semester (UAS)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fakultas Ilmu Komputer Universitas Brawijaya · Semester Ganjil 2026/2027
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs text-slate-500 font-medium mr-1">
              Total: <strong className="text-slate-800">{sorted.length} Matkul</strong> ({totalCredits} SKS)
            </span>

            {/* Dropdown Menu for Unduh PNG */}
            <div className="relative" ref={dropdownRef} data-export-ignore>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-98"
                title="Pilihan unduh PNG dan Wallpaper"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh PNG</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-150", isDropdownOpen && "rotate-180")} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onExportPng();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">Unduh PNG (Tabel)</span>
                      <span className="text-[10px] text-slate-400">Tampilan tabel horizontal</span>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleExportWallpaper("light");
                    }}
                    disabled={exportingWallpaper !== null}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {exportingWallpaper === "light" ? "Memproses..." : "Unduh Wallpaper Light"}
                      </span>
                      <span className="text-[10px] text-slate-400">Format 9:16 layar kunci HP</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleExportWallpaper("dark");
                    }}
                    disabled={exportingWallpaper !== null}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Moon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {exportingWallpaper === "dark" ? "Memproses..." : "Unduh Wallpaper Dark"}
                      </span>
                      <span className="text-[10px] text-slate-400">Format 9:16 mode gelap</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Download PDF */}
            <button
              type="button"
              data-export-ignore
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-98"
              title="Download dokumen PDF"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>

        {/* Clean Data Table (border-separate prevents random thick collapsed lines) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12 text-slate-400 border-b border-slate-200">No</th>
                <th
                  onClick={() => handleSort("exam_date")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none transition border-b border-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Hari & Tanggal</span>
                    {sortKey === "exam_date" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("start_time")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none transition border-b border-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Waktu</span>
                    {sortKey === "start_time" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("course_name")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none transition border-b border-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Mata Kuliah</span>
                    {sortKey === "course_name" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center border-b border-slate-200">Kelas</th>
                <th className="py-3 px-4 border-b border-slate-200">Ruang</th>
                <th className="py-3 px-3 text-center border-b border-slate-200">SKS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, index) => {
                const isConflict = s.conflict;
                const isLast = index === sorted.length - 1;

                return (
                  <tr
                    key={s.id || index}
                    style={{ animationDelay: `${250 + Math.min(index, 12) * 60}ms` }}
                    className={cn(
                      "fade-in-row hover:bg-slate-50/70 transition-colors",
                      isConflict ? "bg-red-50/70 hover:bg-red-50" : index % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                    )}
                  >
                    {/* No */}
                    <td className={cn("py-3.5 px-3 text-center font-mono text-slate-400", !isLast && "border-b border-slate-100")}>
                      {index + 1}
                    </td>

                    {/* Hari & Tanggal */}
                    <td className={cn("py-3.5 px-4 whitespace-nowrap", !isLast && "border-b border-slate-100")}>
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {s.day_name}, {formatDate(s.exam_date)}
                      </span>
                    </td>

                    {/* Waktu */}
                    <td className={cn("py-3.5 px-4 whitespace-nowrap text-slate-800 text-xs sm:text-sm font-medium", !isLast && "border-b border-slate-100")}>
                      <span>{s.start_time}{s.end_time ? ` – ${s.end_time}` : ""}</span>
                      {isConflict && (
                        <span className="ml-2 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          Bentrok
                        </span>
                      )}
                    </td>

                    {/* Mata Kuliah */}
                    <td className={cn("py-3.5 px-4", !isLast && "border-b border-slate-100")}>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                        {s.course?.name || s.detected_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>{s.course?.code || s.detected_code}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span className="font-sans">{s.course?.study_program || s.detected_study_program || "Teknologi Informasi"}</span>
                      </div>
                    </td>

                    {/* Kelas */}
                    <td className={cn("py-3.5 px-3 text-center", !isLast && "border-b border-slate-100")}>
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200/80">
                        {s.class_name || s.detected_class}
                      </span>
                    </td>

                    {/* Ruang */}
                    <td className={cn("py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 text-xs sm:text-sm", !isLast && "border-b border-slate-100")}>
                      {s.room || "—"}
                    </td>

                    {/* SKS */}
                    <td className={cn("py-3.5 px-3 text-center font-medium text-slate-600 text-xs", !isLast && "border-b border-slate-100")}>
                      {s.resolvedCredits ? `${s.resolvedCredits}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Simple and subtle note as requested */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Cek kembali jadwal di pengumuman resmi SIAM UB atau fakultas.</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            FILKOM UB · 2026/2027
          </div>
        </div>
      </div>

      {/* OFF-SCREEN WALLPAPERS (9:16 lockscreen). Mounted only during export, then unmounted. */}
      {exportingWallpaper && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            width: "420px",
            height: "910px",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <WallpaperTable
            theme={exportingWallpaper}
            rows={sorted}
            totalCredits={totalCredits}
            targetRef={exportingWallpaper === "dark" ? darkWallpaperRef : lightWallpaperRef}
          />
        </div>
      )}
    </div>
  );
}

const WALLPAPER_THEMES = {
  // Light: pale sky with soft white clouds
  light: {
    bg: "#CFE6FA",
    bgImage:
      "radial-gradient(260px 120px at 18% 9%, rgba(255,255,255,0.95), transparent 70%), radial-gradient(200px 90px at 38% 13%, rgba(255,255,255,0.8), transparent 70%), radial-gradient(300px 130px at 88% 24%, rgba(255,255,255,0.9), transparent 70%), radial-gradient(240px 110px at 6% 78%, rgba(255,255,255,0.85), transparent 70%), radial-gradient(320px 140px at 82% 93%, rgba(255,255,255,0.95), transparent 70%), linear-gradient(180deg, #A9D3F5 0%, #CBE5FA 38%, #E4F1FC 72%, #F3F9FE 100%)",
    text: "#0F2A43",
    eyebrow: "text-sky-700",
    title: "text-slate-900",
    sub: "text-slate-600",
    panel: "bg-white/85 border border-white shadow-[0_10px_34px_rgba(56,120,185,0.18)]",
    head: "bg-sky-50/80 text-slate-500 border-b border-sky-100",
    rowBorder: "border-sky-100/80",
    zebra: "bg-sky-50/50",
    strong: "text-slate-900",
    muted: "text-slate-500",
    faint: "text-slate-400",
    cls: "bg-sky-100 text-sky-900 border border-sky-200",
    conflict: "bg-red-50",
    foot: "text-slate-500",
  },
  // Dark: night sky with dim blue-grey clouds
  dark: {
    bg: "#0E1B30",
    bgImage:
      "radial-gradient(260px 120px at 18% 9%, rgba(120,160,210,0.22), transparent 70%), radial-gradient(300px 130px at 88% 24%, rgba(120,160,210,0.18), transparent 70%), radial-gradient(240px 110px at 6% 78%, rgba(120,160,210,0.16), transparent 70%), radial-gradient(320px 140px at 82% 93%, rgba(120,160,210,0.2), transparent 70%), linear-gradient(180deg, #162A47 0%, #10213A 45%, #0B172B 100%)",
    text: "#F1F7FD",
    eyebrow: "text-sky-300",
    title: "text-white",
    sub: "text-slate-300",
    panel: "bg-[#14263f]/85 border border-white/10 shadow-[0_10px_34px_rgba(0,0,0,0.35)]",
    head: "bg-white/[0.05] text-slate-300 border-b border-white/10",
    rowBorder: "border-white/[0.07]",
    zebra: "bg-white/[0.025]",
    strong: "text-white",
    muted: "text-slate-300",
    faint: "text-slate-400",
    cls: "bg-sky-400/15 text-sky-100 border border-sky-300/25",
    conflict: "bg-red-500/10",
    foot: "text-slate-400",
  },
} as const;

// Shared grid so header and rows align like the web table
const WALLPAPER_COLS = "grid-cols-[14px_56px_42px_1fr_24px_40px]";

function WallpaperTable({
  theme,
  rows,
  totalCredits,
  targetRef,
}: {
  theme: "light" | "dark";
  rows: (MatchedSchedule & { resolvedCredits: number })[];
  totalCredits: number;
  targetRef: React.RefObject<HTMLDivElement | null>;
}) {
  const t = WALLPAPER_THEMES[theme];
  const prodi =
    rows.find((r) => r.course?.study_program || r.detected_study_program)?.course?.study_program ||
    rows.find((r) => r.detected_study_program)?.detected_study_program ||
    "Teknologi Informasi";

  return (
    <div
      ref={targetRef}
      style={{
        width: "420px",
        height: "910px",
        backgroundColor: t.bg,
        backgroundImage: t.bgImage,
        color: t.text,
        boxSizing: "border-box",
        position: "relative",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="px-3 pt-44 pb-6 flex flex-col justify-between select-none"
    >
      <div>
        {/* Header */}
        <div className="px-1">
          <p className={cn("text-[10px] font-bold tracking-[0.2em] uppercase", t.eyebrow)}>
            FILKOM Universitas Brawijaya
          </p>
          <h1 className={cn("text-lg font-black tracking-tight mt-0.5", t.title)}>
            Jadwal Ujian Ganjil 2026/2027
          </h1>
          <p className={cn("text-[11px] font-medium mt-0.5", t.sub)}>
            Prodi {prodi} · {rows.length} Matkul · {totalCredits} SKS
          </p>
        </div>

        {/* Table (mirrors the web table) */}
        <div className={cn("mt-3 rounded-xl overflow-hidden", t.panel)}>
          <div
            className={cn(
              "grid gap-x-2 items-center px-2.5 py-2.5 text-[8.5px] font-semibold uppercase tracking-wider",
              WALLPAPER_COLS,
              t.head
            )}
          >
            <span className="text-center">No</span>
            <span>Tanggal</span>
            <span>Waktu</span>
            <span>Mata Kuliah</span>
            <span className="text-center">Kls</span>
            <span>Ruang</span>
          </div>

          {rows.map((s, idx) => {
            const d = new Date(s.exam_date);
            const valid = !isNaN(d.getTime());
            const dateStr = valid ? format(d, "d MMM yyyy", { locale: id }) : s.exam_date;
            const code = s.course?.code || s.detected_code;

            return (
              <div
                key={s.id || idx}
                className={cn(
                  "grid gap-x-2 items-center px-2.5 py-2.5",
                  WALLPAPER_COLS,
                  idx > 0 && "border-t",
                  t.rowBorder,
                  s.conflict ? t.conflict : idx % 2 === 1 && t.zebra
                )}
              >
                <span className={cn("text-center text-[9px] font-mono", t.faint)}>{idx + 1}</span>

                <div className="leading-tight">
                  <div className={cn("text-[10.5px] font-bold", t.strong)}>{s.day_name}</div>
                  <div className={cn("text-[9px] font-medium mt-0.5", t.muted)}>{dateStr}</div>
                </div>

                <div className={cn("text-[10px] font-medium tabular-nums leading-tight", t.strong)}>
                  <div>{s.start_time}</div>
                  <div className={cn("mt-0.5", t.muted)}>{s.end_time ? `– ${s.end_time}` : ""}</div>
                </div>

                <div className="min-w-0">
                  <div
                    className={cn("text-[10.5px] font-bold leading-tight", t.strong)}
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  >
                    {s.course?.name || s.detected_name}
                  </div>
                  <div className={cn("text-[8.5px] font-mono mt-0.5 truncate", t.muted)}>{code}</div>
                </div>

                <div className="flex justify-center">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", t.cls)}>
                    {s.class_name || s.detected_class}
                  </span>
                </div>

                <span className={cn("text-[10.5px] font-mono font-bold whitespace-nowrap", t.strong)}>
                  {s.room || "—"}
                </span>

              </div>
            );
          })}
        </div>
      </div>

      <div className={cn("pt-2 flex items-center justify-center text-[10px] font-medium", t.foot)}>
        <span>JadwalinUjian</span>
      </div>
    </div>
  );
}
