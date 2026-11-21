"use client";

import React from "react";
import { X } from "lucide-react";

interface ModalShellProps {
  open: boolean;
  title: React.ReactNode;
  subtitle?: string;
  maxWidthClass?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalShell({
  open,
  title,
  subtitle,
  maxWidthClass = "max-w-lg",
  onClose,
  children,
}: ModalShellProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`bg-white rounded-2xl ${maxWidthClass} w-full shadow-xl border border-slate-200 overflow-hidden my-8`}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              {title}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 font-mono mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
