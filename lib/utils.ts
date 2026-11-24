import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays, isToday, isTomorrow, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Known SKS per course code (fallback when master data has no credits)
const KNOWN_CREDITS: Record<string, number> = {
  CIT61006: 4, CIT61026: 4, CIT60045: 3, CIT60049: 3,
  CIT61024: 3, COM60051: 3, CIT60047: 2, CIT60048: 2,
};

export function resolveCredits(s: { course?: { code?: string; credits?: number } | null; detected_code?: string }): number {
  const code = (s.course?.code || s.detected_code || "").toUpperCase();
  return s.course?.credits || KNOWN_CREDITS[code] || 3;
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: id });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM", { locale: id });
  } catch {
    return dateStr;
  }
}

export function formatDayFull(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEEE, d MMMM yyyy", { locale: id });
  } catch {
    return dateStr;
  }
}

export function getDayRelative(dateStr: string): {
  label: string;
  variant: "today" | "tomorrow" | "soon" | "past" | "future";
} {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return { label: "Hari ini", variant: "today" };
    if (isTomorrow(date)) return { label: "Besok", variant: "tomorrow" };
    const diff = differenceInDays(date, new Date());
    if (diff < 0) return { label: "Sudah lewat", variant: "past" };
    if (diff <= 7) return { label: `H-${diff}`, variant: "soon" };
    return { label: `H-${diff}`, variant: "future" };
  } catch {
    return { label: "", variant: "future" };
  }
}

export function normalizeCourseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const PASTEL_COLORS = [
  { bg: "#E9EAF6", fg: "#4A4F9C", name: "lavender" },
  { bg: "#FFE9E3", fg: "#F2643F", name: "peach" },
  { bg: "#D9F3E6", fg: "#2E9E67", name: "mint" },
  { bg: "#FFF4D6", fg: "#D99A00", name: "butter" },
  { bg: "#DDF4FC", fg: "#1F9CC4", name: "sky" },
];

export function getPastelColor(index: number) {
  return PASTEL_COLORS[index % PASTEL_COLORS.length];
}

export function detectConflicts<T extends { exam_date: string; start_time: string; end_time?: string }>(
  schedules: T[]
): (T & { conflict: boolean })[] {
  return schedules.map((s, i) => {
    const conflict = schedules.some((other, j) => {
      if (i === j) return false;
      if (s.exam_date !== other.exam_date) return false;
      const sStart = s.start_time;
      const sEnd = s.end_time || "23:59";
      const oStart = other.start_time;
      const oEnd = other.end_time || "23:59";
      return sStart < oEnd && oStart < sEnd;
    });
    return { ...s, conflict };
  });
}
