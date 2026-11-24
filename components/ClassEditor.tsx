"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilLine, Check, Loader2, X, ChevronDown } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { MatchedSchedule } from "@/lib/types";

interface ClassEditorProps {
  schedules: MatchedSchedule[];
  busy?: boolean;
  // changes: index of the course in the KRS -> the class the user picked
  onApply: (changes: Record<number, string>) => void;
}

// One button under the schedule table. It opens a panel where every course's class can be
// corrected to match the student's KRS (OCR can misread a letter, e.g. C as E), then applied at once.
export default function ClassEditor({ schedules, busy, onApply }: ClassEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});

  const rows = useMemo(
    () =>
      schedules
        .filter((s) => s.index !== undefined)
        .sort((a, b) => (a.course?.name || a.detected_name).localeCompare(b.course?.name || b.detected_name)),
    [schedules]
  );

  // Fresh results (after applying, or a new upload) start from what is shown in the table.
  useEffect(() => setDraft({}), [schedules]);

  const current = (s: MatchedSchedule) => s.class_name || s.detected_class;
  const chosen = (s: MatchedSchedule) => draft[s.index as number] ?? current(s);
  const changes = rows.filter((s) => chosen(s) !== current(s));

  if (rows.length === 0) return null;

  const apply = () => {
    const out: Record<number, string> = {};
    for (const s of changes) out[s.index as number] = chosen(s);
    onApply(out);
    setOpen(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="class-editor-panel"
        disabled={busy}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-50 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PencilLine className="w-4 h-4" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-900">Ada kelas yang tidak sesuai dengan KRS-mu? Perbaiki kelas</span>
          <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
            Pembacaan gambar bisa keliru pada huruf kelas. Pilih ulang kelas yang benar, jadwal dan ruangannya langsung ikut berubah.
          </span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id="class-editor-panel" className="border-t border-slate-200 bg-slate-50/60 px-4 sm:px-5 py-4 flex flex-col gap-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Samakan dengan kolom <span className="font-semibold">KELAS</span> di KRS-mu. Kelas yang tersedia mengikuti data jadwal UAS.
          </p>

          <ul className="flex flex-col gap-2">
            {rows.map((s) => {
              const key = s.index as number;
              const options = s.available_classes && s.available_classes.length > 0 ? s.available_classes : [current(s)];
              const changed = chosen(s) !== current(s);
              return (
                <li
                  key={key}
                  className={cn(
                    "bg-white border rounded-lg px-3.5 py-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between",
                    changed ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate" title={s.course?.name || s.detected_name}>
                      {s.course?.name || s.detected_name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatDate(s.exam_date)} · {s.start_time} · {s.room || "—"}
                      {changed && <span className="ml-1.5 font-semibold text-blue-600">· diubah dari kelas {current(s)}</span>}
                    </p>
                  </div>

                  <div role="radiogroup" aria-label={`Kelas untuk ${s.course?.name || s.detected_name}`} className="flex flex-wrap gap-1.5 sm:justify-end">
                    {options.map((c) => {
                      const selected = c === chosen(s);
                      return (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={busy || options.length < 2}
                          onClick={() => setDraft((d) => ({ ...d, [key]: c }))}
                          className={cn(
                            "min-w-[2.5rem] h-8 px-3 rounded-full border text-xs font-semibold transition-all inline-flex items-center justify-center",
                            selected
                              ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50",
                            options.length < 2 ? "cursor-default" : "cursor-pointer",
                            busy && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setDraft({});
                setOpen(false);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Batal
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={changes.length === 0 || busy}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {changes.length > 0 ? `Terapkan ${changes.length} Perubahan Kelas` : "Terapkan Perubahan Kelas"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
