import { useMemo } from 'react';
import { normalizeId, getAnyId, folderMatches } from '../courseContentUtils';

interface BulkContentItem {
  id: string;
  rawId: string;
  title: string;
  type: string;
  status: string;
  parentId: string | null;
  folderId: string | null;
  raw: any;
}

interface UseCourseContentCountsProps {
  folders: any[];
  videos: any[];
  notes: any[];
  tests: any[];
}

export const useCourseContentCounts = ({
  folders,
  videos,
  notes,
  tests
}: UseCourseContentCountsProps) => {
  // Pre-calculate folder counts to avoid heavy filtering in render loop
  const folderCounts = useMemo(() => {
    const counts: Record<string, { 
      v: number, n: number, t: number, // backward compat
      videos: number, liveStreams: number, pdfs: number, tests: number, documents: number, subfolders: number, total: number 
    }> = {};

    const readStringField = (item: unknown, key: string): string => {
      if (!item || typeof item !== "object") return "";
      const value = (item as Record<string, unknown>)[key];
      return typeof value === "string" ? value.toLowerCase() : "";
    };

    const readBooleanField = (item: unknown, key: string): boolean => {
      if (!item || typeof item !== "object") return false;
      return (item as Record<string, unknown>)[key] === true;
    };

    // Use Sets to track unique content already processed to avoid double-counting in cyclic hierarchies
    const processedFolders = new Set<string>();

    folders.forEach(f => {
      const fId = getAnyId(f);
      if (!fId || processedFolders.has(fId)) return;
      processedFolders.add(fId);

      const fVideos = videos.filter(v => folderMatches(v, f));
      const fNotes = notes.filter(n => folderMatches(n, f));
      const fTests = tests.filter(t => folderMatches(t, f));
      const fSubfolders = folders.filter(sub => folderMatches(sub, f));

      const liveStreams = fVideos.filter(v => 
        readStringField(v, 'type') === 'live' || 
        readStringField(v, 'contentType') === 'live_stream' || 
        readStringField(v, 'platform') === 'youtube_zoom' || 
        readStringField(v, 'videoType') === 'live' || 
        readBooleanField(v, 'isLive')
      ).length;

      const vCount = fVideos.length - liveStreams;
      const nCount = fNotes.filter(n => readStringField(n, 'type') !== 'document' && readStringField(n, 'contentType') !== 'document').length;
      const dCount = fNotes.filter(n => readStringField(n, 'type') === 'document' || readStringField(n, 'contentType') === 'document').length;
      const tCount = fTests.length;
      const sCount = fSubfolders.length;

      counts[fId] = {
        v: vCount,
        n: nCount + dCount,
        t: tCount,
        videos: vCount,
        liveStreams: liveStreams,
        pdfs: nCount,
        tests: tCount,
        documents: dCount,
        subfolders: sCount,
        total: vCount + liveStreams + nCount + dCount + tCount + sCount
      };
    });
    return counts;
  }, [folders, videos, notes, tests]);

  const allBulkContent = useMemo<BulkContentItem[]>(() => {
    const bulkItems: BulkContentItem[] = [];

    (folders || []).forEach(f => {
      const id = normalizeId(f._id || f.id);
      if (id) {
        bulkItems.push({
          id,
          rawId: id,
          title: f.title || f.name || 'Untitled Folder',
          type: 'folder',
          status: f.status || 'active',
          parentId: normalizeId(f.parentId),
          folderId: null,
          raw: f
        });
      }
    });

    (videos || []).forEach(v => {
      const id = normalizeId(v._id || v.id);
      if (id) {
        bulkItems.push({
          id,
          rawId: id,
          title: v.title || 'Untitled Video',
          type: v.contentType === 'live_stream' || v.type === 'live' ? 'live' : 'video',
          status: v.status || 'active',
          parentId: null,
          folderId: normalizeId(v.folderId),
          raw: v
        });
      }
    });

    (notes || []).forEach(n => {
      const id = normalizeId(n._id || n.id);
      if (id) {
        bulkItems.push({
          id,
          rawId: id,
          title: n.title || 'Untitled Note',
          type: 'pdf',
          status: n.status || 'active',
          parentId: null,
          folderId: normalizeId(n.folderId),
          raw: n
        });
      }
    });

    (tests || []).forEach(t => {
      const id = normalizeId(t._id || t.id);
      if (id) {
        bulkItems.push({
          id,
          rawId: id,
          title: t.name || t.title || 'Untitled Test',
          type: t.type === 'subjective' ? 'subjective_test' : t.type === 'omr' ? 'omr_test' : 'test',
          status: t.status || 'active',
          parentId: null,
          folderId: normalizeId(t.folderId),
          raw: t
        });
      }
    });

    return bulkItems;
  }, [folders, videos, notes, tests]);

  return { folderCounts, allBulkContent };
};
