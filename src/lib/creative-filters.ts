import type { CreativeDTO } from '../types/domain';

export type CreativeFilters = { search: string; product: string; status: string; mediaType: string; size: string; sort: string };

export function filterAndSortCreatives(items: CreativeDTO[], filters: CreativeFilters): CreativeDTO[] {
  const search = filters.search.trim().toLocaleLowerCase('vi');
  const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
  const result = items.filter(c => {
    if (filters.product !== 'ALL' && c.product?.code !== filters.product) return false;
    if (filters.status !== 'ALL' && c.lifecycleStatus !== filters.status) return false;
    if (filters.mediaType !== 'ALL' && c.mediaType !== filters.mediaType) return false;
    if (filters.size === 'large' && !c.sizeWarning) return false;
    if (filters.size === 'normal' && c.sizeWarning) return false;
    return !search || [c.creativeCode, c.fileName, c.driveFolderPath, c.product?.code, c.product?.name, c.hookAngle].some(v => v?.toLocaleLowerCase('vi').includes(search));
  });
  result.sort((a,b) => {
    let order = 0;
    switch (filters.sort) {
      case 'code_asc': order = collator.compare(a.creativeCode, b.creativeCode); break;
      case 'code_desc': order = collator.compare(b.creativeCode, a.creativeCode); break;
      case 'name_asc': order = collator.compare(a.fileName, b.fileName); break;
      case 'size_desc': order = Number(b.fileSizeMb) - Number(a.fileSizeMb); break;
      case 'size_asc': order = Number(a.fileSizeMb) - Number(b.fileSizeMb); break;
      case 'oldest': order = a.id - b.id; break;
      default: order = b.id - a.id;
    }
    return order || a.id - b.id;
  });
  return result;
}
