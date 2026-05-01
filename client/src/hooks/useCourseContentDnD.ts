import { useState, useCallback } from 'react';

interface UseCourseContentDnDProps {
  folders: any[];
  setFolders: React.Dispatch<React.SetStateAction<any[]>>;
  videos: any[];
  setVideos: React.Dispatch<React.SetStateAction<any[]>>;
  notes: any[];
  setNotes: React.Dispatch<React.SetStateAction<any[]>>;
  tests: any[];
  setTests: React.Dispatch<React.SetStateAction<any[]>>;
  selectedCourse: any;
  normalizeId: (id: any) => string | null;
  getAuthHeaders: () => any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const useCourseContentDnD = ({
  folders,
  setFolders,
  videos,
  setVideos,
  notes,
  setNotes,
  tests,
  setTests,
  selectedCourse,
  normalizeId,
  getAuthHeaders,
  showToast
}: UseCourseContentDnDProps) => {
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverItem, setDragOverItem] = useState<any>(null);

  const handleDragStart = useCallback((e: React.DragEvent, item: any) => {
    e.stopPropagation();
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem((prev: any) => prev !== item ? item : prev);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetItem: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem === targetItem) {
      handleDragEnd();
      return;
    }

    const draggedParentId = normalizeId(draggedItem.parentId || draggedItem.folderId);
    const targetParentId = normalizeId(targetItem.parentId || targetItem.folderId);

    if (draggedParentId !== targetParentId) {
      showToast('Can only reorder items within the same folder', 'error');
      handleDragEnd();
      return;
    }

    const exactSiblings = [
      ...folders.filter(f => normalizeId(f.parentId) === draggedParentId).map(f => ({...f, type: 'folder', order: f.order || f.sortingOrder})),
      ...videos.filter(v => normalizeId(v.folderId) === draggedParentId).map(v => ({...v, type: 'video', order: v.order})),
      ...notes.filter(n => normalizeId(n.folderId) === draggedParentId).map(n => ({...n, type: 'note', order: n.order})),
      ...tests.filter(t => normalizeId(t.folderId) === draggedParentId).map(t => ({...t, type: 'test', order: t.order || 0}))
    ].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const draggedId = normalizeId(draggedItem._id || draggedItem.id);
    const targetId = normalizeId(targetItem._id || targetItem.id);

    const draggedIndex = exactSiblings.findIndex(s => normalizeId(s._id || s.id) === draggedId);
    const targetIndex = exactSiblings.findIndex(s => normalizeId(s._id || s.id) === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    const newSiblings = [...exactSiblings];
    newSiblings.splice(draggedIndex, 1);
    newSiblings.splice(targetIndex, 0, draggedItem);

    const updates = newSiblings.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    const updateLocalState = (type: string, id: string, order: number) => {
      const updateList = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        setter((prevList: any[]) => prevList.map(i => normalizeId(i._id || i.id) === id ? { ...i, order, sortingOrder: order } : i));
      };
      if (type === 'folder') updateList(setFolders);
      else if (type === 'video') updateList(setVideos);
      else if (type === 'note') updateList(setNotes);
      else if (type === 'test') updateList(setTests);
    };

    updates.forEach(u => {
      const uId = normalizeId(u._id || u.id);
      if (uId) updateLocalState(u.type, uId, u.order);
    });

    handleDragEnd();

    const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
    if (!courseId) return;

    try {
      for (const item of updates) {
        const itemId = normalizeId(item._id || item.id);
        let endpoint = '';
        if (item.type === 'folder') endpoint = `/api/courses/${courseId}/folders/${itemId}`;
        else if (item.type === 'video') endpoint = `/api/courses/${courseId}/videos/${itemId}`;
        else if (item.type === 'note') endpoint = `/api/courses/${courseId}/notes/${itemId}`;
        else if (item.type === 'test') endpoint = `/api/tests/${itemId}`;
        
        if (endpoint) {
          fetch(endpoint, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: item.order, sortingOrder: item.order })
          }).catch(console.error);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to save order', 'error');
    }
  }, [draggedItem, folders, videos, notes, tests, selectedCourse, normalizeId, getAuthHeaders, showToast, handleDragEnd]);

  return {
    draggedItem,
    setDraggedItem,
    dragOverItem,
    setDragOverItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop
  };
};
