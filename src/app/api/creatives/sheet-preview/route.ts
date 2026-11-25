import { authorizeApi } from '@/lib/auth/server';
import { resolveEffectiveSecrets } from '@/lib/api-utils';
import { db } from '@/db';
import { creatives, products, systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { GoogleAuth } from 'google-auth-library';
import { previewMediaSheet } from '@/lib/media-sheet-preview';

// Separate from the sales reconciliation sheet URL; never writes to this workbook.
const spreadsheetId='1fJHNeYryZq-L5rSp3Ek3eXOiVTIDdsbXq3iua4Nm7Ns';
const sheetTitle='Quản Lý Media & Tạo Tên';
export async function GET() {
  const denied=await authorizeApi('operator'); if(denied) return denied;
  try {
    const [settings]=await db.select().from(systemSettings).limit(1);
    const secret=resolveEffectiveSecrets(settings).googleServiceAccountJson;
    if(!secret) return Response.json({error:'Ứng dụng chưa có Service Account Google. Kết nối Google Sheets trong Arena không tự cấp quyền cho ứng dụng.'},{status:400});
    const credentials=JSON.parse(secret) as {client_email?:string;private_key?:string};
    if(!credentials.client_email||!credentials.private_key) throw new Error('Missing credentials');
    const client=await new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']}).getClient();
    const base=`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const metadata=await client.request<{sheets?:{properties?:{title?:string;gridProperties?:{rowCount?:number}}}[]}>({url:`${base}?fields=sheets.properties(title,gridProperties.rowCount)`,timeout:10000});
    const count=metadata.data.sheets?.find(s=>s.properties?.title===sheetTitle)?.properties?.gridProperties?.rowCount;
    if(!count||count>10000) throw new Error('Sheet missing or over limit');
    const range=`'${sheetTitle}'!A1:O${count}`;
    const result=await client.request<{values?:unknown[][]}>({url:`${base}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`,timeout:15000});
    const catalog=await db.select({code:creatives.creativeCode,productCode:products.code,mediaType:creatives.mediaType,driveFileId:creatives.driveFileId}).from(creatives).innerJoin(products,eq(creatives.productId,products.id));
    const rows=previewMediaSheet(result.data.values??[],catalog);
    return Response.json({rows, message:'Chỉ xem trước; chưa ghi Sheet hoặc tạo liên kết. Ô Link Media / Post ID đã có nội dung hoặc công thức sẽ không được chọn.'},{headers:{'Cache-Control':'private, no-store'}});
  } catch {
    return Response.json({error:'Không thể đọc Sheet quản lý media. Kiểm tra Service Account, quyền chia sẻ, cấu trúc cột và giới hạn 10.000 dòng.'},{status:502});
  }
}
