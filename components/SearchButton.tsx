"use client";

import { Search, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading?: boolean;
}

export default function SearchButton({ onClick, disabled, loading }: SearchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all select-none overflow-hidden",
        !disabled && !loading
          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.99] cursor-pointer"
          : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
      )}
      aria-label="Cari jadwal UAS"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span className="font-medium text-white">Memproses screenshot KRS...</span>
        </>
      ) : (
        <>
          <Search className={cn("w-4 h-4", !disabled ? "text-white" : "text-slate-400")} />
          <span>Cari Jadwal UAS</span>
          <ArrowRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", !disabled ? "text-blue-200" : "text-slate-400")} />
        </>
      )}
    </button>
  );
}
