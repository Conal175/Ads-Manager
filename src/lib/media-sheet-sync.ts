import { previewMediaSheet, type SheetCreative } from './media-sheet-preview';

export type LinkUpdate = { row: number; link: string };

/** Both reads must match, including formulas and row ordering. Never write on an unstable snapshot. */
export function planStableLinks(first: unknown[][], second: unknown[][], catalog: SheetCreative[], catalogAgain: SheetCreative[]): LinkUpdate[] {
  if (JSON.stringify(first) !== JSON.stringify(second) || JSON.stringify(catalog) !== JSON.stringify(catalogAgain)) throw new Error('Snapshot changed');
  const rows = previewMediaSheet(second, catalogAgain);
  // Uniqueness is by product and media, even when another row has a different or missing format.
  const counts = new Map<string, number>();
  for (const row of second.slice(1)) {
    const product = typeof row[3] === 'string' ? row[3].trim().toUpperCase() : '';
    const media = typeof row[0] === 'string' ? row[0].trim().toUpperCase() : '';
    if (product && media) { const key = `${product}_${media}`; counts.set(key, (counts.get(key) ?? 0) + 1); }
  }
  const updates = rows.filter(r => {
    const row = second[r.row - 1];
    const product = typeof row?.[3] === 'string' ? row[3].trim().toUpperCase() : '';
    const media = typeof row?.[0] === 'string' ? row[0].trim().toUpperCase() : '';
    return r.status === 'ready' && counts.get(`${product}_${media}`) === 1;
  }).map(r => ({ row: r.row, link: r.proposedLink }));
  if (updates.length > 500) throw new Error('Too many updates');
  return updates;
}

/** Execute a single guarded sync. Adapters make it possible to test without a real Sheet. */
export async function syncStableLinks(deps: {
  readSheet: () => Promise<unknown[][]>;
  readCatalog: () => Promise<SheetCreative[]>;
  isAllowed: () => boolean;
  write: (updates: LinkUpdate[]) => Promise<void>;
}): Promise<number> {
  if (!deps.isAllowed()) throw new Error('Outside allowed window');
  const first = await deps.readSheet(), catalog = await deps.readCatalog();
  const second = await deps.readSheet(), catalogAgain = await deps.readCatalog();
  const updates = planStableLinks(first, second, catalog, catalogAgain);
  if (!deps.isAllowed()) throw new Error('Window expired');
  if (updates.length) await deps.write(updates);
  return updates.length;
}

/** Window in Vietnam (UTC+7); leave five minutes for a request to complete. */
export function inSyncWindow(now: Date): boolean {
  const vietnam = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vietnam.getUTCHours() === 3 && vietnam.getUTCMinutes() < 55;
}
