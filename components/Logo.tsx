"use client";

import React from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function LogoIcon({ className, size = 36 }: { className?: string; size?: number }) {
  const iconPixel = Math.round(size * 0.55);
  const radius = Math.round(size * 0.22); // Proportional squircle: never collapses into a circle at small sizes

  return (
    <div
      style={{ width: size, height: size, borderRadius: radius }}
      className={cn("bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0 select-none", className)}
    >
      <GraduationCap style={{ width: iconPixel, height: iconPixel }} strokeWidth={2.2} />
    </div>
  );
}

export default function Logo({ className, size = "md", showTagline = false }: LogoProps) {
  const iconSizes = {
    sm: 30,
    md: 36,
    lg: 42,
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg sm:text-xl",
    lg: "text-2xl sm:text-3xl",
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoIcon size={iconSizes[size]} />
      <div className="flex flex-col">
        <div className="flex items-center tracking-tight leading-none">
          <span className={cn("font-bold text-slate-900", textSizes[size])}>Jadwalin</span>
          <span className={cn("font-extrabold text-blue-600 ml-0.5", textSizes[size])}>Ujian</span>
        </div>
        {showTagline && <span className="text-[11px] text-slate-500 font-medium mt-1">Upload KRS, jadwal ujian langsung ketemu.</span>}
      </div>
    </div>
  );
}
