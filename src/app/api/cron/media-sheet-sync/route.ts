import { timingSafeEqual } from 'node:crypto';
import { inSyncWindow } from '@/lib/media-sheet-sync';
import { runMediaSheetSync } from '@/services/media-sheet-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
export async function GET(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (process.env.MEDIA_SHEET_SYNC_ENABLED !== 'true') return Response.json({ error: 'Disabled' }, { status: 503 });
  if (!inSyncWindow(new Date())) return Response.json({ error: 'Outside allowed window' }, { status: 409 });
  try {
    const updated = await runMediaSheetSync('1fJHNeYryZq-L5rSp3Ek3eXOiVTIDdsbXq3iua4Nm7Ns', () => inSyncWindow(new Date()));
    return Response.json({updated}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    console.error('media-sheet-sync failed or write outcome uncertain');
    return Response.json({error:'Sync failed or outcome uncertain; inspect Sheet before retrying'}, {status:502});
  }
}
