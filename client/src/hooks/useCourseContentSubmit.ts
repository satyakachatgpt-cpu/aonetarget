import { useCallback } from 'react';

interface UseCourseContentSubmitProps {
  selectedCourse: any;
  currentFolder: any;
  videos: any[];
  notes: any[];
  tests: any[];
  editingVideo: any;
  editingNote: any;
  editingTest: any;
  videoForm: any;
  noteForm: any;
  testForm: any;
  setShowVideoModal: (show: boolean) => void;
  setShowNoteModal: (show: boolean) => void;
  setShowTestModal: (show: boolean) => void;
  setEditingVideo: (item: any) => void;
  setEditingNote: (item: any) => void;
  setEditingTest: (item: any) => void;
  resetVideoForm: () => void;
  resetNoteForm: () => void;
  resetTestForm: () => void;
  loadCourseContent: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  normalizeId: (id: any) => string | null;
  getAuthHeaders: () => any;
  invalidateCache: (key: string) => void;
  API_BASE_URL: string;
  toYouTubeEmbed: (url: string) => string;
}

export const useCourseContentSubmit = ({
  selectedCourse,
  currentFolder,
  videos,
  notes,
  tests,
  editingVideo,
  editingNote,
  editingTest,
  videoForm,
  noteForm,
  testForm,
  setShowVideoModal,
  setShowNoteModal,
  setShowTestModal,
  setEditingVideo,
  setEditingNote,
  setEditingTest,
  resetVideoForm,
  resetNoteForm,
  resetTestForm,
  loadCourseContent,
  showToast,
  normalizeId,
  getAuthHeaders,
  invalidateCache,
  API_BASE_URL,
  toYouTubeEmbed
}: UseCourseContentSubmitProps) => {

  const handleVideoSubmit = useCallback(async (data?: any) => {
    const finalData = data || videoForm;
    if (!finalData.title || !selectedCourse) {
      showToast('Please fill in the video title', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const videoId = normalizeId((editingVideo as any)?._id || editingVideo?.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);

      const videoData = {
        ...finalData,
        id: videoId || `video_${Date.now()}`,
        courseId: courseId,
        folderId: folderId,
        url: toYouTubeEmbed(finalData.youtubeUrl || finalData.videoUrl || finalData.link || ''),
        youtubeUrl: toYouTubeEmbed(finalData.youtubeUrl || finalData.videoUrl || finalData.link || ''),
        platform: 'YouTube',
        status: 'active',
        isFree: finalData.status === 'Free' || finalData.isFree === true,
        order: parseInt(finalData.order?.toString() || '0') || videos.length + 1
      };

      const method = editingVideo ? 'PUT' : 'POST';
      const url = editingVideo
        ? `${API_BASE_URL}/courses/${courseId}/videos/${videoId}`
        : `${API_BASE_URL}/courses/${courseId}/videos`;

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });

      if (response.ok) {
        showToast(editingVideo ? 'Video updated!' : 'Video added!', 'success');
        invalidateCache('course-content');
        invalidateCache('study-dashboard');
        setShowVideoModal(false);
        setEditingVideo(null);
        resetVideoForm();
        setTimeout(() => loadCourseContent(), 300);
      } else {
        showToast('Failed to save video', 'error');
      }
    } catch (error) {
      showToast('Failed to save video', 'error');
    }
  }, [videoForm, selectedCourse, editingVideo, currentFolder, videos.length, API_BASE_URL, getAuthHeaders, showToast, normalizeId, toYouTubeEmbed, invalidateCache, setShowVideoModal, setEditingVideo, resetVideoForm, loadCourseContent]);

  const handleNoteSubmit = useCallback(async (data?: any) => {
    const finalData = data || noteForm;
    if (!finalData.title || !selectedCourse) {
      showToast('Please fill required fields (Title)', 'error');
      return;
    }

    try {
      const courseId = (selectedCourse as any)._id || selectedCourse.id;
      const noteId = (editingNote as any)?._id || editingNote?.id;
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);

      const noteData = {
        ...finalData,
        id: noteId || `note_${Date.now()}`,
        courseId: String(courseId),
        folderId: folderId,
        type: 'note',
        status: 'active',
        order: parseInt(finalData.order?.toString() || '0') || notes.length + 1
      };

      const method = editingNote ? 'PUT' : 'POST';
      const url = editingNote
        ? `${API_BASE_URL}/courses/${String(courseId)}/notes/${noteId}`
        : `${API_BASE_URL}/courses/${String(courseId)}/notes`;

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      if (response.ok) {
        showToast(editingNote ? 'Note updated!' : 'Note added!');
        invalidateCache('course-content');
        invalidateCache('study-dashboard');
        setShowNoteModal(false);
        setEditingNote(null);
        resetNoteForm();
        loadCourseContent();
      } else {
        showToast('Failed to save note', 'error');
      }
    } catch (error) {
      showToast('Failed to save note', 'error');
    }
  }, [noteForm, selectedCourse, editingNote, currentFolder, notes.length, API_BASE_URL, getAuthHeaders, showToast, normalizeId, invalidateCache, setShowNoteModal, setEditingNote, resetNoteForm, loadCourseContent]);

  const handleTestSubmit = useCallback(async (data?: any) => {
    const finalData = data || testForm;
    if (!finalData.name || !selectedCourse) {
      showToast('Please fill required fields (Name)', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const testId = normalizeId((editingTest as any)?._id || editingTest?.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);

      const testData = {
        ...finalData,
        id: testId || `test_${Date.now()}`,
        courseId: courseId,
        folderId: folderId,
        questions: editingTest?.questions || []
      };

      const method = editingTest ? 'PUT' : 'POST';
      const url = editingTest
        ? `${API_BASE_URL}/courses/${courseId}/tests/${testId}`
        : `${API_BASE_URL}/courses/${courseId}/tests`;

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        showToast(editingTest ? 'Test updated!' : 'Test added!', 'success');
        invalidateCache('course-content');
        invalidateCache('study-dashboard');
        setShowTestModal(false);
        setEditingTest(null);
        resetTestForm();
        loadCourseContent();
      } else {
        showToast('Failed to save test', 'error');
      }
    } catch (error) {
      showToast('Failed to save test', 'error');
    }
  }, [testForm, selectedCourse, editingTest, currentFolder, API_BASE_URL, getAuthHeaders, showToast, normalizeId, invalidateCache, setShowTestModal, setEditingTest, resetTestForm, loadCourseContent]);

  return {
    handleVideoSubmit,
    handleNoteSubmit,
    handleTestSubmit
  };
};
