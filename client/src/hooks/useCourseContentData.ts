import { useState, useCallback } from 'react';

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
  type?: string;
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
  datetime?: string;
}

interface Test {
  id: string;
  _id?: string;
  courseId?: string;
  name: string;
  description?: string;
  duration?: number;
  totalMarks?: number;
  passingMarks?: number;
  numberOfQuestions?: number;
  openDate?: string;
  closeDate?: string;
  isFree: boolean;
  status: 'active' | 'inactive';
  questions?: any[];
  marksPerQuestion?: number;
  negativeMarking?: number;
  order?: number;
  folderId?: string;
  title?: string;
  type?: string;
}

interface UseCourseContentDataProps {
  selectedCourse: any;
  normalizeId: (id: any) => string | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  getAuthHeaders: () => any;
  API_BASE_URL: string;
}

export const useCourseContentData = ({
  selectedCourse,
  normalizeId,
  showToast,
  getAuthHeaders,
  API_BASE_URL
}: UseCourseContentDataProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  const loadCourseContent = useCallback(async () => {
    if (!selectedCourse) return;
    const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
    if (!courseId) return;

    try {
      const t = Date.now();
      const headers = getAuthHeaders();
      const [videosRes, notesRes, testsRes, foldersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/courses/${courseId}/videos?t=${t}`, { headers }),
        fetch(`${API_BASE_URL}/courses/${courseId}/notes?t=${t}`, { headers }),
        fetch(`${API_BASE_URL}/courses/${courseId}/tests?t=${t}`, { headers }),
        fetch(`${API_BASE_URL}/courses/${courseId}/folders?t=${t}`, { headers })
      ]);

      const videosData = await videosRes.json().catch(() => []);
      const notesData = await notesRes.json().catch(() => []);
      const testsData = await testsRes.json().catch(() => []);
      const foldersData = await foldersRes.json().catch(() => []);

      setVideos(Array.isArray(videosData) ? videosData : []);
      setNotes(Array.isArray(notesData) ? notesData : []);
      setTests(Array.isArray(testsData) ? testsData : []);
      setFolders(Array.isArray(foldersData) ? foldersData : []);
    } catch (error) {
      console.error('Error loading course content:', error);
      showToast('Failed to refresh content', 'error');
    }
  }, [selectedCourse, normalizeId, showToast, getAuthHeaders, API_BASE_URL]);

  return {
    videos,
    setVideos,
    notes,
    setNotes,
    tests,
    setTests,
    folders,
    setFolders,
    loadCourseContent
  };
};
