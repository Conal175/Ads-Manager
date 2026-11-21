export type MediaExportRow = {
  creativeCode: string; productCode: string; productName: string; fileName: string;
  driveFileId: string; driveFolderPath: string; mediaType: string; fileSizeMb: number;
  durationSec: number; hookAngle: string; lifecycleStatus: string;
};
const header = ['Mã media', 'Mã sản phẩm', 'Tên sản phẩm', 'Tên file', 'ID file Drive', 'Link Drive', 'Thư mục Drive', 'Loại', 'Kích thước MB', 'Thời lượng giây', 'Góc nội dung', 'Trạng thái'];
function csvCell(value: string | number) {
  let text = String(value);
  // Spreadsheet formula injection can begin after whitespace/control characters.
  if (/^[\s\u0000-\u001f]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function mediaCsv(rows: MediaExportRow[]) {
  const lines = [header, ...rows.map(r => [r.creativeCode, r.productCode, r.productName, r.fileName, r.driveFileId,
    /^[\w-]+$/.test(r.driveFileId) ? `https://drive.google.com/file/d/${r.driveFileId}/view` : '',
    r.driveFolderPath, r.mediaType, r.fileSizeMb, r.durationSec, r.hookAngle, r.lifecycleStatus])];
  return '\uFEFF' + lines.map(line => line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
