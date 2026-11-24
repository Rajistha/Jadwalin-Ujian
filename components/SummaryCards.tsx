"use client";

import { BookOpen, CalendarCheck, CalendarRange, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { formatDate, resolveCredits } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";
import { differenceInDays, parseISO } from "date-fns";

interface SummaryCardsProps {
  result: SearchResult;
}

export default function SummaryCards({ result }: SummaryCardsProps) {
  const { matched, stats } = result;

  const sorted = [...matched].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const totalCredits = matched.reduce((acc, s) => acc + resolveCredits(s), 0);
  const hasConflict = matched.some((s) => s.conflict);
  const partial = stats.unmatched > 0;

  const cards = [
    {
      icon: BookOpen,
      label: "Total Mata Kuliah",
      value: `${stats.matched} MK`,
      sub: totalCredits > 0 ? `${totalCredits} SKS Total` : "Terjadwal",
    },
    {
      icon: CalendarCheck,
      label: "UAS Pertama",
      value: first ? formatDate(first.exam_date) : "—",
      sub: first
        ? `${first.day_name}, ${first.start_time} WIB`
        : "—",
    },
    {
      icon: CalendarRange,
      label: "UAS Terakhir",
      value: last ? formatDate(last.exam_date) : "—",
      sub: last && first
        ? `Rentang ${differenceInDays(parseISO(last.exam_date), parseISO(first.exam_date)) + 1} hari ujian`
        : "—",
    },
    {
      icon: hasConflict ? AlertTriangle : partial ? Info : CheckCircle2,
      label: "Status Jadwal",
      value: hasConflict ? "Ada Bentrok" : partial ? "Sebagian Terjadwal" : "Semua Terjadwal",
      sub: hasConflict
        ? "Periksa baris bertanda merah"
        : partial
        ? `${stats.unmatched} MK belum ditemukan`
        : "100% Cocok dengan Master",
      statusClass: hasConflict ? "text-red-600" : partial ? "text-amber-700" : "text-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 70}ms` }}
          className="fade-slide-up bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">{card.label}</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
              <card.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className={`text-base font-bold tracking-tight ${card.statusClass || "text-slate-900"}`}>
              {card.value}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
