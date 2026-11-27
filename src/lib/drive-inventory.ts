export type DriveEntry = { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string; videoMediaMetadata?: { durationMillis?: string } };
export type DriveMediaPreview = { id: string; name: string; mimeType: string; sizeBytes: string | null; modifiedTime: string | null; durationMillis: string | null; productCode: string; month: string; path: string };
const folderType = 'application/vnd.google-apps.folder';
export function normalizeMonthFolder(name: string): string | null {
  const match = /^(\d{4})\s*-\s*(0?[1-9]|1[0-2])$/.exec(name.trim());
  return match ? `${match[1]}-${match[2].padStart(2, '0')}` : null;
}
const validId = (id: string) => /^[a-zA-Z0-9_-]+$/.test(id);
/** Strictly bounded inventory. Does not follow shortcuts or modify files. */
export async function collectDriveInventory(rootId: string, listChildren: (id: string) => Promise<DriveEntry[]>) {
  if (!validId(rootId)) throw new Error('Invalid root');
  let calls = 0, scanned = 0;
  const list = async (id: string) => {
    if (!validId(id) || ++calls > 60) throw new Error('Inventory limit');
    const children = await listChildren(id);
    scanned += children.length;
    if (scanned > 3000) throw new Error('Inventory limit');
    return children;
  };
  const files: DriveMediaPreview[] = [];
  const warnings: string[] = [];
  const productFolders = await list(rootId);
  const names = new Set<string>();
  for (const product of productFolders) {
    if (product.mimeType !== folderType) { warnings.push(`Bỏ qua mục ở thư mục gốc: ${product.name}`); continue; }
    const code = product.name.trim().toUpperCase();
    if (!code || names.has(code)) throw new Error('Duplicate product folder');
    names.add(code);
    for (const month of await list(product.id)) {
      // Only the explicitly approved Gi/ADS Win special folder is scanned outside month folders.
      const normalizedMonth = code === 'GI' && month.name.trim().toUpperCase() === 'ADS WIN' ? month.name : normalizeMonthFolder(month.name);
      if (month.mimeType !== folderType || !normalizedMonth) { warnings.push(`Bỏ qua mục không phải thư mục tháng: ${product.name}/${month.name}`); continue; }
      for (const file of await list(month.id)) {
        if (!validId(file.id)) throw new Error('Invalid file id');
        if (!file.mimeType.startsWith('image/') && !file.mimeType.startsWith('video/')) { warnings.push(`Bỏ qua file không phải ảnh/video: ${file.name}`); continue; }
        files.push({id:file.id, name:file.name, mimeType:file.mimeType, sizeBytes:file.size ?? null, modifiedTime:file.modifiedTime ?? null, durationMillis:file.videoMediaMetadata?.durationMillis ?? null, productCode:code, month:normalizedMonth, path:`${product.name}/${month.name}`});
      }
    }
  }
  return { files, warnings };
}

export type DriveMatchStatus = 'new' | 'existing' | 'unknown_product' | 'product_conflict' | 'duplicate_file' | 'ambiguous_product' | 'duplicate_code';
/** Advisory only: recheck constraints at write time; this function never writes. */
export function matchDriveInventory(files: DriveMediaPreview[], products: {id:number;code:string}[], creatives: {id:number;productId:number;driveFileId:string;creativeCode?:string}[]) {
  const productsByCode = new Map<string, number[]>();
  for (const product of products) {
    const code = product.code.trim().toUpperCase();
    productsByCode.set(code, [...(productsByCode.get(code) ?? []), product.id]);
  }
  const existingByFile = new Map<string, typeof creatives>();
  for (const creative of creatives) existingByFile.set(creative.driveFileId, [...(existingByFile.get(creative.driveFileId) ?? []), creative]);
  const existingCodes = new Set(creatives.map(c => c.creativeCode?.trim().toUpperCase()).filter(Boolean));
  const seen = new Map<string, number>();
  for (const file of files) seen.set(file.id, (seen.get(file.id) ?? 0) + 1);
  const counts: Record<DriveMatchStatus, number> = {new:0, existing:0, unknown_product:0, product_conflict:0, duplicate_file:0, ambiguous_product:0, duplicate_code:0};
  const mapped = files.map(file => {
    const productIds = productsByCode.get(file.productCode) ?? [];
    const existing = existingByFile.get(file.id) ?? [];
    let status: DriveMatchStatus;
    if ((seen.get(file.id) ?? 0) > 1 || existing.length > 1) status = 'duplicate_file';
    else if (productIds.length > 1) status = 'ambiguous_product';
    else if (!productIds.length) status = 'unknown_product';
    else if (existing.length && existing[0].productId !== productIds[0]) status = 'product_conflict';
    else if (existing.length) status = 'existing';
    else {
      const code = /^((?:M)[0-9]+)(?=[_.-]|$)/i.exec(file.name)?.[1].toUpperCase();
      status = code && existingCodes.has(code) ? 'duplicate_code' : 'new';
    }
    counts[status]++;
    return {...file, status, productId: productIds.length === 1 ? productIds[0] : null, creativeId: existing.length === 1 ? existing[0].id : null};
  });
  return {files:mapped, counts};
}
