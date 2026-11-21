"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface FeedbackBannerProps {
  message: string | null;
  variant?: "ok" | "err" | "info";
  onClose: () => void;
}

export function FeedbackBanner({
  message,
  variant = "ok",
  onClose,
}: FeedbackBannerProps) {
  if (!message) return null;

  const styles =
    variant === "err"
      ? "bg-red-50 border-red-200 text-red-800"
      : variant === "info"
      ? "bg-blue-50 border-blue-200 text-blue-900"
      : "bg-emerald-50 border-emerald-200 text-emerald-800";

  return (
    <div
      className={`px-4 py-3 rounded-lg border text-sm flex items-center justify-between gap-3 ${styles}`}
    >
      <span className="flex items-center gap-2 font-medium">
        {variant === "err" ? (
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
        ) : (
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${
              variant === "info" ? "text-blue-600" : "text-emerald-600"
            }`}
          />
        )}
        {message}
      </span>
      <button onClick={onClose} className="text-xs font-medium underline shrink-0">
        Đóng
      </button>
    </div>
  );
}
