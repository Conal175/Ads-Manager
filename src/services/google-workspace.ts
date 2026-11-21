import { GoogleAuth } from "google-auth-library";
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
export async function verifyGoogleWorkspaceConfig(
  service: "drive" | "sheets",
  serviceAccountJsonRaw: string,
  targetRef: string
): Promise<ConnectionStatusResult> {
  const checkedAt = new Date().toISOString();
  try {
    const credentials = JSON.parse(serviceAccountJsonRaw) as { client_email?: string; private_key?: string };
    if (!credentials.client_email || !credentials.private_key) throw new Error("Thiếu email hoặc private key của Service Account.");
    const auth = new GoogleAuth({ credentials, scopes: [service === "drive" ? "https://www.googleapis.com/auth/drive.readonly" : "https://www.googleapis.com/auth/spreadsheets.readonly"] });
    const client = await auth.getClient();
    let url: string;
    if (service === "drive") {
      const id = targetRef.trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("ID thư mục Drive không hợp lệ.");
      url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType`;
    } else {
      const parsed = new URL(targetRef);
      if (parsed.hostname !== "docs.google.com" || parsed.protocol !== "https:") throw new Error("URL Google Sheets không hợp lệ.");
      const id = parsed.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (!id) throw new Error("Không tìm thấy ID bảng tính.");
      url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(SHEET_COLUMN_MAPPING.sheetTabName + "!A1:E1")}`;
    }
    const response = await client.request<{ mimeType?: string }>({ url, timeout: 8000 });
    if (service === "drive" && response.data.mimeType !== "application/vnd.google-apps.folder") throw new Error("ID Drive không phải thư mục.");
    return { ok: true, mode: "live", checkedAt, message: service === "drive" ? "Đã kiểm tra quyền đọc thư mục Google Drive." : "Đã kiểm tra quyền đọc tab đối soát Google Sheets." };
  } catch {
    return { ok: false, mode: "live", checkedAt, message: "Không thể xác thực hoặc đọc tài nguyên Google. Kiểm tra Service Account, ID/URL, chia sẻ quyền và API đã bật." };
  }
}
