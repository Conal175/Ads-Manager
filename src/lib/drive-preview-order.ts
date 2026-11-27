/** Rows already represented in the catalog; a different ID with the same code is not imported. */
export function isAlreadyInCatalog(status: string): boolean {
  return status === 'existing' || status === 'duplicate_code';
}
export function orderDrivePreview<T extends {status:string}>(files: T[], hideExisting = false): T[] {
  const other: T[] = [], existing: T[] = [];
  for (const file of files) (isAlreadyInCatalog(file.status) ? existing : other).push(file);
  return hideExisting ? other : [...other, ...existing];
}
