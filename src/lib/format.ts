export function formatVnd(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0 ₫";
  return `${Math.round(value).toLocaleString("vi-VN")} ₫`;
}

export function formatCompactVnd(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0đ";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)} tr`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}k`;
  }
  return `${sign}${Math.round(abs)}đ`;
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0%";
  return `${num.toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0";
  return Math.round(num).toLocaleString("vi-VN");
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDaysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function formatDateTimeVi(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface AccountStatusMeta {
  label: string;
  severity: "ok" | "warning" | "danger";
  description: string;
}

export function getMetaAccountStatusInfo(status: number): AccountStatusMeta {
  switch (status) {
    case 1:
      return {
        label: "Đang chạy",
        severity: "ok",
        description: "Tài khoản quảng cáo hoạt động bình thường (account_status = 1).",
      };
    case 2:
      return {
        label: "Vô hiệu hóa",
        severity: "danger",
        description: "Tài khoản bị khóa / vô hiệu hóa chính sách hoặc thanh toán.",
      };
    case 3:
      return {
        label: "Nợ ngưỡng",
        severity: "danger",
        description: "Thanh toán thất bại / tài khoản đang nợ ngưỡng chưa quyết toán.",
      };
    case 7:
      return {
        label: "Chờ duyệt rủi ro",
        severity: "warning",
        description: "Meta đang rà soát rủi ro tài khoản (PENDING_RISK_REVIEW).",
      };
    case 9:
      return {
        label: "Lỗi thẻ thanh toán",
        severity: "danger",
        description: "Thẻ thanh toán lỗi hoặc trong thời gian ân hạn (IN_GRACE_PERIOD).",
      };
    case 101:
      return {
        label: "Đã đóng",
        severity: "warning",
        description: "Tài khoản quảng cáo đã đóng.",
      };
    default:
      return {
        label: `Trạng thái #${status}`,
        severity: "warning",
        description: "Trạng thái không xác định từ Meta Graph API.",
      };
  }
}

export const LIFECYCLE_LABELS: Record<
  string,
  { label: string; badgeClass: string }
> = {
  cho_test: {
    label: "Chờ test",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  dang_chay: {
    label: "Đang chạy",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  winning: {
    label: "Winning",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  bao_hoa: {
    label: "Bão hòa",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
};
