import { matchDriveInventory, type DriveMediaPreview } from './drive-inventory';

export type DriveSelection = { id: string; name: string; productCode: string; productId: number | null; month: string; path: string; mimeType: string; sizeBytes: string | null; modifiedTime: string | null; durationMillis: string | null };
type Product = { id: number; code: string };
type Creative = { id: number; productId: number; driveFileId: string; creativeCode: string };

/** Build a conservative plan from a fresh Drive scan and fresh database rows; never writes. */
export function planDriveImport(files: DriveMediaPreview[], products: Product[], creatives: Creative[], selected: DriveSelection[]) {
  const matches = matchDriveInventory(files, products, creatives);
  const usedCodes = new Set(creatives.map(c => c.creativeCode.trim().toUpperCase()));
  const selectedIds = new Set<string>();
  const plannedCodes = new Set<string>();
  const rows: Array<{ file: DriveMediaPreview; productId: number; creativeCode: string; fileSizeMb: number; durationSec: number }> = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  // Never choose a winner when two distinct selected files claim the same code.
  const selectedCodes = new Map<string, Set<string>>();
  for (const choice of selected) {
    const code = /^((?:M)[0-9]+)(?=[_.-]|$)/i.exec(choice.name)?.[1].toUpperCase();
    if (code) { const ids = selectedCodes.get(code) ?? new Set<string>(); ids.add(choice.id); selectedCodes.set(code, ids); }
  }
  for (const choice of selected) {
    if (selectedIds.has(choice.id)) { skipped.push(`${choice.name}: file được chọn nhiều lần`); continue; }
    selectedIds.add(choice.id);
    const found = matches.files.filter(f => f.id === choice.id);
    if (found.length !== 1) { errors.push(`Không tìm thấy duy nhất file ${choice.id}; hãy xem trước lại.`); continue; }
    const file = found[0];
    if (file.name !== choice.name || file.productCode !== choice.productCode || file.productId !== choice.productId || file.month !== choice.month || file.path !== choice.path || file.mimeType !== choice.mimeType || file.sizeBytes !== choice.sizeBytes || file.modifiedTime !== choice.modifiedTime || file.durationMillis !== choice.durationMillis) { errors.push(`${file.name}: thông tin Drive đã thay đổi; hãy xem trước lại.`); continue; }
    if (file.status === 'existing' || file.status === 'duplicate_code') { skipped.push(`${file.name}: đã có trong kho`); continue; }
    if (file.status !== 'new' || file.productId === null) { errors.push(`${file.name}: ${file.status}; hãy xem trước lại.`); continue; }
    const code = /^((?:M)[0-9]+)(?=[_.-]|$)/i.exec(file.name)?.[1].toUpperCase();
    if (!code) { errors.push(`${file.name}: thiếu mã media M theo sau bởi số ở đầu tên.`); continue; }
    if (usedCodes.has(code) || (selectedCodes.get(code)?.size ?? 0) > 1 || plannedCodes.has(code)) { skipped.push(`${file.name}: mã media ${code} bị trùng`); continue; }
    if (!file.sizeBytes || !/^\d+$/.test(file.sizeBytes) || !Number.isSafeInteger(Number(file.sizeBytes))) { errors.push(`${file.name}: thiếu hoặc sai kích thước file.`); continue; }
    const duration = file.durationMillis;
    if (duration != null && (!/^\d+$/.test(duration) || !Number.isSafeInteger(Number(duration)) || Number(duration) > 2_147_483_647_000)) { errors.push(`${file.name}: thời lượng không hợp lệ.`); continue; }
    plannedCodes.add(code);
    rows.push({ file, productId: file.productId, creativeCode: code, fileSizeMb: Number(file.sizeBytes) / 1_000_000, durationSec: duration == null ? 0 : Math.round(Number(duration) / 1000) });
  }
  return { rows, errors, skipped };
}
