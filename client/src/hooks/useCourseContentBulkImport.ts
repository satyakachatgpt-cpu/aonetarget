import { useCallback } from 'react';

interface UseCourseContentBulkImportProps {
  selectedCourse: any;
  currentFolder: any;
  importSource: string;
  selectedImportItems: string[];
  setImportItems: React.Dispatch<React.SetStateAction<any[]>>;
  setIsImportLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCourses: React.Dispatch<React.SetStateAction<any[]>>;
  setShowImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  setImportSource: React.Dispatch<React.SetStateAction<string>>;
  setSelectedImportItems: React.Dispatch<React.SetStateAction<string[]>>;
  selectedContentIds: string[];
  setSelectedContentIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShowBulkActionDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  videos: any[];
  notes: any[];
  tests: any[];
  folders: any[];
  loadCourseContent: () => void;
  normalizeId: (id: any) => string | null;
  getAuthHeaders: () => any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  invalidateCache: (key: string) => void;
  API_BASE_URL: string;
}

export const useCourseContentBulkImport = ({
  selectedCourse,
  currentFolder,
  importSource,
  selectedImportItems,
  setImportItems,
  setIsImportLoading,
  setCourses,
  setShowImportModal,
  setImportSource,
  setSelectedImportItems,
  selectedContentIds,
  setSelectedContentIds,
  setShowBulkActionDrawer,
  videos,
  notes,
  tests,
  folders,
  loadCourseContent,
  normalizeId,
  getAuthHeaders,
  showToast,
  invalidateCache,
  API_BASE_URL
}: UseCourseContentBulkImportProps) => {

  const fetchAllCourses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/courses`, { headers: getAuthHeaders() });
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, [API_BASE_URL, getAuthHeaders, setCourses]);

  const fetchSourceCourseContent = useCallback(async (courseId: string) => {
    setIsImportLoading(true);
    try {
      const [videosRes, notesRes, testsRes, foldersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/courses/${courseId}/videos`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/courses/${courseId}/notes`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/courses/${courseId}/tests`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/courses/${courseId}/folders`, { headers: getAuthHeaders() })
      ]);

      const videosData = await videosRes.json();
      const notesData = await notesRes.json();
      const testsData = await testsRes.json();
      const foldersData = await foldersRes.json();

      const combined = [
        ...(Array.isArray(foldersData) ? foldersData.map((f: any) => ({ ...f, type: 'folder' })) : []),
        ...(Array.isArray(videosData) ? videosData.map((v: any) => ({ ...v, type: 'video' })) : []),
        ...(Array.isArray(notesData) ? notesData.map((n: any) => ({ ...n, type: 'note' })) : []),
        ...(Array.isArray(testsData) ? testsData.map((t: any) => ({ ...t, type: 'test' })) : [])
      ];
      setImportItems(combined);
    } catch (error) {
      console.error('Error fetching source content:', error);
      showToast('Failed to load source content', 'error');
    } finally {
      setIsImportLoading(false);
    }
  }, [API_BASE_URL, getAuthHeaders, setImportItems, setIsImportLoading, showToast]);

  const handleImportAction = useCallback(async (action: 'move' | 'copy') => {
    if (!selectedCourse || !importSource || selectedImportItems.length === 0) {
      showToast('Please select source course and items', 'error');
      return;
    }

    try {
      const targetCourseId = (selectedCourse as any)._id || selectedCourse.id;
      const targetFolderId = currentFolder?._id || currentFolder?.id || null;

      const response = await fetch(`${API_BASE_URL}/content/import`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCourseId: importSource,
          targetCourseId,
          targetFolderId: currentFolder?.id || currentFolder?._id || null,
          itemIds: selectedImportItems,
          action
        })
      });

      if (!response.ok) {
        let errMsg = 'Action failed';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          errMsg = await response.text() || errMsg;
        }
        throw new Error(errMsg);
      }

      showToast(`${selectedImportItems.length} item(s) ${action}ed successfully`, 'success');
      invalidateCache('course-content');
      invalidateCache('study-dashboard');
      setShowImportModal(false);
      setImportSource('');
      setImportItems([]);
      setSelectedImportItems([]);
      loadCourseContent();
    } catch (error: any) {
      console.error(`Import ${action} error:`, error);
      showToast(error.message || `Failed to ${action} items`, 'error');
    }
  }, [selectedCourse, importSource, selectedImportItems, currentFolder, API_BASE_URL, getAuthHeaders, showToast, invalidateCache, setShowImportModal, setImportSource, setImportItems, setSelectedImportItems, loadCourseContent]);

  const toggleContentSelection = useCallback((id: string) => {
    setSelectedContentIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }, [setSelectedContentIds]);

  const handleBulkAction = useCallback(async (action: string, selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
    if (!courseId) return;

    try {
      showToast(`Processing bulk ${action}...`, 'success');

      await Promise.all(selectedIds.map(async (id) => {
        let type = '';
        let item: any = null;

        if (videos.some(v => (v.id === id || (v as any)._id === id) && (item = v))) type = 'videos';
        else if (notes.some(n => (n.id === id || (n as any)._id === id) && (item = n))) type = 'notes';
        else if (tests.some(t => (t.id === id || (t as any)._id === id) && (item = t))) type = 'tests';
        else if (folders.some(f => f.id === id && (item = f))) type = 'folders';

        if (!type || !item) return;

        const itemId = item._id || item.id;
        const url = `${API_BASE_URL}/courses/${courseId}/${type}/${itemId}`;

        switch (action) {
          case 'delete':
            await fetch(url, { method: 'DELETE' });
            break;
          case 'enable':
            await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, status: 'active' })
            });
            break;
          case 'disable':
            await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, status: 'inactive' })
            });
            break;
          case 'mark_paid':
            await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, isFree: false })
            });
            break;
          case 'mark_free':
            await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, isFree: true })
            });
            break;
        }
      }));

      showToast(`Bulk action completed successfully`, 'success');
      loadCourseContent();
      setShowBulkActionDrawer(false);
    } catch (error) {
      console.error('Bulk action error:', error);
      showToast('Failed to perform bulk action', 'error');
    }
  }, [selectedCourse, videos, notes, tests, folders, API_BASE_URL, showToast, loadCourseContent, setShowBulkActionDrawer]);

  return {
    fetchAllCourses,
    fetchSourceCourseContent,
    handleImportAction,
    toggleContentSelection,
    handleBulkAction
  };
};
