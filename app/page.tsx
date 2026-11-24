"use client";

import { useRef, useState, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { resolveCredits } from "@/lib/utils";

import UploadDropzone from "@/components/UploadDropzone";
import SearchButton from "@/components/SearchButton";
import LoadingStepper from "@/components/LoadingStepper";
import SummaryCards from "@/components/SummaryCards";
import ScheduleTable from "@/components/ScheduleTable";
import Logo, { LogoIcon } from "@/components/Logo";
import type { SearchResult, AppState } from "@/lib/types";
import { extractCoursesFromImage } from "@/lib/ocr";
import { GraduationCap, ShieldAlert, RotateCcw, BookOpen, Lightbulb, CheckCircle2, Info, CalendarX, ExternalLink, Database } from "lucide-react";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("Teknologi Informasi");
  const [extractedCourses, setExtractedCourses] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loadingStep, setLoadingStep] = useState(0);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(async (f: File) => {
    try {
      const compressed = await imageCompression(f, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
      setFile(compressed);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(compressed);
      });
    } catch {
      setFile(f);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(f);
      });
    }
    setState("image_selected");
    setResult(null);
    setErrorMsg("");
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setState("idle");
    setResult(null);
    setErrorMsg("");
  }, []);

  const handleSearch = useCallback(async () => {
    if (!file) return;
    setState("loading");
    setErrorMsg("");
    setLoadingStep(0);
    // Each step stays on screen for at least STEP_MIN_MS so the progress reads as real work.
    const STEP_MIN_MS = 800;
    let current = 0;
    let changedAt = Date.now();
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const goStep = async (n: number) => {
      if (n <= current) return;
      const wait = STEP_MIN_MS - (Date.now() - changedAt);
      if (wait > 0) await sleep(wait);
      current = n;
      changedAt = Date.now();
      setLoadingStep(n);
    };
    // The first request covers "Membaca" and "Mengambil daftar"; if it is slow, move on to step 2 on a timer.
    const readTimer = setTimeout(() => {
      if (current === 0) {
        current = 1;
        changedAt = Date.now();
        setLoadingStep(1);
      }
    }, 1600);

    try {
      // OCR runs in the browser (no AI service / API key)
      const extractData = await extractCoursesFromImage(file);
      clearTimeout(readTimer);
      await goStep(1);
      await goStep(2);

      if (!extractData.courses || extractData.courses.length === 0) {
        setErrorMsg("Gambar tidak terbaca sebagai tabel KRS. Pastikan screenshot tabel mata kuliah terlihat jelas.");
        setState("error");
        return;
      }

      const detectedProg = extractData.detected_study_program || "Teknologi Informasi";
      setSelectedProgram(detectedProg);
      setExtractedCourses(extractData.courses);

      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courses: extractData.courses,
          study_program: detectedProg,
        }),
      });

      if (matchRes.status === 404) {
        setState("no_data");
        return;
      }
      if (!matchRes.ok) throw new Error("MATCH_FAILED");

      const matchData: SearchResult = await matchRes.json();
      await goStep(3);
      await goStep(4);
      await sleep(400);

      setResult(matchData);
      setState(matchData.stats.unmatched > 0 ? "partial" : "success");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memproses jadwal. Coba lagi sebentar lagi.");
      setState("error");
    } finally {
      clearTimeout(readTimer);
    }
  }, [file]);

  const handleExportPng = useCallback(async () => {
    if (!exportRef.current) return;
    try {
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        filter: (node) => !(node instanceof HTMLElement && node.hasAttribute("data-export-ignore")),
      });
      const link = document.createElement("a");
      link.download = `Jadwal-UAS-FILKOM-${format(new Date(), "yyyyMMdd-HHmm")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal ekspor PNG:", err);
      alert("Gagal mengunduh PNG. Coba lagi.");
    }
  }, []);

  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 14;

    const rows = [...result.matched].sort(
      (a, b) => a.exam_date.localeCompare(b.exam_date) || a.start_time.localeCompare(b.start_time)
    );
    const totalCredits = rows.reduce((acc, s) => acc + resolveCredits(s), 0);
    const prodi =
      rows.find((r) => r.course?.study_program || r.detected_study_program)?.course?.study_program ||
      rows.find((r) => r.detected_study_program)?.detected_study_program ||
      selectedProgram;

    // Header band
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(37, 99, 235);
    doc.text("FAKULTAS ILMU KOMPUTER · UNIVERSITAS BRAWIJAYA", M, 14);

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Jadwal Ujian Akhir Semester", M, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const periodName = result.period ? `${result.period.name}` : "UAS Ganjil 2026/2027";
    doc.text(`${periodName}  |  Prodi ${prodi}`, M, 28.5);

    // Summary on the right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${rows.length} Mata Kuliah  ·  ${totalCredits} SKS`, pageW - M, 22, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dicetak ${format(new Date(), "d MMMM yyyy, HH:mm", { locale: id })} WIB`, pageW - M, 28.5, { align: "right" });

    autoTable(doc, {
      startY: 35,
      margin: { left: M, right: M, bottom: 16 },
      head: [["No", "Hari, Tanggal", "Waktu", "Kode MK", "Mata Kuliah", "Kelas", "Ruang", "SKS"]],
      body: rows.map((s, i) => [
        i + 1,
        `${s.day_name}, ${format(new Date(s.exam_date), "d MMM yyyy", { locale: id })}`,
        `${s.start_time}${s.end_time ? " - " + s.end_time : ""}`,
        s.course?.code || s.detected_code,
        s.course?.name || s.detected_name,
        s.class_name || s.detected_class,
        s.room || "-",
        resolveCredits(s),
      ]),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 9.5,
        cellPadding: { top: 3.6, bottom: 3.6, left: 3, right: 3 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: { bottom: 0.2 },
        valign: "middle",
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 8.5,
        lineColor: [203, 213, 225],
        lineWidth: { bottom: 0.4 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: "center", textColor: [148, 163, 184] },
        1: { cellWidth: 46, fontStyle: "bold" },
        2: { cellWidth: 32 },
        3: { cellWidth: 26, font: "courier", fontSize: 9, textColor: [100, 116, 139] },
        4: { cellWidth: "auto", fontStyle: "bold" },
        5: { cellWidth: 16, halign: "center", fontStyle: "bold" },
        6: { cellWidth: 22, halign: "center", font: "courier", fontStyle: "bold" },
        7: { cellWidth: 14, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && rows[data.row.index]?.conflict) {
          data.cell.styles.fillColor = [254, 242, 242];
        }
      },
    });

    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(M, pageH - 12, pageW - M, pageH - 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Cek kembali jadwal di pengumuman resmi fakultas atau SIAM UB.", M, pageH - 7);
      doc.text(`Halaman ${p} dari ${pageCount}`, pageW - M, pageH - 7, { align: "right" });
    }
    doc.save(`Jadwal-UAS-FILKOM-${format(new Date(), "yyyyMMdd")}.pdf`);
  }, [result, selectedProgram]);

  const isLoading = state === "loading";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Navigation Header */}
      <header className="fade-down sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size="md" />
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://datastudio.google.com/u/0/reporting/debeed27-617d-4375-89dc-2c4e98c6bfe6/page/VTeJC"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition shadow-2xs"
            >
              <span>Sumber Data Resmi</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-7">
        {/* Hero Section */}
        <div className="fade-slide-up text-center max-w-2xl mx-auto flex flex-col items-center" style={{ animationDelay: "80ms" }}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-2.5 border border-blue-200/80 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            UAS FILKOM Ganjil 2026/2027
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">Upload KRS, jadwal ujian langsung ketemu.</h1>
          <p className="text-slate-600 mt-2 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">Upload screenshot tabel KRS dari SIAM UB, lalu jadwal ujian dan ruanganmu langsung muncul dalam satu tabel.</p>
        </div>

        {/* Upload & Instructions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Upload Dropzone Container */}
          <div style={{ animationDelay: "200ms" }} className="fade-slide-up lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-sm font-bold text-slate-900">Unggah Screenshot KRS</h2>
                <span className="text-[11px] font-medium text-slate-400">JPG, PNG, WebP</span>
              </div>
              <UploadDropzone onFileSelect={handleFileSelect} onClear={handleClear} selectedFile={file} previewUrl={previewUrl} disabled={isLoading} />
            </div>

            {!isLoading && <SearchButton onClick={handleSearch} disabled={!file || isLoading} loading={isLoading} />}

            {isLoading && <LoadingStepper isLoading={isLoading} step={loadingStep} />}
          </div>

          {/* Guide Card */}
          <div style={{ animationDelay: "320ms" }} className="fade-slide-up lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <BookOpen className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">Panduan Penggunaan</h2>
              </div>

              <div className="flex flex-col gap-3.5">
                {[
                  {
                    step: "1",
                    title: "Screenshot Tabel KRS",
                    desc: "Buka menu KRS di SIAM UB, lalu ambil screenshot tabel yang memuat Kode MK, Nama MK, Kelas, dan Prodi.",
                  },
                  {
                    step: "2",
                    title: "Unggah atau Paste",
                    desc: "Tarik berkas gambar ke area unggah, atau tekan Ctrl+V langsung dari clipboard.",
                  },
                  {
                    step: "3",
                    title: "Simpan & Unduh Jadwal",
                    desc: "Jadwal ujian tampil dalam bentuk tabel. Simpan sebagai gambar PNG, PDF, atau wallpaper.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0 border border-slate-200/80">{item.step}</div>
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-xs font-semibold text-slate-800">Tips</p>
              </div>
              <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc list-inside leading-relaxed">
                <li>Kolom Kode MK, Nama MK, Kelas, dan Prodi harus terbaca jelas</li>
                <li>Pakai screenshot dari layar, bukan foto kamera</li>
                <li>Tidak perlu memotong bagian header tabel</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {state === "error" && (
          <div className="bg-white rounded-xl border border-red-200 p-6 flex flex-col items-center gap-3 text-center fade-slide-up max-w-lg mx-auto w-full shadow-xs">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gagal Membaca Gambar</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{errorMsg || "Screenshot tidak bisa dibaca. Coba lagi dengan gambar yang lebih jelas."}</p>
            </div>
            <button onClick={() => setState("image_selected")} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white font-medium text-xs rounded-lg hover:bg-slate-800 transition shadow-xs cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Coba Unggah Ulang</span>
            </button>
          </div>
        )}

        {/* Empty Period Notice */}
        {state === "no_data" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center gap-3 text-center fade-slide-up max-w-lg mx-auto w-full shadow-xs">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Jadwal UAS Belum Tersedia</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Jadwal ujian semester ini belum dipublikasikan.</p>
            </div>
          </div>
        )}

        {/* Results Container */}
        {(state === "success" || state === "partial") && result && (
          <div className="flex flex-col gap-5 fade-slide-up">
            {/* Partial Warning */}
            {state === "partial" && result.unmatched.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5 text-xs font-medium flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Belum ketemu: </span>
                  {result.unmatched.length} mata kuliah di KRS tidak ada di jadwal UAS: <span className="font-semibold underline">{result.unmatched.map((u) => u.name || u.code).join(", ")}</span>. Cek ke bagian akademik.
                </div>
              </div>
            )}

            {result.matched.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center gap-3 text-center shadow-xs">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Mata Kuliah Tidak Ditemukan</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">Mata kuliah di KRS tidak ada di jadwal UAS. Pastikan screenshot terbaca jelas, atau tanyakan ke bagian akademik.</p>
                </div>
              </div>
            ) : (
              <>
                <SummaryCards result={result} />
                <ScheduleTable schedules={result.matched} onExportPng={handleExportPng} onExportPdf={handleExportPdf} exportRef={exportRef} />
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-7 text-center">
        <div className="flex flex-col items-center justify-center gap-1.5 max-w-md mx-auto px-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={26} />
            <span className="font-bold text-slate-900 text-sm tracking-tight">
              Jadwalin<span className="font-extrabold text-blue-600">Ujian</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Upload KRS, jadwal ujian langsung ketemu.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            © 2026 JadwalinUjian · Created by{" "}
            <a href="https://www.instagram.com/pujarajisthaa_aw" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-700 hover:text-blue-600 transition underline underline-offset-2">
              Rajistha
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
