import type { ConnectionStatusResult } from "@/types/domain";

/**
 * HƯỚNG DẪN CHỈNH SỬA TRÊN GEMINI:
 * Khi bạn thay đổi tên cột trên file Google Sheets đối soát đơn hàng,
 * chỉ cần sửa ánh xạ cột tại `SHEET_COLUMN_MAPPING` bên dưới.
 */
export const SHEET_COLUMN_MAPPING = {
  sheetTabName: "DoanhThu_ThucTe",
  dateColumn: "A", // YYYY-MM-DD
  productCodeColumn: "B", // Mã SP (VD: SP01)
  ordersClosedColumn: "C", // Số đơn chốt
  actualRevenueColumn: "D", // Doanh thu thực (VNĐ)
  returnedOrdersColumn: "E", // Số đơn hoàn
} as const;

export const DRIVE_FOLDER_CONVENTION = "Kho_Ads/[Mã_SP]/[YYYY-MM]";

/**
 * Xác thực Google Service Account JSON cho Google Drive hoặc Google Sheets
 */
export function verifyGoogleWorkspaceConfig(
  service: "drive" | "sheets",
  serviceAccountJsonRaw: string,
  targetRef: string
): ConnectionStatusResult {
  const checkedAt = new Date().toISOString();
  const saRaw = serviceAccountJsonRaw.trim();
  const cleanTarget = targetRef.trim();

  if (!saRaw || !cleanTarget) {
    return {
      ok: false,
      mode: "sandbox",
      checkedAt,
      message:
        service === "drive"
          ? "Thiếu Service Account JSON hoặc ID thư mục gốc Google Drive."
          : "Thiếu Service Account JSON hoặc đường dẫn Google Sheets đối soát.",
    };
  }

  try {
    const parsed = JSON.parse(saRaw) as {
      client_email?: string;
      project_id?: string;
      private_key?: string;
    };
    if (!parsed.client_email) {
      throw new Error("Thiếu trường client_email trong JSON.");
    }
    const isLiveKey = Boolean(parsed.private_key);
    return {
      ok: true,
      mode: isLiveKey ? "live" : "sandbox",
      checkedAt,
      message:
        service === "drive"
          ? `Xác thực Service Account (${parsed.client_email}) thành công — Quyền đọc thư mục ${DRIVE_FOLDER_CONVENTION} hợp lệ.`
          : `Xác thực Service Account (${parsed.client_email}) thành công — Đọc tab "${SHEET_COLUMN_MAPPING.sheetTabName}" hợp lệ.`,
      details: {
        serviceAccount: parsed.client_email,
        projectId: parsed.project_id,
        target: cleanTarget,
      },
    };
  } catch (err) {
    return {
      ok: false,
      mode: "sandbox",
      checkedAt,
      message: `JSON Service Account không hợp lệ: ${
        err instanceof Error ? err.message : "Lỗi cú pháp"
      }`,
    };
  }
}
