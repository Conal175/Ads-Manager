import { authorizeApi } from '@/lib/auth/server';
import { runMediaSheetSync } from '@/services/media-sheet-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
/** Explicit operator test, pinned to a separate non-production copy, never the real sheet. */
export async function POST() {
  const denied = await authorizeApi('operator', true);
  if (denied) return denied;
  try {
    const updated = await runMediaSheetSync('1axlTPCRkBBeQWnPqLf3DzJhDNUrk8NcYPJ_XAm6mzAE', () => true);
    return Response.json({updated}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    console.error('media-sheet-sync test failed or write outcome uncertain');
    return Response.json({error:'Kiểm thử không thành công hoặc chưa rõ kết quả. Kiểm tra bản Sheet thử trước khi chạy lại.'}, {status:502});
  }
}
