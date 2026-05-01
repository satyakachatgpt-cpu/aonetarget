import { useCallback } from 'react';

interface Course {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  thumbnail?: string;
  price?: string | number;
  originalPrice?: string | number;
  categoryId?: string;
  status?: string;
  isPublished?: boolean;
}

interface Video {
  id: string;
  _id?: string;
  courseId?: string;
  title: string;
  description?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  url?: string;
  duration?: string;
  isFree: boolean;
  order: number;
  status: 'active' | 'inactive';
  folderId?: string;
  views?: string;
  datetime?: string;
  platform?: string;
  contentType?: string;
}

interface Note {
  id: string;
  _id?: string;
  courseId?: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileSize?: string;
  isFree: boolean;
  order: number;
  status: 'active' | 'inactive';
  folderId?: string;
  type?: string;
}

interface Test {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  duration?: number;
  totalMarks?: number;
  passingMarks?: number;
  numberOfQuestions?: number;
  marksPerQuestion?: number;
  negativeMarking?: number;
  openDate?: string;
  closeDate?: string;
  isFree: boolean;
  status: 'active' | 'inactive';
  folderId?: string;
  questions?: any[];
}

interface UseCourseContentTogglesProps {
  selectedCourse: Course | null;
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setTests: React.Dispatch<React.SetStateAction<Test[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  API_BASE_URL: string;
}

export const useCourseContentToggles = ({
  selectedCourse,
  setVideos,
  setNotes,
  setTests,
  showToast,
  API_BASE_URL
}: UseCourseContentTogglesProps) => {

  const handleToggleVideoStatus = useCallback(async (video: Video) => {
    try {
      const newStatus = video.status === 'active' ? 'inactive' : 'active';
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const videoId = (video as any)._id || video.id;
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...video, status: newStatus })
      });
      setVideos(prev => prev.map(v => ((v as any)._id || v.id) === videoId ? { ...v, status: newStatus } : v));
      showToast(newStatus === 'active' ? (video.contentType === 'youtube_zoom' || video.contentType === 'live_stream' ? 'Live stream enabled' : 'Video enabled') : (video.contentType === 'youtube_zoom' || video.contentType === 'live_stream' ? 'Live stream disabled' : 'Video disabled'));
    } catch { showToast('Failed to update status'); }
  }, [selectedCourse, setVideos, showToast, API_BASE_URL]);

  const handleToggleVideoFree = useCallback(async (video: Video) => {
    try {
      const newFree = !video.isFree;
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const videoId = (video as any)._id || video.id;
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...video, isFree: newFree })
      });
      setVideos(prev => prev.map(v => ((v as any)._id || v.id) === videoId ? { ...v, isFree: newFree } : v));
      showToast(newFree ? (video.contentType === 'youtube_zoom' || video.contentType === 'live_stream' ? 'Live stream set to Free' : 'Video set to Free') : (video.contentType === 'youtube_zoom' || video.contentType === 'live_stream' ? 'Live stream set to Locked' : 'Video set to Locked'));
    } catch { showToast('Failed to update'); }
  }, [selectedCourse, setVideos, showToast, API_BASE_URL]);

  const handleToggleNoteStatus = useCallback(async (note: Note) => {
    try {
      const newStatus = note.status === 'active' ? 'inactive' : 'active';
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const noteId = (note as any)._id || note.id;
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/courses/${courseId}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...note, status: newStatus })
      });
      setNotes(prev => prev.map(n => ((n as any)._id || n.id) === noteId ? { ...n, status: newStatus } : n));
      showToast(newStatus === 'active' ? 'Note enabled' : 'Note disabled');
    } catch { showToast('Failed to update status'); }
  }, [selectedCourse, setNotes, showToast, API_BASE_URL]);

  const handleToggleNoteFree = useCallback(async (note: Note) => {
    try {
      const newFree = !note.isFree;
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const noteId = (note as any)._id || note.id;
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/courses/${courseId}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...note, isFree: newFree })
      });
      setNotes(prev => prev.map(n => ((n as any)._id || n.id) === noteId ? { ...n, isFree: newFree } : n));
      showToast(newFree ? 'Note set to Free' : 'Note set to Locked');
    } catch { showToast('Failed to update'); }
  }, [selectedCourse, setNotes, showToast, API_BASE_URL]);

  const handleToggleTestStatus = useCallback(async (test: Test) => {
    try {
      const newStatus = test.status === 'active' ? 'inactive' : 'active';
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const testId = (test as any)._id || test.id;
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...test, status: newStatus })
      });
      setTests(prev => prev.map(t => ((t as any)._id || t.id) === testId ? { ...t, status: newStatus } : t));
      showToast(newStatus === 'active' ? 'Test enabled' : 'Test disabled');
    } catch { showToast('Failed to update status'); }
  }, [selectedCourse, setTests, showToast, API_BASE_URL]);

  const handleToggleTestFree = useCallback(async (test: Test) => {
    try {
      const newFree = !test.isFree;
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const testId = (test as any)._id || test.id;
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...test, isFree: newFree })
      });
      setTests(prev => prev.map(t => ((t as any)._id || t.id) === testId ? { ...t, isFree: newFree } : t));
      showToast(newFree ? 'Test set to Free' : 'Test set to Locked');
    } catch { showToast('Failed to update'); }
  }, [selectedCourse, setTests, showToast, API_BASE_URL]);

  return {
    handleToggleVideoStatus,
    handleToggleVideoFree,
    handleToggleNoteStatus,
    handleToggleNoteFree,
    handleToggleTestStatus,
    handleToggleTestFree
  };
};
