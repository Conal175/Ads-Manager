import { GoogleAuth } from 'google-auth-library';
import { collectDriveInventory, type DriveEntry } from '@/lib/drive-inventory';

export async function previewDriveInventory(raw: string, rootId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(rootId)) throw new Error('Invalid root');
  const parsed = JSON.parse(raw) as { client_email?: unknown; private_key?: unknown };
  if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') throw new Error('Invalid service account');
  // Supply only these fields so user-provided credential JSON cannot override token endpoints.
  const auth = new GoogleAuth({ credentials: { client_email: parsed.client_email, private_key: parsed.private_key }, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  const client = await auth.getClient();
  const root = await client.request<{mimeType?: string}>({url:`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootId)}?supportsAllDrives=true&fields=mimeType`,timeout:8000});
  if (root.data.mimeType !== 'application/vnd.google-apps.folder') throw new Error('Root is not a folder');
  let pages = 0;
  return collectDriveInventory(rootId, async folderId => {
    const entries: DriveEntry[] = [];
    let pageToken: string | undefined;
    do {
      if (++pages > 100) throw new Error('Page limit');
      const params = new URLSearchParams({q:`'${folderId}' in parents and trashed = false`, pageSize:'100', fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,videoMediaMetadata(durationMillis))', supportsAllDrives:'true', includeItemsFromAllDrives:'true'});
      if (pageToken) params.set('pageToken', pageToken);
      const response = await client.request<{files?: DriveEntry[]; nextPageToken?: string; incompleteSearch?: boolean}>({url:`https://www.googleapis.com/drive/v3/files?${params}`, timeout:8000});
      if (response.data.incompleteSearch) throw new Error('Incomplete search');
      entries.push(...(response.data.files ?? []));
      if (entries.length > 3000) throw new Error('Inventory limit');
      pageToken = response.data.nextPageToken;
    } while (pageToken);
    return entries;
  });
}
