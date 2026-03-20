import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { coursesAPI, categoriesAPI, packagesAPI } from '../../services/apiClient';
import FileUploadButton from '../shared/FileUploadButton';
import AddCourse from './AddCourse';
import CourseGroupChat from './CourseGroupChat';
import CoursePosts from './CoursePosts';
import ForumManager from './ForumManager';
import AddFolderDrawer from './AddFolderDrawer';
import AddNoteDrawer from './AddNoteDrawer';
import AddVideoDrawer from './AddVideoDrawer';
import AddTestDrawer from './AddTestDrawer';
import AddQuestionDrawer from './AddQuestionDrawer';
import SubjectiveTestDrawer from './SubjectiveTestDrawer';
import {
  OMRTestDrawer,
  TestDrawer,
  QuizDrawer,
  UploadDrawer,
  LinkDrawer,
  ImportContentDrawer,
  VideoDrawer,
  LiveStreamDrawer,
  WebinarDrawer
} from './FeatureDrawers';
import BulkActionsDrawerComponent from './BulkActionsDrawer';


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
  questions?: Question[];
  marksPerQuestion?: number;
  negativeMarking?: number;
  order?: number;
  folderId?: string;
  title?: string;
}

interface Question {
  id: string;
  _id?: string;
  question: string;
  questionImage?: string;
  optionA: string;
  optionAImage?: string;
  optionB: string;
  optionBImage?: string;
  optionC: string;
  optionCImage?: string;
  optionD: string;
  optionDImage?: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  marks: number;
  negativeMarks?: number;
}

interface VideoForm {
  title: string;
  description: string;
  youtubeUrl: string;
  videoUrl: string;
  duration: string;
  isFree: boolean;
  order: number;
  status: 'active' | 'inactive';
}

interface YoutubeZoomForm {
  title: string;
  description: string;
  image: string;
  isFree: boolean;
  publishOn: string;
  link: string;
  streamStatus: string;
  pdf1: string;
  pdf2: string;
  studyMaterial: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  enableChat: boolean;
  enableQA: boolean;
  notifyStudents: boolean;
  allowDownload: boolean;
  autoArchive: boolean;
  quizId: string;
  chatVisibility: string;
  order: string;
}

interface WebinarForm {
  title: string;
  description: string;
  image: string;
  isFree: boolean;
  publishOn: string;
  link: string;
  streamStatus: string;
  pdf1: string;
  pdf2: string;
  studyMaterial: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  enableChat: boolean;
  quizId: string;
  allowDownload: boolean;
  chatVisibility: string;
  videoRestrictions: boolean;
  order: string;
}

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  initialCourse?: any;
  onClearInitialCourse?: () => void;
  onBack?: () => void;
  setActiveView?: (view: any) => void;
  initialMainTab?: string;
}

const API_BASE_URL = '/api';

