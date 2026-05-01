import { useMemo, useCallback } from 'react';
import { normalizeId, isChildOfFolder, getAnyId } from '../courseContentUtils';

interface UseCourseContentSearchProps {
  folders: any[];
  videos: any[];
  notes: any[];
  tests: any[];
  debouncedContentSearch: string;
  contentStatusFilter: string;
  contentTypeFilter: string;
}

export const useCourseContentSearch = ({
  folders,
  videos,
  notes,
  tests,
  debouncedContentSearch,
  contentStatusFilter,
  contentTypeFilter
}: UseCourseContentSearchProps) => {

  const matchesFilters = useCallback((item: any) => {
    const matchesSearch = (item.title || item.name || '').toLowerCase().includes(debouncedContentSearch.toLowerCase());
    const matchesStatus = contentStatusFilter === 'all' || item.status === contentStatusFilter;
    
    const type = ((item as any)?.type || (item as any)?.contentType || "").toLowerCase();
    
    let matchesType = contentTypeFilter === "all";
    if (!matchesType) {
      if (contentTypeFilter === "folder") matchesType = type === "folder";
      else if (contentTypeFilter === "test") matchesType = type === "test";
      else if (contentTypeFilter === "pdf") {
        const isDoc = ["document", "exam_document", "exam-documents", "doc"].includes(type);
        matchesType = ["pdf", "note", "notes", "studymaterial", "material"].includes(type) && !isDoc;
      }
      else if (contentTypeFilter === "document") {
        matchesType = ["document", "exam_document", "exam-documents", "doc"].includes(type);
      }
      else if (contentTypeFilter === "live_stream") {
        matchesType = ["live_stream", "live", "youtube_zoom", "webinar", "recorded", "recorded_video"].includes(type);
      }
      else if (contentTypeFilter === "video") {
        const isLive = ["live_stream", "live", "youtube_zoom", "webinar", "recorded", "recorded_video"].includes(type);
        matchesType = ["video", "youtube"].includes(type) || (type.includes("video") && !isLive);
      }
    }
    
    return matchesSearch && matchesStatus && matchesType;
  }, [debouncedContentSearch, contentStatusFilter, contentTypeFilter]);

  const getFilteredFlatItems = useCallback(() => {
    const flatFolders = folders.map(f => ({ ...f, type: 'folder', order: f.order || f.sortingOrder }));
    const flatVideos = videos.map(v => ({ ...v, type: (v as any).type || (v as any).contentType || (v as any).videoType || 'video', order: v.order }));
    const flatNotes = notes.map(n => ({ ...n, type: (n as any).type || (n as any).contentType || 'note', order: n.order }));
    const flatTests = tests.map(t => ({ ...t, type: 'test', order: t.order || 0 }));

    return [...flatFolders, ...flatVideos, ...flatNotes, ...flatTests]
      .filter(matchesFilters)
      .sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [folders, videos, notes, tests, matchesFilters]);

  const getAccordionTreeItems = useCallback((parentId: string | null = null) => {
    const currentParentObj = parentId ? folders.find(f => normalizeId(f._id) === parentId || normalizeId(f.id) === parentId) : null;

    const isInsideThisFolder = (contentFolderId: any) => {
      const normalizedCid = normalizeId(contentFolderId);
      if (parentId === null) return normalizedCid === null;
      if (normalizedCid === parentId) return true;
      if (currentParentObj) return isChildOfFolder(contentFolderId, currentParentObj);
      return false;
    };

    const levelFolders = folders.filter(f => {
      const fId = normalizeId(f._id || f.id);
      // Safety: Never render a folder as a child of itself
      if (parentId && fId === parentId) return false;
      return isInsideThisFolder(f.parentId);
    }).map(f => ({ ...f, type: 'folder', order: f.order || f.sortingOrder }));
    
    const levelVideos = videos.filter(v => isInsideThisFolder(v.folderId)).map(v => ({ ...v, type: (v as any).type || (v as any).contentType || (v as any).videoType || 'video', order: v.order }));
    const levelNotes = notes.filter(n => isInsideThisFolder(n.folderId)).map(n => ({ ...n, type: (n as any).type || (n as any).contentType || 'note', order: n.order }));
    const levelTests = tests.filter(t => isInsideThisFolder(t.folderId)).map(t => ({ ...t, type: 'test', order: t.order || 0 }));

    const items = [
      ...levelFolders.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
      ...[...levelVideos, ...levelNotes, ...levelTests].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    ];

    return items.filter(matchesFilters);
  }, [folders, videos, notes, tests, matchesFilters]);

  return {
    getFilteredFlatItems,
    getAccordionTreeItems,
    matchesFilters
  };
};
