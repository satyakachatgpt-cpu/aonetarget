import { useState, useCallback } from 'react';
import { normalizeId } from '../courseContentUtils';
import { BulkContentItem } from '../CourseContent.types';

interface UseCourseContentBulkProps {
  selectedCourse: any;
  allBulkContent: BulkContentItem[];
  API_BASE_URL: string;
  getAdminHeaders: () => any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  loadCourseContent: () => void;
  invalidateCache: (key: string) => void;
}

export const useCourseContentBulk = ({
  selectedCourse,
  allBulkContent,
  API_BASE_URL,
  getAdminHeaders,
  showToast,
  loadCourseContent,
  invalidateCache
}: UseCourseContentBulkProps) => {
  const [showBulkActionDrawer, setShowBulkActionDrawer] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const handleBulkAction = useCallback(async (action: string, selectedIds: string[], options: any = {}) => {
    if (!selectedIds || selectedIds.length === 0 || !selectedCourse) return;
    const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
    if (!courseId) return;

    if (action === 'delete') {
      const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} item(s)? This action cannot be undone.`);
      if (!confirmed) return;
    }

    setBulkActionLoading(true);

    try {
      // 1. Identify all items to be updated (recursive for folders)
      const targetItems = new Set<string>();
      const processedItems = new Set<string>();

      const addItemsRecursively = (id: string) => {
        if (processedItems.has(id)) return;
        processedItems.add(id);

        const item = allBulkContent.find(i => i.id === id);
        if (!item) return;

        targetItems.add(id);

        if (item.type === 'folder') {
          allBulkContent
            .filter(child => normalizeId(child.folderId) === id || normalizeId(child.parentId) === id)
            .forEach(child => addItemsRecursively(child.id));
        }
      };

      if (['mark-paid', 'mark-free', 'enable', 'disable'].includes(action)) {
        selectedIds.forEach(id => addItemsRecursively(id));
      } else {
        selectedIds.forEach(id => targetItems.add(id));
      }

      // 2. Special handling for delete: skip children if parent folder is also selected
      const finalIdsToProcess = Array.from(targetItems);
      let idsToUpdate = finalIdsToProcess;

      if (action === 'delete') {
        idsToUpdate = finalIdsToProcess.filter(id => {
          const item = allBulkContent.find(i => i.id === id);
          if (!item) return true;
          const parentId = normalizeId(item.folderId || item.parentId);
          if (parentId && targetItems.has(parentId)) return false;
          return true;
        });
      }

      // 3. Batch processing (Batches of 5)
      const batchSize = 5;
      for (let i = 0; i < idsToUpdate.length; i += batchSize) {
        const batch = idsToUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map(async (id) => {
          const item = allBulkContent.find(it => it.id === id);
          if (!item) return;

          let endpoint = '';
          const type = item.type;
          if (type === 'folder') endpoint = 'folders';
          else if (type === 'video' || type === 'live') endpoint = 'videos';
          else if (type === 'pdf' || type === 'document') endpoint = 'notes';
          else if (type === 'test' || type === 'subjective_test' || type === 'omr_test') endpoint = 'tests';

          if (!endpoint) return;

          const url = `${API_BASE_URL}/courses/${courseId}/${endpoint}/${id}`;
          const method = action === 'delete' ? 'DELETE' : 'PUT';
          
          let body: any = { ...item.raw };

          if (action === 'mark-paid') {
            body.isFree = false;
            body.isPaid = true;
            body.locked = true;
          } else if (action === 'mark-free') {
            body.isFree = true;
            body.isPaid = false;
            body.locked = false;
          } else if (action === 'enable') {
            body.status = 'active';
            body.isActive = true;
            body.isPublished = true;
          } else if (action === 'disable') {
            body.status = 'inactive';
            body.isActive = false;
            body.isPublished = false;
          }

          if (method === 'PUT') {
            await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
              body: JSON.stringify(body)
            });
          } else {
            await fetch(url, { method, headers: getAdminHeaders() });
          }
        }));
      }

      showToast(`Bulk action ${action} completed successfully`, 'success');
      invalidateCache('course-content');
      invalidateCache('study-dashboard');
      loadCourseContent();
      setShowBulkActionDrawer(false);
    } catch (error) {
      console.error('Bulk Action Error:', error);
      showToast('Failed to complete bulk action', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedCourse, allBulkContent, API_BASE_URL, getAdminHeaders, showToast, loadCourseContent, invalidateCache]);

  return {
    showBulkActionDrawer,
    setShowBulkActionDrawer,
    bulkActionLoading,
    handleBulkAction
  };
};
