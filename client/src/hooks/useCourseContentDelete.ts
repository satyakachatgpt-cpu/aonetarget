import { useCallback } from 'react';

interface UseCourseContentDeleteProps {
  selectedCourse: any;
  currentTestForQuestions: any;
  folders: any[];
  setFolders: React.Dispatch<React.SetStateAction<any[]>>;
  setVideos: React.Dispatch<React.SetStateAction<any[]>>;
  setNotes: React.Dispatch<React.SetStateAction<any[]>>;
  setTests: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentTestForQuestions: React.Dispatch<React.SetStateAction<any>>;
  loadCourseContent: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  normalizeId: (id: any) => string | null;
  getAuthHeaders: () => any;
  invalidateCache: (key: string) => void;
  API_BASE_URL: string;
}

export const useCourseContentDelete = ({
  selectedCourse,
  currentTestForQuestions,
  folders,
  setFolders,
  setVideos,
  setNotes,
  setTests,
  setCurrentTestForQuestions,
  loadCourseContent,
  showToast,
  normalizeId,
  getAuthHeaders,
  invalidateCache,
  API_BASE_URL
}: UseCourseContentDeleteProps) => {

  const handleDeleteVideo = useCallback(async (videoId: string) => {
    if (!selectedCourse || !confirm('Delete this video?')) return;
    try {
      const vId = normalizeId(videoId);
      setVideos(prev => prev.filter(v => normalizeId(v._id || v.id) !== vId));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${vId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('API Delete failed');
      invalidateCache('course-content');
      invalidateCache('study-dashboard');
      showToast('Video deleted!');
    } catch (error) {
      showToast('Failed to delete video', 'error');
      loadCourseContent();
    }
  }, [selectedCourse, API_BASE_URL, getAuthHeaders, showToast, normalizeId, setVideos, invalidateCache, loadCourseContent]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!selectedCourse || !confirm('Delete this note?')) return;
    try {
      const nId = normalizeId(noteId);
      setNotes(prev => prev.filter(n => normalizeId(n._id || n.id) !== nId));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/notes/${nId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('API Delete failed');
      invalidateCache('course-content');
      invalidateCache('study-dashboard');
      showToast('Note deleted!');
    } catch (error) {
      showToast('Failed to delete note', 'error');
      loadCourseContent();
    }
  }, [selectedCourse, API_BASE_URL, getAuthHeaders, showToast, normalizeId, setNotes, invalidateCache, loadCourseContent]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (!selectedCourse || !confirm('Delete this folder and all its content?')) return;
    try {
      const fId = normalizeId(folderId);

      const getNestedFolderIds = (id: string, allFolders: any[]): string[] => {
        let ids = [id];
        const children = allFolders.filter(f => normalizeId(f.parentId) === id);
        children.forEach(child => {
          const childId = normalizeId(child._id || child.id);
          if (childId) {
            ids = [...ids, ...getNestedFolderIds(childId, allFolders)];
          }
        });
        return ids;
      };

      const allIdsToRemove = getNestedFolderIds(fId!, folders);

      setFolders(prev => prev.filter(f => !allIdsToRemove.includes(normalizeId(f._id || f.id)!)));
      setVideos(prev => prev.filter(v => !allIdsToRemove.includes(normalizeId(v.folderId)!)));
      setNotes(prev => prev.filter(n => !allIdsToRemove.includes(normalizeId(n.folderId)!)));
      setTests(prev => prev.filter(t => !allIdsToRemove.includes(normalizeId(t.folderId)!)));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/folders/${fId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('API Delete failed');
      invalidateCache('course-content');
      invalidateCache('study-dashboard');
      showToast('Folder deleted!');
    } catch (error) {
      showToast('Failed to delete folder', 'error');
      loadCourseContent();
    }
  }, [selectedCourse, folders, API_BASE_URL, getAuthHeaders, showToast, normalizeId, setFolders, setVideos, setNotes, setTests, invalidateCache, loadCourseContent]);

  const handleDeleteTest = useCallback(async (testId: string) => {
    if (!selectedCourse || !confirm('Delete this test?')) return;
    try {
      const tId = normalizeId(testId);
      setTests(prev => prev.filter(t => normalizeId(t._id || t.id) !== tId));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${tId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('API Delete failed');
      invalidateCache('course-content');
      invalidateCache('study-dashboard');
      showToast('Test deleted!');
    } catch (error) {
      showToast('Failed to delete test', 'error');
      loadCourseContent();
    }
  }, [selectedCourse, API_BASE_URL, getAuthHeaders, showToast, normalizeId, setTests, invalidateCache, loadCourseContent]);

  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    if (!currentTestForQuestions || !selectedCourse || !confirm('Delete this question?')) return;
    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const testId = normalizeId((currentTestForQuestions as any)._id || currentTestForQuestions.id);
      const qId = normalizeId(questionId);
      const updatedQuestions = currentTestForQuestions.questions.filter((q: any) => normalizeId((q as any)._id || q.id) !== qId);
      
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${testId}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentTestForQuestions, questions: updatedQuestions })
      });
      
      if (!response.ok) throw new Error('API Update failed');
      
      showToast('Question deleted!');
      loadCourseContent();
      setCurrentTestForQuestions({ ...currentTestForQuestions, questions: updatedQuestions });
    } catch (error) {
      showToast('Failed to delete question', 'error');
    }
  }, [selectedCourse, currentTestForQuestions, API_BASE_URL, getAuthHeaders, showToast, normalizeId, loadCourseContent, setCurrentTestForQuestions]);

  return {
    handleDeleteVideo,
    handleDeleteNote,
    handleDeleteFolder,
    handleDeleteTest,
    handleDeleteQuestion
  };
};