const CourseContentManager: React.FC<Props> = ({ showToast, initialCourse, onClearInitialCourse, onBack, setActiveView, initialMainTab }) => {
  const [activeMainTab, setActiveMainTab] = useState(initialMainTab || 'Content');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'tests' | 'payments'>('videos');
  const [loading, setLoading] = useState(true);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [contentStatusFilter, setContentStatusFilter] = useState('all');
  const [isProductFilterOpen, setIsProductFilterOpen] = useState(false);
  const [isContentFilterOpen, setIsContentFilterOpen] = useState(false);
  const [folderStack, setFolderStack] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;

  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState<any>({ name: '', description: '', imageUrl: '', price: '0', categoryId: '' });
  const [courseCategories, setCourseCategories] = useState<any[]>([]);
  const [showCourseMoreOptions, setShowCourseMoreOptions] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [videoMode, setVideoMode] = useState<'upload' | 'link'>('link');

  useEffect(() => {
    categoriesAPI.getAll()
      .then(res => setCourseCategories(Array.isArray(res) ? res : []))
      .catch(() => { });
  }, []);

  const handleEditCourseClick = () => {
    if (!selectedCourse) return;
    setIsAddingCourse(selectedCourse);
  };

  const handleCourseEditSubmit = async () => {
    if (!courseFormData.name || !selectedCourse) {
      showToast('Name is required', 'error');
      return;
    }
    try {
      const courseId = (selectedCourse as any)._id || selectedCourse.id;
      const updatedData = {
        ...selectedCourse,
        ...courseFormData,
        price: courseFormData.price ? parseFloat(courseFormData.price) : 0,
        thumbnail: courseFormData.thumbnail || courseFormData.imageUrl || (selectedCourse as any).thumbnail
      };

      const isPackage = selectedCourse.id?.toString().startsWith('pkg_');
      console.log('--- UPDATE DEBUG ---');
      console.log('Course ID:', courseId);
      console.log('Is Package?', isPackage);
      console.log('Payload:', updatedData);

      if (isPackage) {
        console.log('Updating via packagesAPI...');
        await packagesAPI.update(courseId, updatedData);
      } else {
        console.log('Updating via coursesAPI...');
        await coursesAPI.update(courseId, updatedData);
      }

      showToast('Batch updated successfully', 'success');
      setShowCourseEditModal(false);
      // Update local state immediately
      if (selectedCourse) {
        setSelectedCourse({ ...selectedCourse, ...updatedData });
      }
      if (typeof (window as any).loadCourses === 'function') {
        (window as any).loadCourses();
      } else {
        // Fallback or just re-fetch if possible
        try { loadCourses(); } catch (e) { }
      }
    } catch (err: any) {
      console.error('Update failed details:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to update batch';
      showToast(msg, 'error');
    }
  };

  const handleCourseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();

      setCourseFormData(prev => ({
        ...prev,
        imageUrl: data.url,
        thumbnail: data.url
      }));
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('Failed to upload image', 'error');
    } finally {
      setImageUploadLoading(false);
    }
  };
  const [isPublished, setIsPublished] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isAddingCourse, setIsAddingCourse] = useState<any>(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    if (initialCourse) {
      setSelectedCourse(initialCourse);
      setIsPublished(initialCourse.status !== 'inactive' && initialCourse.isPublished !== false);
    }
  }, [initialCourse]);

  useEffect(() => {
    if (initialMainTab) {
      setActiveMainTab(initialMainTab);
    }
  }, [initialMainTab]);

  useEffect(() => {
    if (selectedCourse) {
      setIsPublished((selectedCourse as any).status !== 'inactive' && (selectedCourse as any).isPublished !== false);
      loadCourseContent();
    }
  }, [selectedCourse]);

  // Sync folderStack with fresh folder data from server
  useEffect(() => {
    if (folders.length > 0 && folderStack.length > 0) {
      const updatedStack = folderStack.map(stackFolder => {
        const freshFolder = folders.find(f => 
          (f._id && normalizeId(f._id) === normalizeId(stackFolder._id)) || 
          (f.id && normalizeId(f.id) === normalizeId(stackFolder.id))
        );
        return freshFolder || stackFolder;
      });
      
      const hasChanged = updatedStack.some((f, i) => f !== folderStack[i]);
      if (hasChanged) {
        setFolderStack(updatedStack);
      }
    }
  }, [folders]);

  const handleTogglePublish = async () => {
    if (!selectedCourse || publishLoading) return;
    const newStatus = !isPublished;
    setPublishLoading(true);
    try {
      const courseId = (selectedCourse as any)._id || selectedCourse.id;
      const endpoint = selectedCourse.id?.toString().startsWith('pkg_') ? 'packages' : 'courses';
      await fetch(`${API_BASE_URL}/${endpoint}/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: newStatus, status: newStatus ? 'active' : 'inactive' })
      });
      setIsPublished(newStatus);
      showToast(newStatus ? 'Batch published successfully!' : 'Batch unpublished successfully!');
    } catch (error) {
      showToast('Failed to update publish status');
    } finally {
      setPublishLoading(false);
    }
  };

  const handlePreview = () => {
    if (!selectedCourse) return;
    const courseId = (selectedCourse as any)._id || selectedCourse.id;
    window.open(`/#/course/${courseId}`, '_blank');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleVideoStatus = async (video: Video) => {
    try {
      const newStatus = video.status === 'active' ? 'inactive' : 'active';
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const videoId = (video as any)._id || video.id;
      await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...video, status: newStatus })
      });
      setVideos(prev => prev.map(v => ((v as any)._id || v.id) === videoId ? { ...v, status: newStatus } : v));
      showToast(newStatus === 'active' ? 'Video enabled' : 'Video disabled');
    } catch { showToast('Failed to update status'); }
  };

  const handleToggleVideoFree = async (video: Video) => {
    try {
      const newFree = !video.isFree;
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const videoId = (video as any)._id || video.id;
      await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...video, isFree: newFree })
      });
      setVideos(prev => prev.map(v => ((v as any)._id || v.id) === videoId ? { ...v, isFree: newFree } : v));
      showToast(newFree ? 'Video set to Free' : 'Video set to Locked');
    } catch { showToast('Failed to update'); }
  };

  const handleToggleNoteStatus = async (note: Note) => {
    try {
      const newStatus = note.status === 'active' ? 'inactive' : 'active';
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const noteId = (note as any)._id || note.id;
      await fetch(`${API_BASE_URL}/courses/${courseId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, status: newStatus })
      });
      setNotes(prev => prev.map(n => ((n as any)._id || n.id) === noteId ? { ...n, status: newStatus } : n));
      showToast(newStatus === 'active' ? 'Note enabled' : 'Note disabled');
    } catch { showToast('Failed to update status'); }
  };

  const handleToggleNoteFree = async (note: Note) => {
    try {
      const newFree = !note.isFree;
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const noteId = (note as any)._id || note.id;
      await fetch(`${API_BASE_URL}/courses/${courseId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, isFree: newFree })
      });
      setNotes(prev => prev.map(n => ((n as any)._id || n.id) === noteId ? { ...n, isFree: newFree } : n));
      showToast(newFree ? 'Note set to Free' : 'Note set to Locked');
    } catch { showToast('Failed to update'); }
  };

  const handleToggleTestStatus = async (test: Test) => {
    try {
      const newStatus = test.status === 'active' ? 'inactive' : 'active';
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const testId = (test as any)._id || test.id;
      await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...test, status: newStatus })
      });
      setTests(prev => prev.map(t => ((t as any)._id || t.id) === testId ? { ...t, status: newStatus } : t));
      showToast(newStatus === 'active' ? 'Test enabled' : 'Test disabled');
    } catch { showToast('Failed to update status'); }
  };

  const handleToggleTestFree = async (test: Test) => {
    try {
      const newFree = !test.isFree;
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const testId = (test as any)._id || test.id;
      await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...test, isFree: newFree })
      });
      setTests(prev => prev.map(t => ((t as any)._id || t.id) === testId ? { ...t, isFree: newFree } : t));
      showToast(newFree ? 'Test set to Free' : 'Test set to Locked');
    } catch { showToast('Failed to update'); }
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      youtubeUrl: video.youtubeUrl || '',
      videoUrl: video.videoUrl || '',
      duration: video.duration || '',
      status: video.status || 'active',
      isFree: video.isFree || false,
      order: video.order || 0,
    });
    setShowVideoModal(true);
  };

  const handleEditFolder = (folder: any) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      description: note.description || '',
      fileUrl: note.fileUrl || '',
      fileSize: note.fileSize || '',
      status: note.status || 'active',
      isFree: note.isFree || false,
      order: note.order || 0,
    });
    setShowNoteModal(true);
  };

  const handleEditTest = (test: Test) => {
    setEditingTest(test);
    setTestForm({
      name: test.name,
      description: test.description || '',
      duration: test.duration || 60,
      totalMarks: test.totalMarks || 100,
      passingMarks: test.passingMarks || 40,
      numberOfQuestions: test.numberOfQuestions || 0,
      marksPerQuestion: test.marksPerQuestion || 4,
      negativeMarking: test.negativeMarking || 0,
      openDate: test.openDate || '',
      closeDate: test.closeDate || '',
      isFree: test.isFree || false,
      status: test.status || 'active'
    });
    setShowTestModal(true);
  };

  const folderImageRef = useRef<HTMLInputElement>(null);
  const toggleContentSelection = (id: string) => {
    setSelectedContentIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action: string, selectedIds: string[]) => {
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
  };


  const handleFolderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setEditingFolder((prev: any) => prev ? { ...prev, thumbnail: data.url } : { thumbnail: data.url });
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Uploading video...', 'success');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setVideoForm(prev => ({ ...prev, videoUrl: data.url }));
      showToast(`Video "${file.name}" uploaded successfully`, 'success');
    } catch (error) {
      console.error('Video upload error:', error);
      showToast('Upload failed', 'error');
    }
  };

  const handleLiveStreamImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setLiveStreamForm(prev => ({ ...prev, image: data.url }));
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  };

  const handleLiveStreamFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'pdf1' | 'pdf2' | 'studyMaterial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setLiveStreamForm(prev => ({ ...prev, [field]: data.url }));
      showToast('File uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  };

  const handleYoutubeZoomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setYoutubeZoomForm(prev => ({ ...prev, image: data.url }));
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  };

  const handleYoutubeZoomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'pdf1' | 'pdf2' | 'studyMaterial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setYoutubeZoomForm(prev => ({ ...prev, [field]: data.url }));
      showToast('File uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  };

  const handleWebinarImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setWebinarForm(prev => ({ ...prev, image: data.url }));
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  };

  const handleWebinarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'pdf1' | 'pdf2' | 'studyMaterial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setWebinarForm(prev => ({ ...prev, [field]: data.url }));
      showToast('File uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  };

  const handleWebinarSubmit = async () => {
    if (!webinarForm.title || !webinarForm.link || !selectedCourse) {
      showToast('Please fill required fields', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);
      const webinarData = {
        ...webinarForm,
        title: webinarForm.title,
        description: webinarForm.description || '',
        thumbnail: webinarForm.image,
        courseId: courseId,
        folderId,
        contentType: 'webinar',
        type: 'video',
        url: webinarForm.link,
        status: 'active',
        isFree: webinarForm.isFree,
        publishOn: webinarForm.publishOn,
        order: webinarForm.order || '0.00',
        pdf1: webinarForm.pdf1,
        pdf2: webinarForm.pdf2,
        studyMaterial: webinarForm.studyMaterial,
        allowDownload: webinarForm.allowDownload,
        chatVisibility: webinarForm.chatVisibility,
        streamStatus: webinarForm.streamStatus,
        quizId: webinarForm.quizId
      };

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webinarData)
      });

      if (response.ok) {
        showToast('Webinar added successfully!', 'success');
        setShowWebinarModal(false);
        resetWebinarForm();
        loadCourseContent();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || 'Failed to save webinar', 'error');
      }
    } catch (error) {
      showToast('Failed to save webinar', 'error');
    }
  };

  const handleLiveStreamSubmit = async () => {
    if (!liveStreamForm.title || !selectedCourse) {
      showToast('Please fill required fields', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);
      const streamData = {
        title: liveStreamForm.title,
        description: liveStreamForm.description || '',
        thumbnail: liveStreamForm.image,
        courseId: courseId,
        folderId,
        contentType: 'live_stream',
        type: 'video',
        url: liveStreamForm.streamId, // Using streamId/URL for the video URL
        streamSource: liveStreamForm.streamSource,
        streamId: liveStreamForm.streamId,
        status: 'active',
        isFree: liveStreamForm.isFree,
        publishOn: liveStreamForm.publishOn,
        order: liveStreamForm.order || '0.00',
        pdf1: liveStreamForm.pdf1,
        pdf2: liveStreamForm.pdf2,
        studyMaterial: liveStreamForm.studyMaterial,
        allowDownload: liveStreamForm.allowDownload,
        chatVisibility: liveStreamForm.chatVisibility,
        enableChat: liveStreamForm.enableChat,
        enableAttendance: liveStreamForm.enableAttendance,
        notifyStudents: liveStreamForm.notifyStudents
      };

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamData)
      });

      if (response.ok) {
        showToast('Live stream added successfully!', 'success');
        setShowLiveStreamModal(false);
        resetLiveStreamForm();
        loadCourseContent();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || 'Failed to save live stream', 'error');
      }
    } catch (error) {
      showToast('Failed to save live stream', 'error');
    }
  };

  const handleYoutubeZoomSubmit = async () => {
    if (!youtubeZoomForm.title || !youtubeZoomForm.link || !selectedCourse) {
      showToast('Please fill required fields', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);
      const streamData = {
        ...youtubeZoomForm,
        title: youtubeZoomForm.title,
        description: youtubeZoomForm.description || '',
        thumbnail: youtubeZoomForm.image,
        courseId: courseId,
        folderId: folderId,
        contentType: 'youtube_zoom',
        type: 'video',
        url: youtubeZoomForm.link,
        status: 'active',
        isFree: youtubeZoomForm.isFree,
        publishOn: youtubeZoomForm.publishOn,
        order: youtubeZoomForm.order || '0.00',
        pdf1: youtubeZoomForm.pdf1,
        pdf2: youtubeZoomForm.pdf2,
        studyMaterial: youtubeZoomForm.studyMaterial,
        allowDownload: youtubeZoomForm.allowDownload,
        chatVisibility: youtubeZoomForm.chatVisibility,
        streamStatus: youtubeZoomForm.streamStatus,
        quizId: youtubeZoomForm.quizId
      };

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamData)
      });

      if (response.ok) {
        showToast('YouTube/Zoom live added successfully!', 'success');
        setShowYoutubeZoomModal(false);
        resetYoutubeZoomForm();
        loadCourseContent();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || 'Failed to save YouTube/Zoom live', 'error');
      }
    } catch (error) {
      showToast('Failed to save YouTube/Zoom live', 'error');
    }
  };


  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showLiveStreamModal, setShowLiveStreamModal] = useState(false);
  const [showYoutubeZoomModal, setShowYoutubeZoomModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showOMRModal, setShowOMRModal] = useState(false);
  const [showWebinarModal, setShowWebinarModal] = useState(false);
  const [showSubjectiveTestDrawer, setShowSubjectiveTestDrawer] = useState(false);
  const [subjectiveTestSearch, setSubjectiveTestSearch] = useState('');
  const [availableSubjectiveTests, setAvailableSubjectiveTests] = useState<any[]>([]);
  const [selectedSubjectiveList, setSelectedSubjectiveList] = useState<any[]>([]);
  const [isSubjectiveLoading, setIsSubjectiveLoading] = useState(false);
  const [showSubjectiveDropdown, setShowSubjectiveDropdown] = useState(false);
  const [testSeriesList, setTestSeriesList] = useState<any[]>([]);
  const [selectedTestSeries, setSelectedTestSeries] = useState('');
  const [isTestSeriesLoading, setIsTestSeriesLoading] = useState(false);
  const [omrTests, setOmrTests] = useState<any[]>([]);
  const [standardTests, setStandardTests] = useState<any[]>([]);
  const [isOMRTestsLoading, setIsOMRTestsLoading] = useState(false);
  const [isStandardTestsLoading, setIsStandardTestsLoading] = useState(false);
  const [testSeriesSearch, setTestSeriesSearch] = useState('');
  const [showTestSeriesDropdown, setShowTestSeriesDropdown] = useState(false);
  const [showAddTestDrawer, setShowAddTestDrawer] = useState(false);
  const [selectedAddTest, setSelectedAddTest] = useState('');
  const [selectedOMRTest, setSelectedOMRTest] = useState('');
  const [addTestSeriesSearch, setAddTestSeriesSearch] = useState('');
  const [showAddTestSeriesDropdown, setShowAddTestSeriesDropdown] = useState(false);
  const [addTestSelectedSeries, setAddTestSelectedSeries] = useState('');
  const [courseTestsBySeriesLoading, setCourseTestsBySeriesLoading] = useState(false);
  const [showOMRDrawer, setShowOMRDrawer] = useState(false);
  const [showTestDrawer, setShowTestDrawer] = useState(false);
  const [showQuizDrawer, setShowQuizDrawer] = useState(false);
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [showImageDrawer, setShowImageDrawer] = useState(false);
  const [showDocumentDrawer, setShowDocumentDrawer] = useState(false);
  const [showLinkDrawer, setShowLinkDrawer] = useState(false);
  const [showBulkActionDrawer, setShowBulkActionDrawer] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);


  const [activeLiveStreamTab, setActiveLiveStreamTab] = useState<'basic' | 'advanced'>('basic');
  const [showLiveStreamSEO, setShowLiveStreamSEO] = useState(false);

  const [activeYoutubeZoomTab, setActiveYoutubeZoomTab] = useState<'basic' | 'advanced'>('basic');
  const [showYoutubeZoomSEO, setShowYoutubeZoomSEO] = useState(false);

  const [activeWebinarTab, setActiveWebinarTab] = useState<'basic' | 'advanced'>('basic');

  const [importSearch, setImportSearch] = useState('');
  const [importSource, setImportSource] = useState('');
  const [selectedImportItems, setSelectedImportItems] = useState<string[]>([]);
  const [importItems, setImportItems] = useState<any[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);

  const [liveStreamForm, setLiveStreamForm] = useState({
    title: '',
    description: '',
    image: '',
    isFree: false,
    publishOn: '2026-03-02T10:15',
    pdf1: '',
    pdf2: '',
    studyMaterial: '',
    allowPdfExport: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    streamSource: 'YouTube',
    streamId: '',
    enableChat: true,
    enableAttendance: false,
    notifyStudents: true,
    allowDownload: false,
    chatVisibility: 'Everyone',
    order: '0.00'
  });

  const [youtubeZoomForm, setYoutubeZoomForm] = useState<YoutubeZoomForm>({
    title: '',
    description: '',
    image: '',
    isFree: false,
    publishOn: '2026-02-26 10:35',
    link: '',
    streamStatus: 'Live',
    pdf1: '',
    pdf2: '',
    studyMaterial: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    enableChat: true,
    enableQA: false,
    notifyStudents: true,
    allowDownload: false,
    autoArchive: true,
    quizId: '',
    chatVisibility: 'Everyone',
    order: '0.00'
  });

  const [webinarForm, setWebinarForm] = useState<WebinarForm>({
    title: '',
    description: '',
    image: '',
    isFree: false,
    publishOn: '2026-03-02 10:15',
    link: '',
    streamStatus: 'Live',
    pdf1: '',
    pdf2: '',
    studyMaterial: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    enableChat: true,
    quizId: '',
    allowDownload: false,
    chatVisibility: 'Everyone',
    videoRestrictions: false,
    order: '0.00'
  });

  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const liveStreamImageRef = useRef<HTMLInputElement>(null);
  const liveStreamPdf1Ref = useRef<HTMLInputElement>(null);
  const liveStreamPdf2Ref = useRef<HTMLInputElement>(null);
  const liveStreamStudyMaterialRef = useRef<HTMLInputElement>(null);

  const youtubeZoomImageRef = useRef<HTMLInputElement>(null);
  const youtubeZoomPdf1Ref = useRef<HTMLInputElement>(null);
  const youtubeZoomPdf2Ref = useRef<HTMLInputElement>(null);
  const youtubeZoomStudyMaterialRef = useRef<HTMLInputElement>(null);

  const webinarImageRef = useRef<HTMLInputElement>(null);
  const webinarPdf1Ref = useRef<HTMLInputElement>(null);
  const webinarPdf2Ref = useRef<HTMLInputElement>(null);
  const webinarStudyMaterialRef = useRef<HTMLInputElement>(null);

  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editingFolder, setEditingFolder] = useState<any>(null);

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [currentTestForQuestions, setCurrentTestForQuestions] = useState<Test | null>(null);

  useEffect(() => {
    const isModalOpen = showVideoModal || showNoteModal || showTestModal || showFolderModal || showLiveStreamModal || showYoutubeZoomModal || showImportModal || showQuestionModal || showDocumentModal || showAudioModal || showOMRModal || showWebinarModal || showSubjectiveTestDrawer;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showVideoModal, showNoteModal, showTestModal, showFolderModal, showLiveStreamModal, showYoutubeZoomModal, showImportModal, showQuestionModal, showDocumentModal, showAudioModal, showOMRModal, showWebinarModal, showSubjectiveTestDrawer]);

  useEffect(() => {
    if (showImportModal) {
      fetchAllCourses();
    }
  }, [showImportModal]);

  useEffect(() => {
    if (showTestDrawer || showOMRDrawer) {
      fetchTestSeriesList();
    }
  }, [showTestDrawer, showOMRDrawer]);

  const fetchAllCourses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/courses`);
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const fetchTestSeriesList = async () => {
    setIsTestSeriesLoading(true);
    try {
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id || 'global';
      // Fetch series specifically for this course
      const res = await fetch(`${API_BASE_URL}/test-series?courseId=${courseId}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      if (list.length === 0) {
        // Mock relevance to current course
        const coursePrefix = selectedCourse?.name || selectedCourse?.title || 'Main Batch';
        const mockList = [
          { id: `1-${courseId}`, seriesName: `${coursePrefix} Concepts Series`, title: `${coursePrefix} Concepts Series` },
          { id: `2-${courseId}`, seriesName: `${coursePrefix} Advanced Mock`, title: `${coursePrefix} Advanced Mock` },
          { id: `3-${courseId}`, seriesName: `Global Practice Series`, title: `Global Practice Series` }
        ];
        setTestSeriesList(mockList);
      } else {
        setTestSeriesList(list);
      }
    } catch (error) {
      console.error('Failed to load test series:', error);
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id || 'global';
      setTestSeriesList([
        { id: `1-${courseId}`, seriesName: `Practice Test Series`, title: `Practice Test Series` },
        { id: `2-${courseId}`, seriesName: `Full Length Mock`, title: `Full Length Mock` }
      ]);
    } finally {
      setIsTestSeriesLoading(false);
    }
  };

  const fetchTestsBySeries = async (seriesId: string, type: 'standard' | 'omr' = 'standard') => {
    if (!seriesId) return;
    const setLoading = type === 'omr' ? setIsOMRTestsLoading : setIsStandardTestsLoading;
    const setData = type === 'omr' ? setOmrTests : setStandardTests;

    setLoading(true);
    try {
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      // Fetch specifically by type and course
      const res = await fetch(`${API_BASE_URL}/tests?seriesId=${seriesId}&courseId=${courseId}&testType=${type}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      // Strict course filter
      let finalTests = list.filter((t: any) =>
        t.courseId === courseId || t.id.startsWith(`test_${courseId}`)
      );

      // Mock behavior support (Separate mock data for standard vs omr)
      if (finalTests.length === 0 && seriesId.includes(courseId as string)) {
        const coursePrefix = selectedCourse?.name || 'Test';
        if (type === 'omr') {
          finalTests = [
            { id: `omr1-${courseId}`, name: `${coursePrefix} OMR Sheet 1` },
            { id: `omr2-${courseId}`, name: `${coursePrefix} OMR Mock 2` }
          ];
        } else {
          finalTests = [
            { id: `std1-${courseId}`, name: `${coursePrefix} Chapter Test A` },
            { id: `std2-${courseId}`, name: `${coursePrefix} Unit Test B` }
          ];
        }
      }

      setData(finalTests);
    } catch (error) {
      console.error('Failed to load tests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (importSource) {
      fetchSourceCourseContent(importSource);
    } else {
      setImportItems([]);
    }
  }, [importSource]);

  const fetchSourceCourseContent = async (courseId: string) => {
    setIsImportLoading(true);
    try {
      // In a real database, we would fetch content based on courseId
      const [videosRes, notesRes, testsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/courses/${courseId}/videos`),
        fetch(`${API_BASE_URL}/courses/${courseId}/notes`),
        fetch(`${API_BASE_URL}/courses/${courseId}/tests`)
      ]);
      const videos = await videosRes.json();
      const notes = await notesRes.json();
      const tests = await testsRes.json();

      // Mock behavior matching screenshot 3 if API returns empty
      let allItems = [
        ...Array.isArray(videos) ? videos.map(vid => ({ ...vid, id: vid._id || vid.id, type: 'video' })) : [],
        ...Array.isArray(notes) ? notes.map(note => ({ ...note, id: note._id || note.id, type: 'note' })) : [],
        ...Array.isArray(tests) ? tests.map(test => ({ ...test, id: test._id || test.id, type: 'test' })) : []
      ];

      if (allItems.length === 0) {
        // High-fidelity mock content for "Hindi Batch" or similar
        allItems = [
          { id: 'm-1', title: 'Verb Test Result', type: 'test' },
          { id: 'm-2', title: 'Verb Test-1', type: 'test' },
          { id: 'm-3', title: 'English Grammar', type: 'folder' },
          { id: 'm-4', title: 'Spoken', type: 'folder' },
          { id: 'm-5', title: 'How to attempt test on Vatican App', type: 'video' },
          { id: 'm-6', title: 'How to view Live And Recorded Class in Vatican App', type: 'video' },
          { id: 'm-7', title: 'How to download pdf', type: 'video' },
          { id: 'm-8', title: 'Introduction of the batch by Neha maam', type: 'video' },
          { id: 'm-9', title: 'Verb Class And Practice', type: 'video' },
          { id: 'm-10', title: 'Day -3 Does', type: 'video' }
        ];
      }
      setImportItems(allItems);
    } catch (error) {
      console.error('Failed to load course content:', error);
    } finally {
      setIsImportLoading(false);
    }
  };



  const [videoForm, setVideoForm] = useState<VideoForm>({
    title: '',
    description: '',
    youtubeUrl: '',
    videoUrl: '',
    duration: '',
    isFree: false,
    order: 0,
    status: 'active'
  });

  const [noteForm, setNoteForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileSize: '',
    isFree: false,
    order: 0,
    status: 'active' as 'active' | 'inactive'
  });

  const [testForm, setTestForm] = useState({
    name: '',
    description: '',
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
    numberOfQuestions: 0,
    marksPerQuestion: 4,
    negativeMarking: 0,
    openDate: '',
    closeDate: '',
    isFree: false,
    status: 'active' as 'active' | 'inactive'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [questionForm, setQuestionForm] = useState({
    question: '',
    questionImage: '',
    optionA: '',
    optionAImage: '',
    optionB: '',
    optionBImage: '',
    optionC: '',
    optionCImage: '',
    optionD: '',
    optionDImage: '',
    correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
    marks: 4,
    negativeMarks: 0
  });

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '',
      questionImage: '',
      optionA: '',
      optionAImage: '',
      optionB: '',
      optionBImage: '',
      optionC: '',
      optionCImage: '',
      optionD: '',
      optionDImage: '',
      correctAnswer: 'A',
      explanation: '',
      marks: 4,
      negativeMarks: 0
    });
    setEditingQuestion(null);
  };

  const fetchSubjectiveTests = async (query: string) => {
    if (query.length < 2) {
      setAvailableSubjectiveTests([]);
      setShowSubjectiveDropdown(false);
      return;
    }
    setIsSubjectiveLoading(true);
    setShowSubjectiveDropdown(true);
    try {
      const res = await fetch(`${API_BASE_URL}/subjective-tests?search=${query}`);
      const data = await res.json();
      setAvailableSubjectiveTests(Array.isArray(data) ? data : []);
    } catch (error) {
      // Mock fallback for UI demo
      setAvailableSubjectiveTests([
        { id: 'st1', title: 'English Essay Writing' },
        { id: 'st2', title: 'Calculus Advanced Quiz' },
        { id: 'st3', title: 'Indian History Long Form' }
      ].filter(t => t.title.toLowerCase().includes(query.toLowerCase())));
    } finally {
      setIsSubjectiveLoading(false);
    }
  };

  const handleAddSubjectiveTest = (test: any) => {
    if (!selectedSubjectiveList.some(t => (t._id || t.id) === (test._id || test.id))) {
      setSelectedSubjectiveList(prev => [...prev, test]);
    }
    setSubjectiveTestSearch('');
    setShowSubjectiveDropdown(false);
  };

  const handleRemoveSubjectiveTest = (testId: string) => {
    setSelectedSubjectiveList(prev => prev.filter(t => (t._id || t.id) !== testId));
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseContent();
    }
  }, [selectedCourse]);

  useEffect(() => {
    const fetchSourceContent = async () => {
      if (!importSource) {
        setImportItems([]);
        return;
      }
      setIsImportLoading(true);
      try {
        const [videosRes, notesRes, testsRes, foldersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/courses/${importSource}/videos`),
          fetch(`${API_BASE_URL}/courses/${importSource}/notes`),
          fetch(`${API_BASE_URL}/courses/${importSource}/tests`),
          fetch(`${API_BASE_URL}/courses/${importSource}/folders`)
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
    };

    fetchSourceContent();
  }, [importSource]);

  const handleImportAction = async (action: 'move' | 'copy') => {
    if (!selectedCourse || !importSource || selectedImportItems.length === 0) {
      showToast('Please select source course and items', 'error');
      return;
    }

    try {
      const targetCourseId = (selectedCourse as any)._id || selectedCourse.id;

      const response = await fetch(`${API_BASE_URL}/courses/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCourseId: importSource,
          targetCourseId,
          itemIds: selectedImportItems,
          action
        })
      });

      if (!response.ok) throw new Error('Action failed');

      showToast(`${selectedImportItems.length} item(s) ${action}ed successfully`, 'success');
      setShowImportModal(false);
      setImportSource('');
      setImportItems([]);
      setSelectedImportItems([]);
      loadCourseContent();
    } catch (error) {
      console.error(`Import ${action} error:`, error);
      showToast(`Failed to ${action} items`, 'error');
    }
  };

  const loadCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const normalizeId = (id: any): string | null => {
    if (id === null || id === undefined) return null;
    if (typeof id === 'string') {
      const s = id.trim();
      if (s === 'null' || s === 'undefined' || s === '') return null;
      return s;
    }
    if (typeof id === 'object') {
      // Handle MongoDB $oid
      if (id.$oid) return String(id.$oid);
      
      // Handle nested _id if the object itself is passed
      if (id._id) return normalizeId(id._id);
      
      // Handle objects with an id property
      if ((id as any).id && typeof (id as any).id === 'string') return (id as any).id;
      
      if (id.toString && typeof id.toString === 'function') {
        const str = id.toString();
        // If toString is just the generic object string, it's not a valid ID
        if (str !== '[object Object]') return str;
      }
    }
    // Final fallback: try to get a string, but if it's useless, return null
    const finalStr = String(id);
    return (finalStr === '[object Object]' || finalStr === 'null' || finalStr === 'undefined') ? null : finalStr;
  };

  const filteredCourses = courses.filter(course => {
    const name = course.name || course.title || '';
    const matchesSearch = name.toLowerCase().includes(productSearchQuery.toLowerCase());
    const matchesStatus = productStatusFilter === 'all' ||
      (productStatusFilter === 'active' ? course.status === 'active' : course.status === 'inactive');

    const matchesCategory = productCategoryFilter === 'all';

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const loadCourseContent = async () => {
    if (!selectedCourse) return;
    const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
    if (!courseId) return;

    try {
      const t = Date.now();
      const [videosRes, notesRes, testsRes, foldersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/courses/${courseId}/videos?t=${t}`),
        fetch(`${API_BASE_URL}/courses/${courseId}/notes?t=${t}`),
        fetch(`${API_BASE_URL}/courses/${courseId}/tests?t=${t}`),
        fetch(`${API_BASE_URL}/courses/${courseId}/folders?t=${t}`)
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
  };

  const currentFolderId = normalizeId(currentFolder?._id || currentFolder?.id);

  const filteredVideos = videos.filter(v => {
    const matchesSearch = (v.title || '').toLowerCase().includes(contentSearchQuery.toLowerCase());
    const matchesStatus = contentStatusFilter === 'all' || v.status === contentStatusFilter;
    const vFolderId = normalizeId(v.folderId);
    
    // Check against all possible current folder IDs
    const matchesFolder = vFolderId === currentFolderId || 
                         (vFolderId && currentFolder?._id && vFolderId === normalizeId(currentFolder._id)) ||
                         (vFolderId && currentFolder?.id && vFolderId === normalizeId(currentFolder.id));
    
    // Always show root items if both are null
    const finalMatchesFolder = (vFolderId === null && currentFolderId === null) ? true : matchesFolder;
    
    return matchesSearch && matchesStatus && finalMatchesFolder;
  });

  const filteredNotes = notes.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(contentSearchQuery.toLowerCase());
    const matchesStatus = contentStatusFilter === 'all' || n.status === contentStatusFilter;
    const nFolderId = normalizeId(n.folderId);
    const matchesFolder = nFolderId === currentFolderId || 
                         (nFolderId && currentFolder?._id && nFolderId === normalizeId(currentFolder._id)) ||
                         (nFolderId && currentFolder?.id && nFolderId === normalizeId(currentFolder.id));
    return matchesSearch && matchesStatus && matchesFolder;
  });

  const filteredTestsList = tests.filter(t => {
    const name = t.name || (t as any).title || '';
    const matchesSearch = name.toLowerCase().includes(contentSearchQuery.toLowerCase());
    const matchesStatus = contentStatusFilter === 'all' || t.status === contentStatusFilter;
    const tFolderId = normalizeId(t.folderId);
    const matchesFolder = tFolderId === currentFolderId || 
                         (tFolderId && currentFolder?._id && tFolderId === normalizeId(currentFolder._id)) ||
                         (tFolderId && currentFolder?.id && tFolderId === normalizeId(currentFolder.id));
    return matchesSearch && matchesStatus && matchesFolder;
  });

  const filteredFolders = folders.filter(f => {
    const matchesSearch = (f.title || '').toLowerCase().includes(contentSearchQuery.toLowerCase());
    const matchesStatus = contentStatusFilter === 'all' || f.status === contentStatusFilter;
    const fParentId = normalizeId(f.parentId);
    const matchesParent = fParentId === currentFolderId || 
                         (fParentId && currentFolder?._id && fParentId === normalizeId(currentFolder._id)) ||
                         (fParentId && currentFolder?.id && fParentId === normalizeId(currentFolder.id));
    return matchesSearch && matchesStatus && matchesParent;
  });

  const combinedItems = [
    ...filteredFolders.map(f => ({ ...f, type: 'folder', order: f.order || f.sortingOrder })),
    ...filteredVideos.map(v => ({ ...v, type: 'video', order: v.order })),
    ...filteredNotes.map(n => ({ ...n, type: 'note', order: n.order })),
    ...filteredTestsList.map(t => ({ ...t, type: 'test', order: t.order || 0 })),
  ].sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));

  const extractYouTubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const handleVideoSubmit = async (data?: any) => {
    const finalData = data || videoForm;
    // Basic validation: title is required, and either a youtubeUrl OR a videoUrl (file) must be present
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
        url: finalData.videoUrl || finalData.youtubeUrl || finalData.link || '',
        platform: finalData.videoUrl ? 'Upload' : (finalData.youtubeUrl ? 'YouTube' : 'YouTube'),
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });

      if (response.ok) {
        showToast(editingVideo ? 'Video updated!' : 'Video added!', 'success');
        setShowVideoModal(false);
        setEditingVideo(null);
        resetVideoForm();
        // Small delay to ensure DB consistency before refresh
        setTimeout(() => loadCourseContent(), 300);
      } else {
        showToast('Failed to save video', 'error');
      }
    } catch (error) {
      showToast('Failed to save video', 'error');
    }
  };

  const uploadFolderImage = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url;
    } catch (error) {
       console.error('Folder image upload error:', error);
       showToast('Failed to upload image', 'error');
       throw error;
    }
  };

  const handleFolderSubmit = async (data: any) => {
    if (!data.name || !selectedCourse) {
      showToast('Name is required', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const folderId = normalizeId((editingFolder as any)?._id || editingFolder?.id);
      const parentIdVal = currentFolder?._id || currentFolder?.id || null;
      const parentId = normalizeId(parentIdVal);

      const folderData = {
        title: data.name,
        description: data.description || '',
        thumbnail: data.thumbnail || '',
        isFree: data.status === 'Free',
        status: 'active',
        sortingOrder: data.sortingOrder || '0.00',
        parentId: parentId,
        courseId: courseId
      };

      const method = editingFolder ? 'PUT' : 'POST';
      const url = editingFolder
        ? `${API_BASE_URL}/courses/${courseId}/folders/${folderId}`
        : `${API_BASE_URL}/courses/${courseId}/folders`;

      console.log(`Submitting folder: ${method} ${url}`, folderData);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });

      if (response.ok) {
        showToast(editingFolder ? 'Folder updated!' : 'Folder added!', 'success');
        setShowFolderModal(false);
        setEditingFolder(null);
        loadCourseContent();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Folder save failed:', errorData);
        showToast(errorData.error || 'Failed to save folder', 'error');
      }
    } catch (error) {
      console.error('Folder error:', error);
      showToast('Failed to save folder', 'error');
    }
  };

  const handleNoteSubmit = async (data?: any) => {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      if (response.ok) {
        showToast(editingNote ? 'Note updated!' : 'Note added!');
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
  };

  const handleFilesUpload = async (files: File[], type: 'note' | 'audio' | 'image' | 'document') => {
    if (!selectedCourse || files.length === 0) return;
    const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
    const folderIdVal = currentFolder?._id || currentFolder?.id || null;
    const folderId = normalizeId(folderIdVal);

    showToast(`Uploading ${files.length} file(s)...`, 'success');

    try {
      await Promise.all(files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();

        const fileData = {
          ...data,
          title: file.name,
          description: '',
          fileUrl: data.url,
          fileSize: (file.size / 1024).toFixed(2) + ' KB',
          isFree: false,
          status: 'active',
          order: notes.length + 1,
          folderId: folderId,
          courseId: courseId,
          type: type,
          id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };

        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fileData)
        });

        if (!response.ok) throw new Error('Note save failed');
      }));

      showToast(`Finished uploading ${files.length} file(s)`, 'success');
      loadCourseContent();
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload files', 'error');
    }
  };

  const handleTestSubmit = async (data?: any) => {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        showToast(editingTest ? 'Test updated!' : 'Test added!', 'success');
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
  };

  const handleQuestionSubmit = async (data?: any) => {
    const finalData = data || questionForm;
    if (!finalData.question || !currentTestForQuestions || !selectedCourse) {
      if (!data) showToast('Please fill required fields', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const testId = normalizeId((currentTestForQuestions as any)._id || currentTestForQuestions.id);
      const questionId = normalizeId((editingQuestion as any)?._id || editingQuestion?.id);

      const questionData = {
        id: questionId || `q_${Date.now()}`,
        ...finalData
      };

      const updatedQuestions = editingQuestion
        ? currentTestForQuestions.questions.map(q => normalizeId((q as any)._id || q.id) === questionId ? questionData : q)
        : [...(currentTestForQuestions.questions || []), questionData];

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentTestForQuestions, questions: updatedQuestions })
      });

      if (response.ok) {
        showToast(editingQuestion ? 'Question updated!' : 'Question added!', 'success');
        setShowQuestionModal(false);
        setEditingQuestion(null);
        resetQuestionForm();
        loadCourseContent();
        setCurrentTestForQuestions({ ...currentTestForQuestions, questions: updatedQuestions });
      } else {
        showToast('Failed to save question', 'error');
      }
    } catch (error) {
      showToast('Failed to save question', 'error');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!selectedCourse || !confirm('Delete this video?')) return;
    try {
      // Optimistic Update
      const vId = normalizeId(videoId);
      setVideos(prev => prev.filter(v => normalizeId(v._id || v.id) !== vId));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${vId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('API Delete failed');
      showToast('Video deleted!');
    } catch (error) {
      showToast('Failed to delete video', 'error');
      loadCourseContent(); // Revert on failure
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedCourse || !confirm('Delete this note?')) return;
    try {
      const nId = normalizeId(noteId);
      // Optimistic Update
      setNotes(prev => prev.filter(n => normalizeId(n._id || n.id) !== nId));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/notes/${nId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('API Delete failed');
      showToast('Note deleted!');
    } catch (error) {
      showToast('Failed to delete note', 'error');
      loadCourseContent();
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!selectedCourse || !confirm('Delete this folder and all its content?')) return;
    try {
      const fId = normalizeId(folderId);
      // Optimistic Update
      setFolders(prev => prev.filter(f => normalizeId(f._id || f.id) !== fId));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/folders/${fId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('API Delete failed');
      showToast('Folder deleted!');
    } catch (error) {
      showToast('Failed to delete folder', 'error');
      loadCourseContent();
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!selectedCourse || !confirm('Delete this test?')) return;
    try {
      const tId = normalizeId(testId);
      // Optimistic Update
      setTests(prev => prev.filter(t => normalizeId(t._id || t.id) !== tId));

      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${tId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('API Delete failed');
      showToast('Test deleted!');
    } catch (error) {
      showToast('Failed to delete test', 'error');
      loadCourseContent();
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!currentTestForQuestions || !selectedCourse || !confirm('Delete this question?')) return;
    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const testId = normalizeId((currentTestForQuestions as any)._id || currentTestForQuestions.id);
      const qId = normalizeId(questionId);
      const updatedQuestions = currentTestForQuestions.questions.filter(q => normalizeId((q as any)._id || q.id) !== qId);
      await fetch(`${API_BASE_URL}/courses/${courseId}/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentTestForQuestions, questions: updatedQuestions })
      });
      showToast('Question deleted!');
      loadCourseContent();
      setCurrentTestForQuestions({ ...currentTestForQuestions, questions: updatedQuestions });
    } catch (error) {
      showToast('Failed to delete question', 'error');
    }
  };

  const resetVideoForm = () => {
    setVideoForm({ title: '', description: '', youtubeUrl: '', videoUrl: '', duration: '', isFree: false, order: 0, status: 'active' });
    setEditingVideo(null);
  };

  const resetNoteForm = () => {
    setNoteForm({ title: '', description: '', fileUrl: '', fileSize: '', isFree: false, order: 0, status: 'active' });
    setEditingNote(null);
  };

  const resetTestForm = () => {
    setTestForm({ name: '', description: '', duration: 60, totalMarks: 100, passingMarks: 40, numberOfQuestions: 0, marksPerQuestion: 4, negativeMarking: 0, openDate: '', closeDate: '', isFree: false, status: 'active' });
    setEditingTest(null);
  };

  const resetLiveStreamForm = () => {
    setLiveStreamForm({
      title: '',
      description: '',
      image: '',
      isFree: false,
      publishOn: '2026-03-02T10:15',
      pdf1: '',
      pdf2: '',
      studyMaterial: '',
      allowPdfExport: '',
      slug: '',
      seoTitle: '',
      seoDescription: '',
      streamSource: 'YouTube',
      streamId: '',
      enableChat: true,
      enableAttendance: false,
      notifyStudents: true,
      allowDownload: false,
      chatVisibility: 'Everyone',
      order: '0.00'
    });
  };

  const resetYoutubeZoomForm = () => {
    setYoutubeZoomForm({
      title: '',
      description: '',
      image: '',
      isFree: false,
      publishOn: '2026-02-26 10:35',
      link: '',
      streamStatus: 'Live',
      pdf1: '',
      pdf2: '',
      studyMaterial: '',
      slug: '',
      seoTitle: '',
      seoDescription: '',
      enableChat: true,
      enableQA: false,
      notifyStudents: true,
      allowDownload: false,
      autoArchive: true,
      quizId: '',
      chatVisibility: 'Everyone',
      order: '0.00'
    });
  };

  const resetWebinarForm = () => {
    setWebinarForm({
      title: '',
      description: '',
      image: '',
      isFree: false,
      publishOn: '2026-03-02 10:15',
      link: '',
      streamStatus: 'Live',
      pdf1: '',
      pdf2: '',
      studyMaterial: '',
      slug: '',
      seoTitle: '',
      seoDescription: '',
      enableChat: true,
      quizId: '',
      allowDownload: false,
      chatVisibility: 'Everyone',
      videoRestrictions: false,
      order: '0.00'
    });
  };

  
  const toggleFolder = (folderItem: any) => {
    setFolderStack(prev => [...prev, folderItem]);
  };

  const getFilteredFlatItems = () => {
    const flatFolders = folders.map(f => ({ ...f, type: 'folder', order: f.order || f.sortingOrder }));
    const flatVideos = videos.map(v => ({ ...v, type: 'video', order: v.order }));
    const flatNotes = notes.map(n => ({ ...n, type: 'note', order: n.order }));
    const flatTests = tests.map(t => ({ ...t, type: 'test', order: t.order || 0 }));
    
    return [...flatFolders, ...flatVideos, ...flatNotes, ...flatTests]
      .filter(item => {
        const matchesSearch = (item.title || item.name || '').toLowerCase().includes(contentSearchQuery.toLowerCase());
        const matchesStatus = contentStatusFilter === 'all' || item.status === contentStatusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));
  };

  const renderContentItem = (item: any, level: number) => {
    const isFolder = item.type === 'folder';
    const isVideo = item.type === 'video';
    const isNote = item.type === 'note';
    const isTest = item.type === 'test';
    const itemId = normalizeId(item._id || item.id);
    const isExpanded = itemId ? expandedFolders.includes(itemId) : false;

    // Check if this folder is the active folder for uploads
    const isActiveUploadFolder = isFolder && currentFolder && normalizeId(currentFolder._id || currentFolder.id) === itemId;

    return (
      <React.Fragment key={itemId + '_' + level}>
        <div
          onClick={() => isFolder && toggleFolder(item)}
          style={{ marginLeft: `${level * 24}px` }}
          className={`bg-white border ${isActiveUploadFolder ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-gray-50'} rounded-[12px] py-4 px-4 flex items-center gap-4 group hover:bg-gray-50/50 transition-all ${isFolder ? 'cursor-pointer' : ''} mb-3`}
        >
          {/* Drag Handle */}
          <div className="text-gray-300 shrink-0 flex items-center gap-1">
            <span className="material-symbols-outlined text-[20px] cursor-grab">drag_indicator</span>
          </div>

          {/* Thumbnail/Icon Container */}
          <div className={`w-[100px] h-[64px] rounded-[10px] overflow-hidden relative flex items-center justify-center shrink-0 border border-gray-100 ${isNote ? 'bg-[#fff7ed]' :
            isTest ? 'bg-[#f0fdf4]' :
              isFolder ? 'bg-white' :
                isVideo && item.platform === 'YouTube/Zoom Live' ? 'bg-[#fdf2ff]' : 'bg-[#eff6ff]'
            }`}>
            {item.thumbnail || item.image ? (
              <img src={item.thumbnail || item.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className={`material-symbols-outlined text-[28px] ${isNote ? 'text-[#f97316]' :
                isTest ? 'text-[#22c55e]' :
                  isFolder ? 'text-[#3b82f6]' :
                    isVideo && item.platform === 'YouTube/Zoom Live' ? 'text-[#d946ef]' : 'text-[#3b82f6]'
                }`}>
                {isNote ? 'description' :
                  isTest ? 'assignment' :
                    isFolder ? (isExpanded ? 'folder_open' : 'folder') :
                      isVideo && item.platform === 'YouTube/Zoom Live' ? 'live_tv' : 'play_circle'}
              </span>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-[#1a1a1a] text-[15px] truncate">
              {item.title || item.name}
            </h4>
            <div className="flex flex-col mt-0.5">
              <span className="text-[12px] text-gray-500 font-medium">
                {isFolder ? (() => {
                  const fId = item.id || item._id;
                  const vCount = videos.filter(v => normalizeId(v.folderId) === normalizeId(fId)).length;
                  const nCount = notes.filter(n => normalizeId(n.folderId) === normalizeId(fId)).length;
                  const tCount = tests.filter(t => normalizeId(t.folderId) === normalizeId(fId)).length;
                  const counts = [];
                  if (vCount > 0) counts.push(`${vCount} Videos`);
                  if (nCount > 0) counts.push(`${nCount} Notes`);
                  if (tCount > 0) counts.push(`${tCount} Tests`);
                  return counts.length > 0 ? counts.join(', ') : 'Empty Folder';
                })() :
                  isVideo ? (item.datetime ? `Duration: ${item.duration || 'N/A'}, Views: ${item.views ?? item.viewCount ?? 0}, Date & Time: ${item.datetime}` : `Duration: ${item.duration || 'N/A'}, Views: ${item.views ?? item.viewCount ?? 0}`) :
                    `Date & Time: ${item.datetime || '09:31 AM 06th March 2026'}`}
              </span>
            </div>
            <div className="mt-2.5 px-3 py-0.5 rounded-full text-[10px] font-bold text-gray-500 bg-gray-100 w-fit">
              {isNote ? 'PDF' : isTest ? 'Test' : isFolder ? 'Folder' : isVideo && item.platform === 'YouTube/Zoom Live' ? 'YouTube/Zoom Live' : isVideo ? 'Video' : 'Content'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                showToast('Status updated', 'success');
              }}
              className={`w-[36px] h-[20px] rounded-full relative cursor-pointer flex items-center transition-all ${item.status === 'active' ? 'bg-[#1a1c1e]' : 'bg-gray-200'}`}
            >
              <div className={`absolute ${item.status === 'active' ? 'right-[2px]' : 'left-[2px]'} w-[16px] h-[16px] bg-white rounded-full shadow-sm`}></div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                showToast('Access updated', 'success');
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900"
            >
              <span className="material-symbols-outlined text-[18px]">
                {item.isFree ? 'lock_open' : 'lock'}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isFolder) handleEditFolder(item);
                else if (isVideo) handleEditVideo(item);
                else if (isNote) handleEditNote(item);
                else if (isTest) handleEditTest(item);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const id = item._id || item.id;
                if (isFolder) handleDeleteFolder(id);
                else if (isVideo) handleDeleteVideo(id);
                else if (isNote) handleDeleteNote(id);
                else if (isTest) handleDeleteTest(id);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
        

      </React.Fragment>
    );
  };

  const renderAccordionTree = (parentId: string | null = null, level: number = 0) => {
    const levelFolders = folders.filter(f => normalizeId(f.parentId) === parentId).map(f => ({ ...f, type: 'folder', order: f.order || f.sortingOrder }));
    const levelVideos = videos.filter(v => normalizeId(v.folderId) === parentId).map(v => ({ ...v, type: 'video', order: v.order }));
    const levelNotes = notes.filter(n => normalizeId(n.folderId) === parentId).map(n => ({ ...n, type: 'note', order: n.order }));
    const levelTests = tests.filter(t => normalizeId(t.folderId) === parentId).map(t => ({ ...t, type: 'test', order: t.order || 0 }));

    // Separate folders and other items to ensure folders always appear at the top
    const items = [
      ...levelFolders.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
      ...[...levelVideos, ...levelNotes, ...levelTests].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    ];

    const filteredItems = items.filter(item => {
        const matchesSearch = (item.title || item.name || '').toLowerCase().includes(contentSearchQuery.toLowerCase());
        const matchesStatus = contentStatusFilter === 'all' || item.status === contentStatusFilter;
        return matchesSearch && matchesStatus;
    });

    return filteredItems.map(item => renderContentItem(item, level));
  };

  const finalRenderedItems = contentSearchQuery.trim() !== '' 
     ? getFilteredFlatItems().map(item => renderContentItem(item, 0)) 
     : renderAccordionTree(currentFolderId, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }

  if (isAddingCourse) {
    return (
      <AddCourse
        courseData={typeof isAddingCourse === 'object' ? isAddingCourse : undefined}
        onClose={() => {
          setIsAddingCourse(false);
          loadCourses();
        }}
      />
    );
  }

  if (!selectedCourse) {
    return (
      <div className="space-y-4 animate-fade-in pb-10">
        {/* Top Navigation Tabs */}
        <div className="bg-white px-8 border-b border-gray-100 flex items-center gap-10 overflow-x-auto scrollbar-hide">
          {['Products', 'Live & Upcoming', 'Forum', 'Content'].map((tab) => (
            <button
              key={tab}
              onClick={() => showToast(`${tab} view coming soon`)}
              className={`py-4 text-[13px] font-black transition-all relative shrink-0 ${tab === 'Products' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab}
              {tab === 'Products' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-950 rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-1">
          {/* Section Header & Action Bar */}
          <div className="p-4 flex items-center justify-between bg-white border-b border-gray-50">
            <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">Products</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="bg-gray-50/30 border border-gray-200 pl-10 pr-10 py-2 rounded-lg text-[13px] font-medium w-[280px] outline-none focus:bg-white focus:border-gray-300 transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsProductFilterOpen(!isProductFilterOpen)}
                  className={`flex items-center gap-2 px-6 py-2 border rounded-xl text-[12px] font-black uppercase tracking-wider transition-all shadow-sm ${isProductFilterOpen ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  Filters
                </button>

                {isProductFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Product Filters</h4>
                      <button onClick={() => { setProductStatusFilter('all'); setProductCategoryFilter('all'); setIsProductFilterOpen(false); }} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Publish Status</label>
                        <div className="flex flex-col gap-1">
                          {['all', 'active', 'inactive'].map((status) => (
                            <button
                              key={status}
                              onClick={() => { setProductStatusFilter(status); setIsProductFilterOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${productStatusFilter === status ? 'bg-navy/5 text-navy' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                              {status === 'all' ? 'All Products' : status === 'active' ? 'Published Only' : 'Drafts Only'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsAddingCourse(true)}
                className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[24px]">add</span>
              </button>
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${isMoreOpen ? 'bg-gray-100 text-gray-900 border-gray-200' : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>

                {/* Pixel-Perfect Dropdown Menu */}
                {isMoreOpen && (
                  <div className="absolute right-0 top-[48px] w-[220px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] z-[100] border border-gray-100 py-6 animate-in fade-in zoom-in duration-200 origin-top-right">
                    {/* Table View Section */}
                    <div className="px-6 mb-6">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Table View</p>
                      <div className="flex items-center gap-5">
                        <button
                          onClick={() => { setViewMode('list'); setIsMoreOpen(false); }}
                          className={`transition-colors ${viewMode === 'list' ? 'text-gray-900' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: viewMode === 'list' ? "'FILL' 1" : "''" }}>list</span>
                        </button>
                        <button
                          onClick={() => { setViewMode('grid'); setIsMoreOpen(false); }}
                          className={`transition-colors ${viewMode === 'grid' ? 'text-gray-900' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: viewMode === 'grid' ? "'FILL' 1" : "''" }}>grid_view</span>
                        </button>
                      </div>
                    </div>

                    <div className="h-[1px] bg-gray-50 mb-6 mx-6"></div>

                    {/* Bulk Actions Section */}
                    <div className="">
                      <p className="px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Bulk Actions</p>

                      <div className="space-y-1">
                        {[
                          { icon: 'folder', label: 'Add Folder', action: () => setShowFolderModal(true) },
                          { icon: 'link', label: 'Import Content', action: () => setShowImportModal(true) },
                          { icon: 'videocam', label: 'Add Video', action: () => setShowVideoModal(true) },
                          { icon: 'description', label: 'Add PDF', action: () => setShowDocumentModal(true) },
                          { icon: 'assignment', label: 'Add Test', action: () => { fetchTestSeriesList(); setShowTestDrawer(true); } },
                          { icon: 'rule', label: 'Subjective Test', action: () => setShowSubjectiveTestDrawer(true) },
                          { icon: 'note_add', label: 'Add Document/Note', action: () => setShowNoteModal(true) },
                          { icon: 'smart_display', label: 'Add YouTube/Zoom Video', action: () => setShowYoutubeZoomModal(true) },
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            className="w-full flex items-center gap-4 px-6 py-2.5 hover:bg-gray-50 transition-colors group text-left"
                            onClick={() => { setIsMoreOpen(false); item.action(); }}
                          >
                            <span className="material-symbols-outlined text-[20px] text-blue-400 group-hover:text-blue-500 transition-colors">
                              {item.icon}
                            </span>
                            <span className="text-[14px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Content Section */}
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#fcfcfc] border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">S. No.</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center justify-between w-full">
                        Course Name
                        <span className="material-symbols-outlined text-[14px] text-gray-200">unfold_more</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center justify-between w-full">
                        Category
                        <span className="material-symbols-outlined text-[14px] text-gray-200">unfold_more</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Price</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCourses.map((course, index) => {
                    const isPublished = (course as any).isPublished === true || (course as any).status === 'active';
                    const coursePrice = (course as any).price;
                    const priceDisplay = coursePrice !== undefined && coursePrice !== null && coursePrice !== '' && Number(coursePrice) > 0
                      ? `₹${Number(coursePrice).toLocaleString('en-IN')}`
                      : 'Free';
                    const categoryName = (course as any).categoryName ||
                      (courseCategories.find((c: any) => c.id === (course as any).categoryId || c._id === (course as any).categoryId)?.title) ||
                      (course as any).categoryId ||
                      '—';
                    return (
                      <tr key={course.id} className="group hover:bg-blue-50/10 transition-colors cursor-pointer" onClick={() => setSelectedCourse(course)}>
                        <td className="px-6 py-4 text-[13px] font-bold text-gray-500">{filteredCourses.length - index}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-gray-900 group-hover:text-blue-600 transition-colors">{course.name || course.title}</span>
                            {!isPublished && (
                              <span className="mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black uppercase rounded w-fit tracking-wider">Unpublished</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-gray-500 leading-relaxed block max-w-[240px]">
                            {categoryName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-black text-gray-900">{priceDisplay}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isPublished
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            {isPublished ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === course.id ? null : course.id);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all border ${openActionMenuId === course.id ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-700 border-gray-100 hover:border-gray-300'}`}
                            >
                              Actions
                              <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${openActionMenuId === course.id ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {openActionMenuId === course.id && (
                              <div
                                className="absolute right-0 top-full mt-2 w-[180px] bg-white rounded-2xl shadow-2xl z-[100] border border-gray-100 py-3 animate-in fade-in zoom-in duration-200 origin-top-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCourse(course);
                                    handleEditCourseClick();
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left"
                                >
                                  <span className="material-symbols-outlined text-[20px] text-blue-400">edit_square</span>
                                  <span className="text-[13px] font-bold">Edit Details</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePublish();
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left"
                                >
                                  <span className="material-symbols-outlined text-[20px] text-amber-400">{isPublished ? 'visibility_off' : 'visibility'}</span>
                                  <span className="text-[13px] font-bold">{isPublished ? 'Unpublish' : 'Publish'}</span>
                                </button>
                                <div className="h-px bg-gray-50 my-2 mx-3"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to delete this course?')) {
                                      showToast('Deleting course...', 'success');
                                      // Implement actual delete logic if available
                                    }
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all text-left group"
                                >
                                  <span className="material-symbols-outlined text-[20px] text-red-300 group-hover:text-red-500">delete</span>
                                  <span className="text-[13px] font-bold">Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 bg-gray-50/30">
              {filteredCourses.map((course, index) => {
                const isPublished = (course as any).isPublished === true || (course as any).status === 'active';
                const coursePrice = (course as any).price;
                const priceDisplay = coursePrice !== undefined && coursePrice !== null && coursePrice !== '' && Number(coursePrice) > 0
                  ? `₹${Number(coursePrice).toLocaleString('en-IN')}`
                  : 'Free';
                return (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className="bg-white rounded-[2rem] border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-2xl flex items-center justify-center border border-blue-50 shadow-sm">
                        <span className="material-symbols-outlined text-blue-600 text-[28px]">inventory_2</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); handleEditCourseClick(); }}
                          className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                      </div>
                    </div>
                    <h4 className="text-[17px] font-black text-gray-900 mb-2 uppercase tracking-tight">{course.name || course.title}</h4>
                    <p className="text-[13px] text-gray-400 font-medium mb-6 line-clamp-2">{(course as any).description ? (course as any).description.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : `Complete ${course.name || course.title} course with videos, notes, and tests.`}</p>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-5">
                      <span className="text-[16px] font-black text-gray-900">{priceDisplay}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg tracking-widest ${isPublished ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 animate-fade-in pb-10 min-h-screen bg-[#f5f6f8]">
      {/* Top Navigation Bar - Compact */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                setSelectedCourse(null);
                if (onClearInitialCourse) onClearInitialCourse();
              }
            }}
            className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 rounded-full transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[22px] text-gray-400">arrow_back</span>
          </button>
          <span className="material-symbols-outlined text-gray-400 text-[20px]">info</span>
          <div>
            <h2 className="text-[17px] font-bold text-gray-900 tracking-tight leading-none">{selectedCourse.name || selectedCourse.title || 'Batch'}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[18px]">north_east</span>
            Preview
          </button>
          <button
            onClick={handleTogglePublish}
            disabled={publishLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 bg-black text-white hover:bg-gray-800 disabled:opacity-60`}
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            {publishLoading ? 'Saving...' : isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="bg-white px-8 flex items-center gap-10 border-b border-gray-100">
        {['Overview', 'Content', 'Forum', 'Chat', 'Posts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveMainTab(tab)}
            className={`py-4 text-[14px] font-bold transition-all relative shrink-0 ${activeMainTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab}
            {activeMainTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      {activeMainTab === 'Content' ? (
        <div className="flex gap-6 px-6 py-4 max-w-[1600px] mx-auto">
          {/* Left Content Area */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-6 py-4 px-2">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3 mb-1">
                  {folderStack.length > 0 && (
                    <button 
                      onClick={() => setFolderStack(folderStack.slice(0, -1))}
                      className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                  )}
                  <h3 className="text-[20px] font-bold text-[#1a1a1a] tracking-tight">Batch Content</h3>
                </div>
                {currentFolder ? (
                   <p className="text-[12px] font-medium text-blue-600 flex items-center gap-1 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">folder_open</span>
                      {currentFolder.title || currentFolder.name}
                   </p>
                ) : (
                    <p className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">Adding content to root</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group flex items-center">
                  <input
                    type="text"
                    placeholder="Search"
                    value={contentSearchQuery}
                    onChange={(e) => setContentSearchQuery(e.target.value)}
                    className="w-[300px] h-[44px] bg-white border border-gray-200 pl-4 pr-10 text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-400 rounded-[10px]"
                  />
                </div>

                <button
                  onClick={() => setIsContentFilterOpen(!isContentFilterOpen)}
                  className="w-[44px] h-[44px] flex items-center justify-center bg-white border border-gray-200 rounded-[10px] text-gray-400 hover:bg-gray-50 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </button>

                <button className="w-[44px] h-[44px] flex items-center justify-center bg-white border border-gray-200 rounded-[10px] text-gray-400 hover:bg-gray-50 transition-all">
                  <span className="material-symbols-outlined text-[20px]">swap_vert</span>
                </button>

                <button
                  onClick={() => setShowBulkActionDrawer(true)}
                  className="flex items-center gap-2 h-[44px] px-4 bg-white border border-gray-200 rounded-[10px] text-gray-600 font-bold text-[14px] hover:bg-gray-50 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px] rotate-12">bolt</span>
                  Bulk Action
                </button>
              </div>
            </div>


            <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 space-y-3">
                {finalRenderedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-4xl text-gray-200">dashboard_customize</span>
                    </div>
                    <p className="text-gray-400 font-bold text-[14px]">No content items found</p>
                  </div>
                ) : (
                  finalRenderedItems
                )}
                {finalRenderedItems.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <p className="text-[13px] font-medium text-gray-400">You've seen all the items in the list.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: ADD CONTENT */}
          <div className="w-[300px] shrink-0">
            <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm">
              <div className="px-6 py-4">
                <h4 className="text-[12px] font-bold text-gray-900 uppercase tracking-tight">ADD CONTENT</h4>
              </div>
              <div className="pb-4">
                {[
                  { label: 'Folder', icon: 'folder', onClick: () => { setEditingFolder(null); setShowFolderModal(true); } },
                  { label: 'Video', icon: 'play_circle', onClick: () => { resetVideoForm(); setShowVideoModal(true); } },
                  { label: 'PDF', icon: 'description', onClick: () => setShowDocumentDrawer(true) },
                  { label: 'YouTube/Zoom Live', icon: 'videocam', onClick: () => setShowYoutubeZoomModal(true) },
                  { label: 'Test', icon: 'assignment', onClick: () => { fetchTestSeriesList(); setShowTestDrawer(true); } },
                  { label: 'Subjective Test', icon: 'description', onClick: () => setShowSubjectiveTestDrawer(true) },
                  { label: 'Image', icon: 'image', onClick: () => setShowImageDrawer(true) },
                  { label: 'Link', icon: 'open_in_new', onClick: () => setShowLinkDrawer(true) },
                  { label: 'Document', icon: 'article', onClick: () => setShowDocumentModal(true) },
                  { label: 'Import Content', icon: 'download', onClick: () => setShowImportModal(true) }
                ].map((item: { label: string; icon: string; onClick: () => void }, idx) => (
                  <button
                    key={idx}
                    onClick={item.onClick}
                    className="w-full px-6 py-2 flex items-center gap-3 hover:bg-gray-50 transition-all group text-left"
                  >
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-gray-900 transition-colors">{item.icon}</span>
                    </div>
                    <span className="text-[13px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeMainTab === 'Overview' && selectedCourse ? (
        <div className="p-6 max-w-[1200px] mx-auto animate-fade-in transition-all">
          <div className="bg-white rounded-[24px] border border-[#f0f1f3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="p-8 flex items-start gap-8">
              {/* Course Thumbnail */}
              <div className="w-[180px] h-[120px] bg-[#f8fafc] rounded-2xl overflow-hidden border border-[#f1f5f9] shrink-0 shadow-sm relative group">
                {selectedCourse.thumbnail ? (
                  <img src={selectedCourse.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
                    <span className="material-symbols-outlined text-blue-400 text-[40px]">school</span>
                    <span className="text-[10px] font-black text-blue-500 mt-2 uppercase tracking-widest">No Image</span>
                  </div>
                )}
              </div>

              {/* Course Details */}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <h2 className="text-[24px] font-black text-[#111827] tracking-tight leading-tight">
                      {selectedCourse.name || selectedCourse.title}
                    </h2>
                    <p className="text-[15px] font-bold text-[#64748b] tracking-tight">
                      {selectedCourse.title || selectedCourse.name} - Live Classes!
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-[22px] font-black text-[#111827]">₹{selectedCourse.price}</span>
                        {selectedCourse.originalPrice && (
                          <>
                            <span className="text-[14px] font-bold text-[#94a3b8] line-through decoration-2">₹{selectedCourse.originalPrice}</span>
                            <span className="text-[14px] font-black text-[#22c55e] uppercase tracking-wide">
                              {Math.round((1 - (Number(selectedCourse.price) / Number(selectedCourse.originalPrice))) * 100)}% OFF
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[14px] font-medium text-[#475569] leading-relaxed max-w-[800px]">
                    <p className={showFullDesc ? "" : "line-clamp-2"}>
                      {selectedCourse.description ?
                        selectedCourse.description.replace(/<[^>]*>/g, '') :
                        "Complete course management with videos, notes, and tests integrated into one bundle. This course is designed to provide comprehensive learning."
                      }
                    </p>
                    <button
                      onClick={() => setShowFullDesc(!showFullDesc)}
                      className="text-[#6366f1] font-bold mt-2 hover:text-[#4f46e5] transition-colors"
                    >
                      {showFullDesc ? "Show less" : "Show more"}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${isPublished ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]' : 'bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5]'}`}>
                      {isPublished ? 'Published' : 'Draft'}
                    </span>
                    <button
                      onClick={handleEditCourseClick}
                      className="flex items-center gap-2 px-6 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all duration-200 shadow-sm active:scale-95 ml-auto relative z-20 cursor-pointer">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeMainTab === 'Chat' && selectedCourse ? (
        <CourseGroupChat />
      ) : activeMainTab === 'Forum' && selectedCourse ? (
        <ForumManager courseId={(selectedCourse as any)._id || selectedCourse.id} />
      ) : activeMainTab === 'Posts' && selectedCourse ? (
        <CoursePosts courseId={(selectedCourse as any)._id || selectedCourse.id} />
      ) : activeMainTab !== 'Content' && selectedCourse ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm mx-6 mt-6">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-gray-300">construction</span>
          </div>
          <p className="text-gray-400 font-semibold text-sm">{activeMainTab} section is under development</p>
          <p className="text-gray-300 text-xs mt-1">This feature will be available soon</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-16 text-center mx-6 mt-6 border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-gray-300">construction</span>
          </div>
          <p className="text-gray-400 font-semibold text-sm">This section is under development</p>
        </div>
      )
      }
      {/* Portals removed */}


      {/* OMR Portal removed */}


      {/* Add Test(s) Drawer — course-specific tests */}
      {/* AddTest Portal removed */}



      {/* --- ADD LIVE STREAM DRAWER --- */}
      {
        showLiveStreamModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex justify-end">
            <div
              className="absolute inset-0 bg-black/50 animate-fade-in transition-opacity"
              onClick={() => { setShowLiveStreamModal(false); }}
            />
            <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 shrink-0">
                <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">Add Live Stream</h3>
                <button
                  onClick={() => { setShowLiveStreamModal(false); }}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 shrink-0">
                <button
                  onClick={() => setActiveLiveStreamTab('basic')}
                  className={`flex-1 flex items-center justify-center py-5 text-[15px] font-bold transition-all relative ${activeLiveStreamTab === 'basic' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Basic
                </button>
                <div className="w-[1px] bg-gray-100 my-4" />
                <button
                  onClick={() => setActiveLiveStreamTab('advanced')}
                  className={`flex-1 flex items-center justify-center py-5 text-[15px] font-bold transition-all relative ${activeLiveStreamTab === 'advanced' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Advanced
                </button>
              </div>

              {/* Content Area - Scrollable */}
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 pb-40">
                {activeLiveStreamTab === 'basic' && (
                  <div className="space-y-10">
                    {/* Live Stream Details Section */}
                    <div className="space-y-8">
                      <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Live Stream Details</h4>

                      {/* Title */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Title <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={liveStreamForm.title}
                          onChange={(e) => setLiveStreamForm({ ...liveStreamForm, title: e.target.value })}
                          className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300"
                          placeholder=""
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Description</label>
                        <textarea
                          value={liveStreamForm.description}
                          onChange={(e) => setLiveStreamForm({ ...liveStreamForm, description: e.target.value })}
                          className="w-full px-5 py-4 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all min-h-[140px] resize-none"
                          placeholder="Enter Live Stream Description"
                        />
                      </div>

                      {/* Image Upload */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                        <div className="flex gap-4">
                          <input type="file" ref={liveStreamImageRef} className="hidden" accept="image/*" onChange={handleLiveStreamImageUpload} />
                          <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-2 shrink-0 border border-gray-100 overflow-hidden relative group">
                            {liveStreamForm.image ? (
                              <img src={liveStreamForm.image} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[40px] text-[#8e8e8e]">image</span>
                                <span className="text-[14px] font-bold text-[#8e8e8e]">No Image</span>
                              </>
                            )}
                          </div>
                          <div
                            onClick={() => liveStreamImageRef.current?.click()}
                            className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                          >
                            <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload Image</h4>
                            <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Checkbox-style Toggle */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Status</label>
                        <div className="flex bg-[#f8f8f8] p-1.5 rounded-[12px] w-full border border-gray-100">
                          <button
                            onClick={() => setLiveStreamForm({ ...liveStreamForm, isFree: true })}
                            className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${liveStreamForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            Free
                          </button>
                          <button
                            onClick={() => setLiveStreamForm({ ...liveStreamForm, isFree: false })}
                            className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${!liveStreamForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            Paid
                          </button>
                        </div>
                      </div>

                      {/* Publish On */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Publish On <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type="datetime-local"
                            value={liveStreamForm.publishOn}
                            onChange={(e) => setLiveStreamForm({ ...liveStreamForm, publishOn: e.target.value })}
                            className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none"
                          />
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[22px] pointer-events-none">calendar_today</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Content Section */}
                    <div className="space-y-8 pt-6 border-t border-gray-50">
                      <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Additional Content</h4>

                      {/* Attach PDF 1 */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attach PDF</label>
                        <div className="flex gap-4">
                          <input type="file" ref={liveStreamPdf1Ref} className="hidden" accept="application/pdf" onChange={(e) => handleLiveStreamFileUpload(e, 'pdf1')} />
                          <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden text-center px-4">
                            <span className="material-symbols-outlined text-[36px] text-[#8e8e8e]">help</span>
                            <span className="text-[13px] font-bold text-[#8e8e8e] truncate w-full">
                              No PDF
                            </span>
                          </div>
                          <div
                            onClick={() => liveStreamPdf1Ref.current?.click()}
                            className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                          >
                            <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload PDF</h4>
                            <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                          </div>
                        </div>
                      </div>

                      {/* Attach PDF 2 */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attach PDF</label>
                        <div className="flex gap-4">
                          <input type="file" ref={liveStreamPdf2Ref} className="hidden" accept="application/pdf" onChange={(e) => handleLiveStreamFileUpload(e, 'pdf2')} />
                          <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden text-center px-4">
                            <span className="material-symbols-outlined text-[36px] text-[#8e8e8e]">help</span>
                            <span className="text-[13px] font-bold text-[#8e8e8e] truncate w-full">
                              No PDF
                            </span>
                          </div>
                          <div
                            onClick={() => liveStreamPdf2Ref.current?.click()}
                            className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                          >
                            <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload PDF</h4>
                            <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                          </div>
                        </div>
                      </div>

                      {/* Study Material */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Study Material</label>
                        <div className="flex gap-4">
                          <input type="file" ref={liveStreamStudyMaterialRef} className="hidden" accept="*" onChange={(e) => handleLiveStreamFileUpload(e, 'studyMaterial')} />
                          <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden text-center px-4">
                            <span className="material-symbols-outlined text-[36px] text-[#8e8e8e]">help</span>
                            <span className="text-[13px] font-bold text-[#8e8e8e] truncate w-full">
                              No File
                            </span>
                          </div>
                          <div
                            onClick={() => liveStreamStudyMaterialRef.current?.click()}
                            className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                          >
                            <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload File</h4>
                            <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                          </div>
                        </div>
                      </div>

                      {/* Allow PDF Export */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Allow PDF Export</label>
                        <div className="relative">
                          <select
                            value={liveStreamForm.allowPdfExport}
                            onChange={(e) => setLiveStreamForm({ ...liveStreamForm, allowPdfExport: e.target.value })}
                            className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                            <option value="Password">Save with password</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[24px] pointer-events-none">expand_more</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeLiveStreamTab === 'advanced' && (
                  <div className="space-y-10">
                    <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Advanced Settings</h4>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 max-w-[320px]">
                        <p className="text-[15px] font-bold text-gray-800 tracking-tight">In App download</p>
                        <p className="text-[12px] text-gray-400 font-medium leading-relaxed font-bold tracking-tight">Switch ON if you want the users to be able to download the video</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer mt-1 mr-[-5px]">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={liveStreamForm.allowDownload}
                          onChange={(e) => setLiveStreamForm({ ...liveStreamForm, allowDownload: e.target.checked })}
                        />
                        <div className="w-[44px] h-[24px] bg-gray-200 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Live Chat Message Visibility</label>
                      <select
                        value={liveStreamForm.chatVisibility}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, chatVisibility: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none"
                      >
                        <option value="Everyone">Everyone</option>
                        <option value="Only Host and Self">Only Host and Self</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Sorting Order</label>
                      <input
                        type="text"
                        value={liveStreamForm.order}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, order: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Bottom Button */}
              <div className="absolute bottom-0 left-0 right-0 p-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] bg-white">
                <button
                  className="w-full h-[70px] bg-[#1a1c1e] text-white text-[16px] font-bold tracking-tight hover:bg-black transition-all flex items-center justify-center"
                  onClick={handleLiveStreamSubmit}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* --- ADD YOUTUBE/ZOOM VIDEOS DRAWER --- */}
      {
        showYoutubeZoomModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex justify-end">
            <div
              className="absolute inset-0 bg-black/50 animate-fade-in transition-opacity"
              onClick={() => { setShowYoutubeZoomModal(false); }}
            />
            <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden transition-all duration-300">
              {/* Header */}
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 shrink-0">
                <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">Add YouTube/Zoom Videos</h3>
                <button
                  onClick={() => { setShowYoutubeZoomModal(false); }}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 shrink-0">
                <button
                  onClick={() => setActiveYoutubeZoomTab('basic')}
                  className={`flex-1 flex items-center justify-center py-5 text-[15px] font-bold transition-all relative ${activeYoutubeZoomTab === 'basic' ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Basic
                </button>
                <div className="w-[1px] bg-gray-100 my-4" />
                <button
                  onClick={() => setActiveYoutubeZoomTab('advanced')}
                  className={`flex-1 flex items-center justify-center py-5 text-[15px] font-bold transition-all relative ${activeYoutubeZoomTab === 'advanced' ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Advanced
                </button>
              </div>

              {/* Content Area - Scrollable */}
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 pb-40">
                {activeYoutubeZoomTab === 'basic' && (
                  <div className="space-y-10">
                    <div className="space-y-8">
                      {/* Title */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Title <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={youtubeZoomForm.title}
                          onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, title: e.target.value })}
                          className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                          placeholder=""
                        />
                      </div>

                      {/* Image Upload */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                        <div className="flex gap-4">
                          <input type="file" ref={youtubeZoomImageRef} className="hidden" accept="image/*" onChange={handleYoutubeZoomImageUpload} />
                          <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-2 shrink-0 border border-gray-100 overflow-hidden relative group">
                            {youtubeZoomForm.image ? (
                              <img src={youtubeZoomForm.image} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[40px] text-[#8e8e8e]">image</span>
                                <span className="text-[14px] font-bold text-[#8e8e8e]">No Image</span>
                              </>
                            )}
                          </div>
                          <div
                            onClick={() => youtubeZoomImageRef.current?.click()}
                            className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center"
                          >
                            <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload Image</h4>
                            <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Toggle */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Status</label>
                        <div className="flex bg-[#f8f8f8] p-1.5 rounded-[12px] w-full border border-gray-100">
                          <button
                            onClick={() => setYoutubeZoomForm({ ...youtubeZoomForm, isFree: true })}
                            className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${youtubeZoomForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}
                          >
                            Free
                          </button>
                          <button
                            onClick={() => setYoutubeZoomForm({ ...youtubeZoomForm, isFree: false })}
                            className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${!youtubeZoomForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}
                          >
                            Paid
                          </button>
                        </div>
                      </div>

                      {/* Publish On */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Publish On <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type="text"
                            value={youtubeZoomForm.publishOn || "2026-02-26 10:35"}
                            onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, publishOn: e.target.value })}
                            className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                          />
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">calendar_today</span>
                        </div>
                      </div>

                      {/* Link */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Zoom/YouTube Link <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={youtubeZoomForm.link}
                          onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, link: e.target.value })}
                          className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                          placeholder=""
                        />
                      </div>

                      {/* Stream Details */}
                      <div className="space-y-5">
                        <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight">Stream Details</h4>
                        <div className="space-y-2">
                          <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Stream Status</label>
                          <div className="relative">
                            <select
                              value={youtubeZoomForm.streamStatus}
                              onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, streamStatus: e.target.value })}
                              className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none shadow-sm"
                            >
                              <option value="Live">Live</option>
                              <option value="Upcoming">Upcoming</option>
                              <option value="Recorded">Recorded</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[24px] pointer-events-none">expand_more</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Content Section */}
                    <div className="space-y-8 pt-6 border-t border-gray-50">
                      <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Additional Content</h4>

                      {[1, 2].map((num) => (
                        <div key={num} className="space-y-2">
                          <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attach PDF</label>
                          <div className="flex gap-4">
                            <input type="file" className="hidden" accept="application/pdf" />
                            <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100">
                              <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                                <span className="material-symbols-outlined text-[20px] text-[#8e8e8e]">help</span>
                              </div>
                              <span className="text-[13px] font-bold text-[#8e8e8e]">No PDF</span>
                            </div>
                            <div className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center">
                              <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload PDF</h4>
                              <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Study Material</label>
                        <div className="flex gap-4">
                          <input type="file" className="hidden" accept="*" />
                          <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100">
                            <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                              <span className="material-symbols-outlined text-[20px] text-[#8e8e8e]">help</span>
                            </div>
                            <span className="text-[13px] font-bold text-[#8e8e8e]">No File</span>
                          </div>
                          <div className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center">
                            <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload File</h4>
                            <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeYoutubeZoomTab === 'advanced' && (
                  <div className="space-y-10">
                    <div>
                      <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase mb-6">Interaction & Engagement</h4>
                      <div className="space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 max-w-[320px]">
                            <p className="text-[15px] font-bold text-gray-800 tracking-tight">Enable Live Chat</p>
                            <p className="text-[12px] text-gray-400 font-bold tracking-tight leading-relaxed">Allow students to chat during the stream</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer mt-1">
                            <input type="checkbox" className="sr-only peer" checked={youtubeZoomForm.enableChat} onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, enableChat: e.target.checked })} />
                            <div className="w-[44px] h-[24px] bg-gray-200 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                          </label>
                        </div>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 max-w-[320px]">
                            <p className="text-[15px] font-bold text-gray-800 tracking-tight">Enable Q&A Section</p>
                            <p className="text-[12px] text-gray-400 font-bold tracking-tight leading-relaxed">Add a dedicated space for student questions</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer mt-1">
                            <input type="checkbox" className="sr-only peer" checked={youtubeZoomForm.enableQA} onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, enableQA: e.target.checked })} />
                            <div className="w-[44px] h-[24px] bg-gray-200 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-50">
                      <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase mb-6">Access & Notifications</h4>
                      <div className="space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 max-w-[320px]">
                            <p className="text-[15px] font-bold text-gray-800 tracking-tight">Notify Students</p>
                            <p className="text-[12px] text-gray-400 font-bold tracking-tight leading-relaxed">Send notification when stream starts</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer mt-1">
                            <input type="checkbox" className="sr-only peer" checked={youtubeZoomForm.notifyStudents} onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, notifyStudents: e.target.checked })} />
                            <div className="w-[44px] h-[24px] bg-gray-200 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                          </label>
                        </div>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 max-w-[320px]">
                            <p className="text-[15px] font-bold text-gray-800 tracking-tight">Support Offline Store</p>
                            <p className="text-[12px] text-gray-400 font-bold tracking-tight leading-relaxed">Allow students to save video offline</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer mt-1">
                            <input type="checkbox" className="sr-only peer" checked={youtubeZoomForm.allowDownload} onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, allowDownload: e.target.checked })} />
                            <div className="w-[44px] h-[24px] bg-gray-200 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-50">
                      <div className="flex items-start justify-between">
                        <p className="text-[15px] font-bold text-gray-800 tracking-tight">Sorting Order</p>
                        <input
                          type="text"
                          value={youtubeZoomForm.order || "0.00"}
                          onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, order: e.target.value })}
                          className="w-[80px] h-[44px] px-3 bg-white border border-gray-200 rounded-[12px] text-[15px] font-bold text-center outline-none focus:border-gray-400 transition-all font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                      <button
                        onClick={() => setShowYoutubeZoomSEO(!showYoutubeZoomSEO)}
                        className="flex items-center gap-2 text-[12px] font-bold text-blue-600 cursor-pointer hover:text-blue-700 uppercase tracking-widest transition-all"
                      >
                        <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${showYoutubeZoomSEO ? 'rotate-90' : 'rotate-0'}`}>arrow_right</span>
                        Configure SEO Meta settings
                      </button>

                      {showYoutubeZoomSEO && (
                        <div className="mt-6 space-y-6 animate-in slide-in-from-top-4 duration-500 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                          <div className="space-y-2">
                            <label className="block text-[13px] font-bold text-gray-700 tracking-tight">Slug (URL Customization)</label>
                            <input
                              type="text"
                              value={youtubeZoomForm.slug || ''}
                              onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, slug: e.target.value })}
                              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-blue-500 transition-all shadow-sm"
                              placeholder="e.g. youtube-zoom-video"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Bottom Button */}
              <div className="absolute bottom-0 left-0 right-0 p-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] bg-white z-[100]">
                <button
                  className="w-full h-[70px] bg-[#1a1c1e] text-white text-[16px] font-bold tracking-tight hover:bg-black transition-all flex items-center justify-center"
                  onClick={handleYoutubeZoomSubmit}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {showWebinarModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in transition-opacity"
            onClick={() => setShowWebinarModal(false)}
          />
          <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 shrink-0">
              <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">Add Webinar</h3>
              <button
                onClick={() => setShowWebinarModal(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 h-[60px] shrink-0">
              <button
                onClick={() => setActiveWebinarTab('basic')}
                className={`flex-1 flex items-center justify-center text-[15px] font-bold transition-all ${activeWebinarTab === 'basic' ? 'text-black relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-[60px] after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Basic
              </button>
              <button
                onClick={() => setActiveWebinarTab('advanced')}
                className={`flex-1 flex items-center justify-center text-[15px] font-bold transition-all ${activeWebinarTab === 'advanced' ? 'text-black relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-[80px] after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Advanced
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 pb-40 custom-scrollbar">
              {activeWebinarTab === 'basic' ? (
                <>
                  <div className="space-y-8">
                    {/* Title */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={webinarForm.title}
                        onChange={(e) => setWebinarForm({ ...webinarForm, title: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                        placeholder=""
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                      <div className="flex gap-4">
                        <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                          {webinarForm.image ? (
                            <img src={webinarForm.image} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[28px] text-gray-400">image</span>
                              <span className="text-[12px] font-bold text-gray-400">No Image</span>
                            </>
                          )}
                        </div>
                        <div
                          onClick={() => webinarImageRef.current?.click()}
                          className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                        >
                          <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload Image</h4>
                          <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight">Click or Drag & Drop your file here.</span>
                        </div>
                      </div>
                      <input type="file" ref={webinarImageRef} className="hidden" accept="image/*" onChange={handleWebinarImageUpload} />
                    </div>

                    {/* Status Toggle */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Status</label>
                      <div className="flex bg-gray-100/50 p-1 rounded-[14px] border border-gray-100">
                        <button
                          onClick={() => setWebinarForm({ ...webinarForm, isFree: true })}
                          className={`flex-1 py-3 text-[14px] font-bold rounded-[10px] transition-all ${webinarForm.isFree ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                        >
                          Free
                        </button>
                        <button
                          onClick={() => setWebinarForm({ ...webinarForm, isFree: false })}
                          className={`flex-1 py-3 text-[14px] font-bold rounded-[10px] transition-all ${!webinarForm.isFree ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                        >
                          Paid
                        </button>
                      </div>
                    </div>

                    {/* Webinar Link */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Webinar Link <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={webinarForm.link}
                        onChange={(e) => setWebinarForm({ ...webinarForm, link: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                        placeholder=""
                      />
                    </div>

                    {/* Generate Link Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          const randomId = Math.random().toString(36).substring(7);
                          setWebinarForm({ ...webinarForm, link: `https://webinar.gg/live/${randomId}` });
                        }}
                        className="h-[50px] px-8 bg-white border border-gray-200 text-gray-800 text-[14px] font-bold rounded-[14px] hover:bg-gray-50 transition-all w-fit shadow-sm active:scale-95 flex items-center justify-center"
                      >
                        Generate Webinar Link
                      </button>
                    </div>

                    {/* Stream Details Header */}
                    <div className="pt-2">
                      <h4 className="text-[15px] font-bold text-gray-800 tracking-tight">Stream Details</h4>
                    </div>

                    {/* Stream Status */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Stream Status</label>
                      <div className="relative group">
                        <select
                          value={webinarForm.streamStatus}
                          onChange={(e) => setWebinarForm({ ...webinarForm, streamStatus: e.target.value })}
                          className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
                        >
                          <option value="Live">Live</option>
                          <option value="Upcoming">Upcoming</option>
                          <option value="Recorded">Recorded</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors group-hover:text-gray-600">expand_more</span>
                      </div>
                    </div>

                    {/* Publish On */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Publish On</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={webinarForm.publishOn}
                          onChange={(e) => setWebinarForm({ ...webinarForm, publishOn: e.target.value })}
                          className="w-full h-[54px] px-5 bg-gray-100 border border-gray-100 rounded-[12px] text-[15px] font-medium outline-none text-gray-500 cursor-default"
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Additional Content Header */}
                    <div className="pt-2">
                      <h4 className="text-[15px] font-bold text-gray-800 tracking-tight">Additional Content</h4>
                    </div>

                    {/* Attach PDF 1 */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Attach PDF</label>
                      <div className="flex gap-4">
                        <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                          <span className="material-symbols-outlined text-[28px] text-gray-400">question_mark</span>
                          <span className="text-[12px] font-bold text-gray-400">No PDF</span>
                        </div>
                        <div
                          onClick={() => webinarPdf1Ref.current?.click()}
                          className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                        >
                          <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload PDF</h4>
                          <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight truncate w-full px-4">Click or Drag & Drop your file here.</span>
                        </div>
                      </div>
                      <input type="file" ref={webinarPdf1Ref} className="hidden" accept="application/pdf" onChange={(e) => handleWebinarFileUpload(e, 'pdf1')} />
                    </div>

                    {/* Attach PDF 2 */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Attach PDF</label>
                      <div className="flex gap-4">
                        <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                          <span className="material-symbols-outlined text-[28px] text-gray-400">question_mark</span>
                          <span className="text-[12px] font-bold text-gray-400">No PDF</span>
                        </div>
                        <div
                          onClick={() => webinarPdf2Ref.current?.click()}
                          className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                        >
                          <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload PDF</h4>
                          <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight truncate w-full px-4">Click or Drag & Drop your file here.</span>
                        </div>
                      </div>
                      <input type="file" ref={webinarPdf2Ref} className="hidden" accept="application/pdf" onChange={(e) => handleWebinarFileUpload(e, 'pdf2')} />
                    </div>

                    {/* Study Material */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Study Material</label>
                      <div className="flex gap-4">
                        <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                          <span className="material-symbols-outlined text-[28px] text-gray-400">question_mark</span>
                          <span className="text-[12px] font-bold text-gray-400">No File</span>
                        </div>
                        <div
                          onClick={() => webinarStudyMaterialRef.current?.click()}
                          className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                        >
                          <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload File</h4>
                          <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight truncate w-full px-4">Click or Drag & Drop your file here.</span>
                        </div>
                      </div>
                      <input type="file" ref={webinarStudyMaterialRef} className="hidden" accept="*" onChange={(e) => handleWebinarFileUpload(e, 'studyMaterial')} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h4 className="text-[15px] font-bold text-gray-800 tracking-tight">Advanced Settings</h4>

                    {/* Quiz */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Quiz</label>
                      <div className="relative group">
                        <select
                          value={webinarForm.quizId}
                          onChange={(e) => setWebinarForm({ ...webinarForm, quizId: e.target.value })}
                          className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
                        >
                          <option value="">Select Quiz</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
                      </div>
                    </div>

                    {/* In App download Toggle */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <p className="text-[15px] font-bold text-gray-800 tracking-tight">In App download</p>
                        <p className="text-[12px] text-gray-400 font-bold tracking-tight leading-relaxed max-w-[280px]">Switch ON if you want the users to be able to download the video</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={webinarForm.allowDownload}
                          onChange={(e) => setWebinarForm({ ...webinarForm, allowDownload: e.target.checked })}
                        />
                        <div className={`w-[48px] h-[26px] rounded-full transition-all relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${webinarForm.allowDownload ? 'bg-black after:translate-x-[22px]' : 'bg-gray-200'}`}></div>
                      </label>
                    </div>

                    {/* Live Chat Message Visibility */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Live Chat Message Visibility</label>
                      <div className="relative group">
                        <select
                          value={webinarForm.chatVisibility}
                          onChange={(e) => setWebinarForm({ ...webinarForm, chatVisibility: e.target.value })}
                          className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
                        >
                          <option value="Everyone">Everyone</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
                      </div>
                    </div>

                    {/* Enable Video Restrictions Toggle */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <p className="text-[15px] font-bold text-gray-800 tracking-tight">Enable Video Restrictions</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={webinarForm.videoRestrictions}
                          onChange={(e) => setWebinarForm({ ...webinarForm, videoRestrictions: e.target.checked })}
                        />
                        <div className={`w-[48px] h-[26px] rounded-full transition-all relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${webinarForm.videoRestrictions ? 'bg-black after:translate-x-[22px]' : 'bg-gray-200'}`}></div>
                      </label>
                    </div>

                    {/* Sorting Order */}
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Sorting Order</label>
                      <input
                        type="text"
                        value={webinarForm.order}
                        onChange={(e) => setWebinarForm({ ...webinarForm, order: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Fixed Bottom Submit Button */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-6 border-t border-gray-100 bg-white z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
              <button
                onClick={handleWebinarSubmit}
                className="w-full h-[56px] bg-[#1a1c1e] text-white text-[16px] font-bold rounded-[16px] hover:bg-black transition-all shadow-lg active:scale-[0.98]"
              >
                Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}



      <SubjectiveTestDrawer
        isOpen={showSubjectiveTestDrawer}
        testSeriesOptions={courses.map(c => ({ value: (c as any)._id || c.id, label: c.name || c.title || '' }))}
        onClose={() => { setShowSubjectiveTestDrawer(false); setSubjectiveTestSearch?.(''); setShowSubjectiveDropdown?.(false); setSelectedSubjectiveList?.([]); }}
        onAddTests={(tests) => {
          setSelectedSubjectiveList?.(tests);
          showToast('Subjective tests added successfully', 'success');
          setShowSubjectiveTestDrawer(false);
        }}
      />

      <OMRTestDrawer
        isOpen={showOMRDrawer}
        onClose={() => setShowOMRDrawer(false)}
        testSeriesList={testSeriesList}
        isSeriesLoading={isTestSeriesLoading}
        onSeriesChange={(id) => fetchTestsBySeries(id, 'omr')}
        availableTests={omrTests}
        isTestsLoading={isOMRTestsLoading}
        onSubmit={async (testList) => {
          if (!selectedCourse) return;
          const courseId = (selectedCourse as any)._id || selectedCourse.id;
          const folderId = currentFolder?.id || currentFolder?._id || null;

          showToast(`Adding ${testList.length} OMR test(s)...`, 'success');
          try {
            await Promise.all(testList.map(async (test: any) => {
              const testData = { ...test, courseId, folderId, id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
              await fetch(`${API_BASE_URL}/courses/${courseId}/tests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
              });
            }));
            showToast(`${testList.length} OMR test(s) added successfully`, 'success');
            setShowOMRDrawer(false);
            loadCourseContent();
          } catch (error) {
            showToast('Failed to add some tests', 'error');
          }
        }}
      />

      <TestDrawer
        isOpen={showTestDrawer}
        onClose={() => setShowTestDrawer(false)}
        testSeriesList={testSeriesList}
        isSeriesLoading={isTestSeriesLoading}
        onSeriesChange={(id) => fetchTestsBySeries(id, 'standard')}
        availableTests={standardTests}
        isTestsLoading={isStandardTestsLoading}
        onSubmit={async (testList) => {
          if (!selectedCourse) return;
          const courseId = (selectedCourse as any)._id || selectedCourse.id;
          const folderId = currentFolder?.id || currentFolder?._id || null;

          showToast(`Adding ${testList.length} test(s)...`, 'success');
          try {
            await Promise.all(testList.map(async (test: any) => {
              const testData = { ...test, courseId, folderId, id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
              await fetch(`${API_BASE_URL}/courses/${courseId}/tests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
              });
            }));
            showToast(`${testList.length} test(s) added successfully`, 'success');
            setShowTestDrawer(false);
            loadCourseContent();
          } catch (error) {
            showToast('Failed to add some tests', 'error');
          }
        }}
      />

      <QuizDrawer
        isOpen={showQuizDrawer}
        onClose={() => setShowQuizDrawer(false)}
        onSubmit={async (selectedIds) => {
          if (!selectedCourse) { showToast('No course selected', 'error'); return; }
          const courseId = (selectedCourse as any)._id || selectedCourse.id;
          const folderId = currentFolder?.id || currentFolder?._id || null;
          try {
            await Promise.all(selectedIds.map(async (id: string) => {
              const quizData = {
                id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                courseId, folderId,
                name: id, type: 'quiz', status: 'active'
              };
              await fetch(`${API_BASE_URL}/courses/${courseId}/tests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quizData)
              });
            }));
            showToast('Quiz(zes) added', 'success');
            setShowQuizDrawer(false);
            loadCourseContent();
          } catch (err) {
            showToast('Failed to add quiz', 'error');
          }
        }}
      />

      <UploadDrawer
        isOpen={showAudioDrawer}
        onClose={() => setShowAudioDrawer(false)}
        title="Add Audio File(s)"
        subtitle="Upload Audio"
        accept="audio/*"
        onSubmit={(files) => handleFilesUpload(files, 'audio')}
      />

      {/* REDUNDANT VideoDrawer REMOVED - Using AddVideoDrawer below */}

      <UploadDrawer
        isOpen={showDocumentDrawer}
        onClose={() => setShowDocumentDrawer(false)}
        title="Add Document(s) / Note(s)"
        subtitle="Upload Files"
        accept=".pdf,.doc,.docx,application/pdf"
        onSubmit={(files) => handleFilesUpload(files, 'document')}
      />

      {/* REDUNDANT DRAWERS REMOVED: CUSTOM PORTALS USED ABOVE */}
      {/* Custom Drawers from FeatureDrawers.tsx are NOT used here because we use the createPortal modals above for Live/Webinar etc. */}

      <LinkDrawer
        isOpen={showLinkDrawer}
        onClose={() => setShowLinkDrawer(false)}
        onSubmit={async (data) => {
          if (!selectedCourse) { showToast('No course selected', 'error'); return; }
          const courseId = (selectedCourse as any)._id || selectedCourse.id;
          const folderId = currentFolder?.id || currentFolder?._id || null;
          try {
            const linkData = {
              id: `link_${Date.now()}`,
              courseId,
              folderId,
              title: data.name || 'Untitled Link',
              fileUrl: data.link || '',
              fileSize: '',
              type: 'link',
              isFree: data.status === 'Free',
              order: parseInt(data.order) || notes.length + 1,
              status: 'active'
            };
            const res = await fetch(`${API_BASE_URL}/courses/${courseId}/notes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(linkData)
            });
            if (res.ok) {
              showToast('Link added successfully', 'success');
              setShowLinkDrawer(false);
              loadCourseContent();
            } else {
              showToast('Failed to add link', 'error');
            }
          } catch (err) {
            showToast('Failed to add link', 'error');
          }
        }}
      />

      {showImportModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in transition-opacity"
            onClick={() => setShowImportModal(false)}
          />
          <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 shrink-0">
              <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">Import Content</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 pb-40">
              {/* Source Selection */}
              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-gray-600 tracking-tight">
                  Source <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <select
                    value={importSource}
                    onChange={(e) => setImportSource(e.target.value)}
                    className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
                  >
                    <option value="">Select Course</option>
                    {courses.filter(c => (c._id || c.id) !== ((selectedCourse as any)?._id || (selectedCourse as any)?.id)).map(course => (
                      <option key={course._id || course.id} value={course._id || course.id}>
                        {course.name || course.title}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
                </div>
              </div>

              {importSource && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* List Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-[17px] font-bold text-[#1e1e1e] tracking-tight">Course Content</h4>
                    <div className="relative w-[180px]">
                      <input
                        type="text"
                        placeholder="Search"
                        value={importSearch}
                        onChange={(e) => setImportSearch(e.target.value)}
                        className="w-full h-[38px] pl-10 pr-4 bg-gray-50/50 border border-gray-200 rounded-[10px] text-[13px] font-medium outline-none focus:border-gray-400 transition-all"
                      />
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Select All */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-[14px] font-bold text-gray-400">Select all</span>
                      <input
                        type="checkbox"
                        checked={importItems.length > 0 && selectedImportItems.length === importItems.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedImportItems(importItems.map(i => i._id || i.id));
                          } else {
                            setSelectedImportItems([]);
                          }
                        }}
                        className="w-5 h-5 accent-black cursor-pointer rounded-md"
                      />
                    </div>

                    {/* Items List */}
                    <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {isImportLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                          <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin"></div>
                          <span className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">Loading Content...</span>
                        </div>
                      ) : importItems.length > 0 ? (
                        importItems.filter(item => (item.title || item.name || '').toLowerCase().includes(importSearch.toLowerCase())).map((item) => (
                          <div
                            key={item._id || item.id}
                            onClick={() => {
                              const id = item._id || item.id;
                              setSelectedImportItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                            }}
                            className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 rounded-[15px] cursor-pointer transition-all border border-transparent group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow transition-all shrink-0">
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">
                                  {item.type === 'folder' ? 'folder' : (item.type === 'video' ? 'videocam' : 'description')}
                                </span>
                              </div>
                              <span className="text-[15px] font-bold text-gray-700 tracking-tight">{item.title || item.name}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedImportItems.includes(item._id || item.id)}
                              onChange={() => { }} // Handled by div click
                              className="w-5 h-5 accent-black cursor-pointer rounded-md"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="py-32 flex flex-col items-center justify-center text-center opacity-20">
                          <span className="material-symbols-outlined text-[64px] mb-4">move_to_inbox</span>
                          <p className="text-[16px] font-bold tracking-tight uppercase">Empty Course Content</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!importSource && !isImportLoading && (
                <div className="py-40 flex flex-col items-center justify-center text-center opacity-20">
                  <span className="material-symbols-outlined text-[72px] mb-6">dynamic_feed</span>
                  <p className="text-[17px] font-bold tracking-tight uppercase">Select a course to see content</p>
                </div>
              )}
            </div>

            {/* Fixed Bottom Action Area */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-6 border-t border-gray-100 bg-white z-[100] flex gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
              <button
                onClick={() => handleImportAction('move')}
                disabled={selectedImportItems.length === 0}
                className="flex-1 h-[56px] bg-white border border-gray-200 text-gray-800 text-[15px] font-bold rounded-[16px] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed group active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-gray-600 transition-colors">drive_file_move_rtl</span>
                Move
              </button>
              <button
                onClick={() => handleImportAction('copy')}
                disabled={selectedImportItems.length === 0}
                className="flex-1 h-[56px] bg-[#1a1c1e] text-white text-[15px] font-bold rounded-[16px] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                Copy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <BulkActionsDrawerComponent
        isOpen={showBulkActionDrawer}
        onClose={() => setShowBulkActionDrawer(false)}
        items={combinedItems}
        onApplyAction={handleBulkAction}
      />

      <AddFolderDrawer
        isOpen={showFolderModal}
        onClose={() => { setShowFolderModal(false); setEditingFolder(null); }}
        onSubmit={handleFolderSubmit}
        onUploadImage={uploadFolderImage}
        editingFolder={editingFolder}
      />

      <AddVideoDrawer
        isOpen={showVideoModal}
        onClose={() => { setShowVideoModal(false); setEditingVideo(null); }}
        onSubmit={handleVideoSubmit}
        editingVideo={editingVideo}
      />

      <AddNoteDrawer
        isOpen={showNoteModal}
        onClose={() => { setShowNoteModal(false); setEditingNote(null); }}
        onSubmit={handleNoteSubmit}
        onUploadFile={async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          return data.url;
        }}
        editingNote={editingNote}
      />

      <AddTestDrawer
        isOpen={showTestModal}
        onClose={() => { setShowTestModal(false); setEditingTest(null); }}
        onSubmit={handleTestSubmit}
        editingTest={editingTest}
        courses={courses}
      />

      <AddQuestionDrawer
        isOpen={showQuestionModal}
        onClose={() => { setShowQuestionModal(false); setEditingQuestion(null); }}
        onSubmit={handleQuestionSubmit}
        onUploadImage={uploadFolderImage} // Reusing uploadFolderImage which is a dataURL reader for demo
        editingQuestion={editingQuestion}
      />

      <UploadDrawer
        isOpen={showImageDrawer}
        onClose={() => setShowImageDrawer(false)}
        title="Add Image(s)"
        subtitle="Upload Images"
        accept="image/*"
        onSubmit={(files) => handleFilesUpload(files, 'image')}
      />

      <UploadDrawer
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        title="Add Document(s)"
        subtitle="Upload Documents"
        accept="*"
        onSubmit={(files) => handleFilesUpload(files, 'document')}
      />

      <SubjectiveTestDrawer
        isOpen={showSubjectiveTestDrawer}
        onClose={() => setShowSubjectiveTestDrawer(false)}
        onAddTests={(data) => {
          showToast('Subjective test added successfully!', 'success');
          setShowSubjectiveTestDrawer(false);
          loadCourseContent();
        }}
        testSeriesOptions={testSeriesList.map(s => ({ value: s.id, label: s.title || s.seriesName }))}
      />
    </div >
  );
};


export default CourseContentManager;

