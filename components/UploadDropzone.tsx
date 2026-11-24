"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, Image as ImageIcon, X, RefreshCw, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  selectedFile: File | null;
  previewUrl: string | null;
  disabled?: boolean;
}

export default function UploadDropzone({
  onFileSelect,
  onClear,
  selectedFile,
  previewUrl,
  disabled,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setError("Format harus JPG, PNG, atau WebP.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Ukuran file maksimal 10 MB.");
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  // Paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) validateAndSelect(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, validateAndSelect]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  };

  if (selectedFile && previewUrl) {
    return (
      // flex-1 + absolute image: the preview fills whatever height the card has (no empty gap above
      // the search button when the guide card next to it is taller).
      <div className="relative flex-1 min-h-60 sm:min-h-72 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Preview KRS"
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Hover / Overlay controls */}
        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 bg-white text-slate-900 text-xs font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ganti Gambar</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-red-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        </div>

        {/* Status chip */}
        <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-xs text-emerald-700 text-xs px-2.5 py-1 rounded-md font-medium shadow-xs border border-emerald-200">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Gambar Siap Diproses</span>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="absolute top-2.5 right-2.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg p-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Hapus gambar"
        >
          <X className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateAndSelect(f);
            e.target.value = "";
          }}
        />

        {error && (
          <p className="absolute bottom-2.5 left-2.5 right-2.5 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "relative flex-1 cursor-pointer rounded-xl border-2 border-dashed transition-all p-8 flex flex-col items-center justify-center gap-3.5 select-none min-h-[210px] group",
        dragOver
          ? "border-blue-500 bg-blue-50/60 shadow-sm"
          : error
          ? "border-red-400 bg-red-50/50"
          : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-xs",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      role="button"
      aria-label="Area unggah screenshot"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
          dragOver
            ? "bg-blue-600 text-white scale-110 shadow-sm"
            : "bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 group-hover:bg-blue-100/60"
        )}
      >
        {dragOver ? <ImageIcon className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
      </div>

      <div className="text-center">
        <p className="font-semibold text-slate-900 text-sm">
          Tarik file screenshot ke sini atau <span className="text-blue-600 underline-offset-2 hover:underline">pilih file</span>
        </p>
        <p className="text-slate-500 text-xs mt-1">
          Bisa langsung tempel (<kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-slate-600 border border-slate-200">Ctrl + V</kbd>) dari clipboard
        </p>
        <p className="text-slate-400 text-[11px] mt-0.5">Mendukung format JPG, PNG, atau WebP (Maksimal 10 MB)</p>
      </div>

      {error && <p className="text-red-600 text-xs font-semibold mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) validateAndSelect(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
