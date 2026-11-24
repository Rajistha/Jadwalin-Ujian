"use client";

import { CheckCircle2, ScanLine, Search, Calendar, LayoutGrid, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: ScanLine, label: "Membaca screenshot KRS" },
  { icon: Search, label: "Mengambil daftar mata kuliah dan kelas" },
  { icon: Calendar, label: "Mencocokkan dengan jadwal UAS" },
  { icon: LayoutGrid, label: "Menyusun tabel jadwal" },
];

interface LoadingStepperProps {
  isLoading: boolean;
  /** Index of the step currently running. STEPS.length means every step is finished. */
  step: number;
}

export default function LoadingStepper({ isLoading, step }: LoadingStepperProps) {
  if (!isLoading) return null;

  const currentStep = Math.min(step, STEPS.length);
  const progress = Math.max(8, Math.round((currentStep / STEPS.length) * 100));

  return (
    <div className="flex flex-col gap-3.5 py-2 w-full">
      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-1.5">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const StepIcon = step.icon;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all",
                active && "bg-blue-50/80 font-semibold text-blue-900 border border-blue-100 shadow-2xs",
                done && "text-slate-600",
                !active && !done && "text-slate-400 opacity-50"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs",
                  done
                    ? "text-emerald-600 bg-emerald-50"
                    : active
                    ? "text-blue-600 bg-blue-100/80"
                    : "text-slate-400 bg-slate-100"
                )}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : active ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <StepIcon className="w-3 h-3" />
                )}
              </div>

              <span className="flex-1">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
