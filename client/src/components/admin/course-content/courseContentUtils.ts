/**
 * courseContentUtils.ts
 * Pure helper functions for CourseContentManager and related components.
 */

export const normalizeId = (id: any): string | null => {
  if (id === null || id === undefined) return null;
  if (typeof id === 'string') {
    const s = id.trim();
    return (s === 'null' || s === 'undefined' || s === '') ? null : s;
  }
  if (typeof id === 'object') {
    if (id.$oid) return String(id.$oid);
    if (id._id) return normalizeId(id._id);
    if ((id as any).id && typeof (id as any).id === 'string') return (id as any).id;
    if (id.toString && typeof id.toString === 'function') {
      const str = id.toString();
      if (str !== '[object Object]') return str;
    }
  }
  const finalStr = String(id);
  return (finalStr === '[object Object]' || finalStr === 'null' || finalStr === 'undefined') ? null : finalStr;
};

// Robust ID Matching Helpers
export const getAnyId = (item: any): string => normalizeId(item?._id || item?.id) || "";

export const getParentFolderId = (item: any): string => normalizeId(item?.folderId || item?.parentId || item?.folder || item?.folder_id) || "";

export const folderMatches = (item: any, folder: any): boolean => {
  const itemFolderId = getParentFolderId(item);
  if (!itemFolderId) return false;
  
  const fId = normalizeId(folder?._id);
  const fCustomId = normalizeId(folder?.id);
  
  return (fId && itemFolderId === fId) || (fCustomId && itemFolderId === fCustomId);
};

export const isChildOfFolder = (itemOrFolderId: any, parentFolder: any) => {
  if (!parentFolder) return false;
  const cFolderId = normalizeId(itemOrFolderId);
  if (!cFolderId) return false;
  return cFolderId === normalizeId(parentFolder._id) || cFolderId === normalizeId(parentFolder.id);
};
