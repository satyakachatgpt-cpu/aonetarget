import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useCourseListLogic } from '../../hooks/useCourseListLogic';
import { useNavigate } from 'react-router-dom';
import { useCourseContentData } from '../../hooks/useCourseContentData';
import { useCourseNavigation } from '../../hooks/useCourseNavigation';
import { useCourseContentDnD } from '../../hooks/useCourseContentDnD';
import { useCourseContentToggles } from '../../hooks/useCourseContentToggles';
import { useLiveStreamActions } from '../../hooks/useLiveStreamActions';
import { useCourseContentUploads } from '../../hooks/useCourseContentUploads';
import { validateImage } from '../../lib/utils';
import { useCourseContentBulkImport } from '../../hooks/useCourseContentBulkImport';
import { useCourseTestSelection } from '../../hooks/useCourseTestSelection';
import { useCourseContentSubmit } from '../../hooks/useCourseContentSubmit';
import { useCourseContentDelete } from '../../hooks/useCourseContentDelete';
import { useLiveContentSubmit } from '../../hooks/useLiveContentSubmit';
import { getImageUrl, toYouTubeEmbed } from '../../lib/utils';
import { coursesAPI, packagesAPI, uploadAPI, getAdminHeaders, invalidateCache } from '../../services/apiClient';
import CourseProductsView from './course-content/CourseProductsView';
import CourseContentView from './course-content/CourseContentView';
import CourseContentModals from './course-content/CourseContentModals';
import ContentListWrapper from './course-content/ContentListWrapper';
import AddCourse from './AddCourse';

/**
 * ARCHITECTURE MAP - CourseContentManager.tsx
 * ------------------------------------------
 * 1. Interfaces & Constants (~Line 40)
 * 2. Component Setup & State (~Line 150)
 *    - Content State Area
 *    - Folder/Navigation State Area
 *    - Drawer/Modal State Area
 * 3. Utility Helpers (~Line 200)
 *    - normalizeId
 * 4. Memoized Logic (~Line 650)
 *    - folderCounts, combinedItems
 * 5. Hook Orchestration (~Line 450)
 *    - useCourseContentData, useCourseNavigation, etc.
 * 6. Content Handlers (~Line 1100)
 *    - CRUD Operations
 *    - Toggle Status/Free
 * 7. File Upload Logic (~Line 1150)
 * 8. Bulk Operations (~Line 550)
 * 9. Render Area (~Line 1400)
 *    - JSX Layout
 *    - Modals & Portals
 */
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
  publishOn?: string;
  link: string;
  pdf1: string;
  pdf2: string;
  studyMaterial: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  enableChat: boolean;
  enableQA: boolean;
  notifyStudents: boolean;
  allowReplay: boolean;
  autoStart: boolean;
  visibility: 'public' | 'private';
  chatModeration: boolean;
  platform: string;
  streamStatus: string;
  endTime?: string;
}

interface WebinarForm {
  title: string;
  description: string;
  image: string;
  isFree: boolean;
  publishOn?: string;
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

const getAuthHeaders = () => {
  const adminToken = localStorage.getItem('adminToken');
  const adminId = localStorage.getItem('adminId');
  const headers: any = {};
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  if (adminId) headers['x-admin-id'] = adminId;
  return headers;
};

const normalizeId = (id: any): string | null => {
  if (id === null || id === undefined) return null;
  if (typeof id === 'string') {
    const s = id.trim();
    return (s === 'null' || s === 'undefined' || s === '') ? null : s;
  }
  if (typeof id === 'object') {
    if (id.$oid) return String(id.$oid);
    if (id._id) return normalizeId(id._id);
    if ((id as any).id && typeof (id as any).id === 'string') return (id as any).id;
    if (id.toString && typeof id.toString === 'function') {
      const str = id.toString();
      if (str !== '[object Object]') return str;
    }
  }
  const finalStr = String(id);
  return (finalStr === '[object Object]' || finalStr === 'null' || finalStr === 'undefined') ? null : finalStr;
};

// Robust ID Matching Helpers
const getAnyId = (item: any): string => normalizeId(item?._id || item?.id) || "";
const getParentFolderId = (item: any): string => normalizeId(item?.folderId || item?.parentId || item?.folder || item?.folder_id) || "";

const folderMatches = (item: any, folder: any): boolean => {
  const itemFolderId = getParentFolderId(item);
  if (!itemFolderId) return false;
  
  const fId = normalizeId(folder?._id);
  const fCustomId = normalizeId(folder?.id);
  
  return (fId && itemFolderId === fId) || (fCustomId && itemFolderId === fCustomId);
};

const CourseContentManager: React.FC<Props> = ({ showToast, initialCourse, onClearInitialCourse, onBack, setActiveView, initialMainTab }) => {
  const navigate = useNavigate();
  const [openContentActionMenuId, setOpenContentActionMenuId] = useState<string | null>(null);
  const [currentTestForQuestions, setCurrentTestForQuestions] = useState<Test | null>(null);
  const [showYoutubeZoomModal, setShowYoutubeZoomModal] = useState(false);
  const [showLiveStreamModal, setShowLiveStreamModal] = useState(false);
  const [showWebinarModal, setShowWebinarModal] = useState(false);
  const [editingYoutubeZoom, setEditingYoutubeZoom] = useState<any | null>(null);

  const [youtubeZoomForm, setYoutubeZoomForm] = useState<YoutubeZoomForm>({
    title: '',
    description: '',
    image: '',
    isFree: false,
    link: '',
    pdf1: '',
    pdf2: '',
    studyMaterial: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    enableChat: true,
    enableQA: false,
    notifyStudents: true,
    allowReplay: true,
    autoStart: false,
    visibility: 'public',
    chatModeration: false,
    platform: 'YouTube Live',
    streamStatus: 'upcoming',
    endTime: ''
  });

  const [liveStreamForm, setLiveStreamForm] = useState({
    title: '',
    description: '',
    image: '',
    isFree: false,
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

  const [webinarForm, setWebinarForm] = useState<WebinarForm>({
    title: '',
    description: '',
    image: '',
    isFree: false,
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

  const resetYoutubeZoomForm = () => {
    setYoutubeZoomForm({
      title: '',
      description: '',
      image: '',
      isFree: false,
      link: '',
      pdf1: '',
      pdf2: '',
      studyMaterial: '',
      slug: '',
      seoTitle: '',
      seoDescription: '',
      enableChat: true,
      enableQA: false,
      notifyStudents: true,
      allowReplay: true,
      autoStart: false,
      visibility: 'public',
      chatModeration: false,
      platform: 'YouTube Live',
      streamStatus: 'upcoming'
    });
  };

  const resetLiveStreamForm = () => {
    setLiveStreamForm({
      title: '',
      description: '',
      image: '',
      isFree: false,
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

  const resetWebinarForm = () => {
    setWebinarForm({
      title: '',
      description: '',
      image: '',
      isFree: false,
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
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
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
  const [subjectiveTestSearch, setSubjectiveTestSearch] = useState('');
  const [availableSubjectiveTests, setAvailableSubjectiveTests] = useState<any[]>([]);
  const [selectedSubjectiveList, setSelectedSubjectiveList] = useState<any[]>([]);
  const [isSubjectiveLoading, setIsSubjectiveLoading] = useState(false);
  const [showSubjectiveDropdown, setShowSubjectiveDropdown] = useState(false);
  const [testSeriesList, setTestSeriesList] = useState<any[]>([]);
  const [isTestSeriesLoading, setIsTestSeriesLoading] = useState(false);
  const [omrTests, setOmrTests] = useState<any[]>([]);
  const [standardTests, setStandardTests] = useState<any[]>([]);
  const [isOMRTestsLoading, setIsOMRTestsLoading] = useState(false);
  const [isStandardTestsLoading, setIsStandardTestsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSource, setImportSource] = useState('');
  const [selectedImportItems, setSelectedImportItems] = useState<string[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [importItems, setImportItems] = useState<any[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [courseFormData, setCourseFormData] = useState<any>({ name: '', description: '', imageUrl: '', price: '0', categoryId: '' });
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [activeMainTab, setActiveMainTab] = useState(initialMainTab || 'Content');
  const {
    courses,
    setCourses,
    loading,
    productSearchQuery,
    setProductSearchQuery,
    productStatusFilter,
    setProductStatusFilter,
    productCategoryFilter,
    setProductCategoryFilter,
    isProductFilterOpen,
    setIsProductFilterOpen,
    courseCategories,
    loadCourses,
    filteredCourses,
    handleTogglePublish,
    handlePreview
  } = useCourseListLogic(showToast);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const debouncedContentSearch = useDebounce(contentSearchQuery, 300);
  const [contentStatusFilter, setContentStatusFilter] = useState('all');
  const [isContentFilterOpen, setIsContentFilterOpen] = useState(false);
  const {
    videos,
    setVideos,
    notes,
    setNotes,
    tests,
    setTests,
    folders,
    setFolders,
    loadCourseContent
  } = useCourseContentData({
    selectedCourse,
    normalizeId,
    showToast,
    getAuthHeaders,
    API_BASE_URL
  });
  const {
    folderStack,
    expandedFolders,
    setExpandedFolders,
    currentFolder,
    currentFolderId,
    handleFolderClick,
    handleBackClick,
    handleBreadcrumbClick
  } = useCourseNavigation({
    folders,
    normalizeId
  });

  const {
    draggedItem,
    dragOverItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop
  } = useCourseContentDnD({
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
  });

  const {
    handleToggleVideoStatus,
    handleToggleVideoFree,
    handleToggleNoteStatus,
    handleToggleNoteFree,
    handleToggleTestStatus,
    handleToggleTestFree
  } = useCourseContentToggles({
    selectedCourse,
    setVideos,
    setNotes,
    setTests,
    showToast,
    API_BASE_URL
  });

  const {
    handleSendContentNotification,
    handleEndLiveStream,
    handleStartLiveStream
  } = useLiveStreamActions({
    selectedCourse,
    setVideos,
    normalizeId,
    showToast,
    setOpenContentActionMenuId,
    API_BASE_URL
  });

  const {
    handleCourseImageUpload,
    handleFolderImageUpload,
    handleLiveStreamImageUpload,
    handleLiveStreamFileUpload,
    handleYoutubeZoomImageUpload,
    handleYoutubeZoomFileUpload,
    handleWebinarImageUpload,
    handleWebinarFileUpload
  } = useCourseContentUploads({
    uploadAPI,
    showToast,
    setImageUploadLoading,
    setCourseFormData,
    setEditingFolder,
    setLiveStreamForm,
    setYoutubeZoomForm,
    setWebinarForm
  });

  const {
    fetchAllCourses,
    fetchSourceCourseContent,
    handleImportAction,
  } = useCourseContentBulkImport({
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
    selectedContentIds: [],
    setSelectedContentIds: () => {},
    setShowBulkActionDrawer: () => {},
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
  });
  const {
    fetchTestSeriesList,
    fetchTestsBySeries,
    fetchSubjectiveTests,
    handleAddSubjectiveTest,
    handleRemoveSubjectiveTest
  } = useCourseTestSelection({
    selectedCourse,
    subjectiveTestSearch,
    selectedSubjectiveList,
    setAvailableSubjectiveTests,
    setShowSubjectiveDropdown,
    setIsSubjectiveLoading,
    setSelectedSubjectiveList,
    setSubjectiveTestSearch,
    setTestSeriesList,
    setIsTestSeriesLoading,
    setOmrTests,
    setStandardTests,
    setIsOMRTestsLoading,
    setIsStandardTestsLoading,
    getAuthHeaders,
    API_BASE_URL
  });
  const {
    handleVideoSubmit,
    handleNoteSubmit,
    handleTestSubmit
  } = useCourseContentSubmit({
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
  });
  const {
    handleDeleteVideo,
    handleDeleteNote,
    handleDeleteFolder,
    handleDeleteTest,
    handleDeleteQuestion
  } = useCourseContentDelete({
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
  });

  const {
    handleYoutubeZoomSubmit,
    handleLiveStreamSubmit,
    handleWebinarSubmit
  } = useLiveContentSubmit({
    selectedCourse,
    currentFolder,
    youtubeZoomForm,
    liveStreamForm,
    webinarForm,
    editingYoutubeZoom,
    setShowYoutubeZoomModal,
    setShowLiveStreamModal,
    setShowWebinarModal,
    setEditingYoutubeZoom,
    resetYoutubeZoomForm,
    resetLiveStreamForm,
    resetWebinarForm,
    loadCourseContent,
    showToast,
    normalizeId,
    getAuthHeaders,
    API_BASE_URL
  });

  // Memoize active folder content

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

    folders.forEach(f => {
      const fId = getAnyId(f);
      if (!fId) return;

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

  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);

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
        try { loadCourses(); } catch (e) { }
    } catch (err: any) {
      console.error('Update failed details:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to update batch';
      showToast(msg, 'error');
    }
  };

  const [isPublished, setIsPublished] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isAddingCourse, setIsAddingCourse] = useState<any>(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

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

  const handleTogglePublishWrapper = () => {
    if (!selectedCourse) return;
    handleTogglePublish(selectedCourse as any, setIsPublished, setPublishLoading);
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

  const handleEditYoutubeZoom = (video: any) => {
    setEditingYoutubeZoom(video);
    setActiveYoutubeZoomTab('basic');
    setYoutubeZoomForm({
      title: video.title || '',
      description: video.description || '',
      image: video.image || video.thumbnail || '',
      isFree: video.isFree || false,
      link: video.link || video.url || video.videoUrl || video.meetingLink || '',
      pdf1: video.pdf1 || '',
      pdf2: video.pdf2 || '',
      studyMaterial: video.studyMaterial || '',
      slug: video.slug || '',
      seoTitle: video.seoTitle || '',
      seoDescription: video.seoDescription || '',
      enableChat: video.enableChat ?? video.liveChatEnabled ?? true,
      enableQA: video.enableQA ?? video.qaEnabled ?? false,
      notifyStudents: video.notifyStudents ?? true,
      allowReplay: video.allowReplay ?? true,
      autoStart: video.autoStart ?? false,
      visibility: video.visibility || 'public',
      chatModeration: video.chatModeration ?? false,
      platform: video.platform || 'YouTube Live',
      streamStatus: video.streamStatus || video.status || 'upcoming',
      endTime: video.endTime || video.endDateTime || ''
    });
    setShowYoutubeZoomModal(true);
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

  const [showFolderModal, setShowFolderModal] = useState(false);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const [showOMRDrawer, setShowOMRDrawer] = useState(false);
  const [showSubjectiveTestDrawer, setShowSubjectiveTestDrawer] = useState(false);
  const [showTestDrawer, setShowTestDrawer] = useState(false);
  const [showQuizDrawer, setShowQuizDrawer] = useState(false);
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [showImageDrawer, setShowImageDrawer] = useState(false);
  const [showDocumentDrawer, setShowDocumentDrawer] = useState(false);
  const [showLinkDrawer, setShowLinkDrawer] = useState(false);

  const [activeLiveStreamTab, setActiveLiveStreamTab] = useState<'basic' | 'advanced'>('basic');

  const [activeYoutubeZoomTab, setActiveYoutubeZoomTab] = useState<'basic' | 'advanced'>('basic');
  const [showYoutubeZoomSEO, setShowYoutubeZoomSEO] = useState(false);

  const [activeWebinarTab, setActiveWebinarTab] = useState<'basic' | 'advanced'>('basic');

  const [importSearch, setImportSearch] = useState('');

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

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const isModalOpen = showVideoModal || showNoteModal || showTestModal || showFolderModal || showLiveStreamModal || showYoutubeZoomModal || showImportModal || showQuestionModal || showDocumentModal || showWebinarModal || showSubjectiveTestDrawer;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showVideoModal, showNoteModal, showTestModal, showFolderModal, showLiveStreamModal, showYoutubeZoomModal, showImportModal, showQuestionModal, showDocumentModal, showWebinarModal, showSubjectiveTestDrawer]);

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

  useEffect(() => {
    if (importSource) {
      fetchSourceCourseContent(importSource);
    } else {
      setImportItems([]);
    }
  }, [importSource]);

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

  const isChildOfFolder = (itemOrFolderId: any, parentFolder: any) => {
    if (!parentFolder) return false;
    const cFolderId = normalizeId(itemOrFolderId);
    if (!cFolderId) return false;
    return cFolderId === normalizeId(parentFolder._id) || cFolderId === normalizeId(parentFolder.id);
  };

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


  const uploadFolderImage = async (file: File): Promise<string> => {
    try {
      const result = await validateImage(file, {
        minWidth: 1280,
        minHeight: 720,
        aspectRatio: 16/9,
        tolerance: 0.10,
        label: 'Folder Image'
      });

      if (!result.valid) {
        showToast(result.message || 'Invalid image', 'error');
        return '';
      }

      const data = await uploadAPI.uploadImage(file);
      return data.url;
    } catch (error) {
      console.error('Folder image upload error:', error);
      showToast('Failed to upload image', 'error');
      return '';
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });

      if (response.ok) {
        showToast(editingFolder ? 'Folder updated!' : 'Folder added!', 'success');
        invalidateCache('course-content');
        invalidateCache('study-dashboard');
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

  const handleFilesUpload = async (files: File[], type: 'note' | 'audio' | 'image' | 'document') => {
    if (!selectedCourse || files.length === 0) return;
    const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
    const folderId = normalizeId(currentFolder?._id || currentFolder?.id || null);

    showToast(`Uploading ${files.length} file(s)...`, 'success');

    try {
      await Promise.all(files.map(async (file) => {
        let data;
        if (type === 'image') data = await uploadAPI.uploadImage(file);
        else if (type === 'audio') data = await uploadAPI.uploadVideo(file);
        else data = await uploadAPI.uploadDocument(file);

        const fileData = {
          ...data,
          title: file.name,
          fileUrl: data.url,
          fileSize: (file.size / 1024).toFixed(2) + ' KB',
          isFree: false,
          status: 'active',
          order: (notes.length || 0) + 1,
          folderId,
          courseId,
          type,
          id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };

        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminHeaders()
          },
          body: JSON.stringify(fileData)
        });

        if (!response.ok) throw new Error('Failed to save file info');
      }));

      showToast(`Successfully uploaded ${files.length} file(s)`, 'success');
      invalidateCache('course-content');
      invalidateCache('study-dashboard');
      loadCourseContent();
    } catch (error) {
      console.error('Upload Error:', error);
      showToast('Failed to upload files', 'error');
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentTestForQuestions, questions: updatedQuestions })
      });

      if (response.ok) {
        showToast(editingQuestion ? 'Question updated!' : 'Question added!', 'success');
        invalidateCache('course-content');
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

  const getFilteredFlatItems = () => {
    const flatFolders = folders.map(f => ({ ...f, type: 'folder', order: f.order || f.sortingOrder }));
    const flatVideos = videos.map(v => ({ ...v, type: (v as any).type || (v as any).contentType || (v as any).videoType || 'video', order: v.order }));
    const flatNotes = notes.map(n => ({ ...n, type: (n as any).type || (n as any).contentType || 'note', order: n.order }));
    const flatTests = tests.map(t => ({ ...t, type: 'test', order: t.order || 0 }));

    return [...flatFolders, ...flatVideos, ...flatNotes, ...flatTests]
      .filter(item => {
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
      })
      .sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));
  };

  const contentHandlers = useMemo(() => ({
    onToggleFolder: handleFolderClick,
    onNavigate: navigate,
    onShowToast: showToast,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
    onSetActionMenu: setOpenContentActionMenuId,
    onToggleStatus: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => {
      const itemId = normalizeId(item._id || item.id);
      if (isFolder) {
        const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
        fetch(`${API_BASE_URL}/courses/${courseId}/folders/${itemId}`, {
          method: 'PUT',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, status: item.status === 'active' ? 'inactive' : 'active' })
        }).then(() => { showToast(item.status === 'active' ? 'Folder disabled' : 'Folder enabled'); loadCourseContent(); });
      }
      else if (isLiveStream || isVideo) handleToggleVideoStatus(item);
      else if (isNote) handleToggleNoteStatus(item);
      else if (isTest) handleToggleTestStatus(item);
      setOpenContentActionMenuId(null);
    },
    onToggleFree: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean) => {
      const itemId = normalizeId(item._id || item.id);
      if (isFolder) {
        const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
        fetch(`${API_BASE_URL}/courses/${courseId}/folders/${itemId}`, {
          method: 'PUT',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, isFree: !item.isFree })
        }).then(() => { showToast(!item.isFree ? 'Folder set to Free' : 'Folder set to Locked'); loadCourseContent(); });
      }
      else if (isVideo) handleToggleVideoFree(item);
      else if (isNote) handleToggleNoteFree(item);
      else if (isTest) handleToggleTestFree(item);
      setOpenContentActionMenuId(null);
    },
    onNotifyStudents: (item: any) => { handleSendContentNotification(item); setOpenContentActionMenuId(null); },
    onStartLive: (item: any) => { handleStartLiveStream(item); setOpenContentActionMenuId(null); },
    onEndLive: (item: any) => { handleEndLiveStream(item); setOpenContentActionMenuId(null); },
    onEdit: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => {
      if (isFolder) handleEditFolder(item);
      else if (isVideo) {
        if (isLiveStream || item.streamStatus === 'recorded' || item.contentType === 'recorded' || item.pdf1 || item.pdf2 || item.studyMaterial) {
          handleEditYoutubeZoom(item);
        } else {
          handleEditVideo(item);
        }
      }
      else if (isNote) handleEditNote(item);
      else if (isTest) handleEditTest(item);
      setOpenContentActionMenuId(null);
    },
    onDelete: (itemId: string, itemType: string, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => {
      if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
        if (isFolder) handleDeleteFolder(itemId);
        else if (isVideo) {
          handleDeleteVideo(itemId);
          if (isLiveStream) setTimeout(() => showToast('Live stream deleted successfully', 'success'), 500);
        }
        else if (isNote) handleDeleteNote(itemId);
        else if (isTest) handleDeleteTest(itemId);
      }
      setOpenContentActionMenuId(null);
    },
    getCourseId: () => (selectedCourse as any)?._id || selectedCourse?.id
  }), [
    selectedCourse, handleFolderClick, navigate, showToast, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    handleToggleVideoStatus, handleToggleNoteStatus, handleToggleTestStatus,
    handleToggleVideoFree, handleToggleNoteFree, handleToggleTestFree,
    handleSendContentNotification, handleStartLiveStream, handleEndLiveStream,
    handleEditFolder, handleEditYoutubeZoom, handleEditVideo, handleEditNote, handleEditTest,
    handleDeleteFolder, handleDeleteVideo, handleDeleteNote, handleDeleteTest
  ]);

  const getAccordionTreeItems = (parentId: string | null = null) => {
    const currentParentObj = parentId ? folders.find(f => normalizeId(f._id) === parentId || normalizeId(f.id) === parentId) : null;

    const isInsideThisFolder = (contentFolderId: any) => {
      const normalizedCid = normalizeId(contentFolderId);
      if (parentId === null) return normalizedCid === null;
      if (normalizedCid === parentId) return true;
      if (currentParentObj) return isChildOfFolder(contentFolderId, currentParentObj);
      return false;
    };

    const levelFolders = folders.filter(f => isInsideThisFolder(f.parentId)).map(f => ({ ...f, type: 'folder', order: f.order || f.sortingOrder }));
    const levelVideos = videos.filter(v => isInsideThisFolder(v.folderId)).map(v => ({ ...v, type: (v as any).type || (v as any).contentType || (v as any).videoType || 'video', order: v.order }));
    const levelNotes = notes.filter(n => isInsideThisFolder(n.folderId)).map(n => ({ ...n, type: (n as any).type || (n as any).contentType || 'note', order: n.order }));
    const levelTests = tests.filter(t => isInsideThisFolder(t.folderId)).map(t => ({ ...t, type: 'test', order: t.order || 0 }));

    const items = [
      ...levelFolders.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
      ...[...levelVideos, ...levelNotes, ...levelTests].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    ];

    const filteredItems = items.filter(item => {
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
    });

    return filteredItems;
  };

  const renderAccordionTree = (parentId: string | null = null, level: number = 0) => {
    const filteredItems = getAccordionTreeItems(parentId);
    return (
      <ContentListWrapper
        items={filteredItems}
        level={level}
        isActiveUploadFolderId={currentFolder ? normalizeId(currentFolder._id || currentFolder.id) : null}
        expandedFolders={expandedFolders}
        draggedItemId={draggedItem ? normalizeId(draggedItem._id || draggedItem.id) : null}
        dragOverItemId={dragOverItem ? normalizeId(dragOverItem._id || dragOverItem.id) : null}
        isSearching={debouncedContentSearch.trim() !== ''}
        folderCounts={folderCounts}
        openContentActionMenuId={openContentActionMenuId}
        handlers={contentHandlers}
        renderChildTree={renderAccordionTree}
      />
    );
  };

  const rootFilteredItems = (debouncedContentSearch.trim() !== '' || contentTypeFilter !== 'all')
    ? getFilteredFlatItems()
    : getAccordionTreeItems(currentFolderId);

  const finalRenderedItems = (
    <ContentListWrapper
      items={rootFilteredItems}
      level={0}
      isActiveUploadFolderId={currentFolder ? normalizeId(currentFolder._id || currentFolder.id) : null}
      expandedFolders={expandedFolders}
      draggedItemId={draggedItem ? normalizeId(draggedItem._id || draggedItem.id) : null}
      dragOverItemId={dragOverItem ? normalizeId(dragOverItem._id || dragOverItem.id) : null}
      isSearching={debouncedContentSearch.trim() !== ''}
      folderCounts={folderCounts}
      openContentActionMenuId={openContentActionMenuId}
      handlers={contentHandlers}
      renderChildTree={renderAccordionTree}
    />
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }

  if (isAddingCourse) {
    return (
      <AddCourse
        courseData={typeof isAddingCourse === 'object' ? isAddingCourse : undefined}
        showToast={showToast}
        onClose={async () => {
          const editedCourse = typeof isAddingCourse === 'object' ? isAddingCourse : null;
          setIsAddingCourse(false);
          await loadCourses();
          // If we were editing a course, re-fetch it to get the latest data (e.g. new thumbnail)
          if (editedCourse && selectedCourse) {
            try {
              const courseId = (editedCourse as any)._id || (editedCourse as any).id;
              const isPackage = courseId?.toString().startsWith('pkg_');
              const endpoint = isPackage ? 'packages' : 'courses';
              const res = await fetch(`/api/${endpoint}/${courseId}`, { headers: getAuthHeaders() });
              if (res.ok) {
                const freshCourse = await res.json();
                if (freshCourse && !freshCourse.error) {
                  setSelectedCourse(freshCourse);
                }
              }
            } catch (e) {
              // silently fail — old data still shows
            }
          }
        }}
      />
    );
  }

  if (!selectedCourse) {
    return (
      <CourseProductsView
        filteredCourses={filteredCourses}
        courseCategories={courseCategories}
        productSearchQuery={productSearchQuery}
        setProductSearchQuery={setProductSearchQuery}
        productStatusFilter={productStatusFilter}
        setProductStatusFilter={setProductStatusFilter}
        productCategoryFilter={productCategoryFilter}
        setProductCategoryFilter={setProductCategoryFilter}
        isProductFilterOpen={isProductFilterOpen}
        setIsProductFilterOpen={setIsProductFilterOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isMoreOpen={isMoreOpen}
        setIsMoreOpen={setIsMoreOpen}
        moreDropdownRef={moreDropdownRef}
        openActionMenuId={openActionMenuId}
        setOpenActionMenuId={setOpenActionMenuId}
        setSelectedCourse={setSelectedCourse}
        setIsAddingCourse={setIsAddingCourse}
        handleEditCourseClick={handleEditCourseClick}
        handleTogglePublishWrapper={handleTogglePublishWrapper}
        fetchTestSeriesList={fetchTestSeriesList}
        showToast={showToast}
        setShowFolderModal={setShowFolderModal}
        setShowImportModal={setShowImportModal}
        setShowVideoModal={setShowVideoModal}
        setShowDocumentModal={setShowDocumentModal}
        setShowTestDrawer={setShowTestDrawer}
        setShowSubjectiveTestDrawer={setShowSubjectiveTestDrawer}
        setShowNoteModal={setShowNoteModal}
        setShowYoutubeZoomModal={setShowYoutubeZoomModal}
      />
    );
  }

  return (
    <>
      <CourseContentView
        selectedCourse={selectedCourse}
        onBack={onBack}
        onClearInitialCourse={onClearInitialCourse}
        setSelectedCourse={setSelectedCourse}
        handlePreview={handlePreview}
        handleTogglePublishWrapper={handleTogglePublishWrapper}
        publishLoading={publishLoading}
        isPublished={isPublished}
        activeMainTab={activeMainTab}
        setActiveMainTab={setActiveMainTab}
        folderStack={folderStack}
        handleBackClick={handleBackClick}
        currentFolder={currentFolder}
        contentSearchQuery={contentSearchQuery}
        setContentSearchQuery={setContentSearchQuery}
        isContentFilterOpen={isContentFilterOpen}
        setIsContentFilterOpen={setIsContentFilterOpen}
        contentTypeFilter={contentTypeFilter}
        setContentTypeFilter={setContentTypeFilter}
        rootFilteredItems={rootFilteredItems}
        finalRenderedItems={finalRenderedItems}
        setEditingFolder={setEditingFolder}
        setShowFolderModal={setShowFolderModal}
        resetVideoForm={resetVideoForm}
        setShowVideoModal={setShowVideoModal}
        setShowDocumentDrawer={setShowDocumentDrawer}
        setShowYoutubeZoomModal={setShowYoutubeZoomModal}
        fetchTestSeriesList={fetchTestSeriesList}
        setShowTestDrawer={setShowTestDrawer}
        setShowDocumentModal={setShowDocumentModal}
        setShowImportModal={setShowImportModal}
        showFullDesc={showFullDesc}
        setShowFullDesc={setShowFullDesc}
        handleEditCourseClick={handleEditCourseClick}
      />
      <CourseContentModals
        showLiveStreamModal={showLiveStreamModal}
        setShowLiveStreamModal={setShowLiveStreamModal}
        activeLiveStreamTab={activeLiveStreamTab}
        setActiveLiveStreamTab={setActiveLiveStreamTab}
        liveStreamForm={liveStreamForm}
        setLiveStreamForm={setLiveStreamForm}
        liveStreamImageRef={liveStreamImageRef}
        handleLiveStreamImageUpload={handleLiveStreamImageUpload}
        liveStreamPdf1Ref={liveStreamPdf1Ref}
        liveStreamPdf2Ref={liveStreamPdf2Ref}
        liveStreamStudyMaterialRef={liveStreamStudyMaterialRef}
        handleLiveStreamFileUpload={handleLiveStreamFileUpload}
        handleLiveStreamSubmit={handleLiveStreamSubmit}
        showYoutubeZoomModal={showYoutubeZoomModal}
        setShowYoutubeZoomModal={setShowYoutubeZoomModal}
        editingYoutubeZoom={editingYoutubeZoom}
        activeYoutubeZoomTab={activeYoutubeZoomTab}
        setActiveYoutubeZoomTab={setActiveYoutubeZoomTab}
        youtubeZoomForm={youtubeZoomForm}
        setYoutubeZoomForm={setYoutubeZoomForm}
        youtubeZoomImageRef={youtubeZoomImageRef}
        handleYoutubeZoomImageUpload={handleYoutubeZoomImageUpload}
        youtubeZoomPdf1Ref={youtubeZoomPdf1Ref}
        youtubeZoomPdf2Ref={youtubeZoomPdf2Ref}
        youtubeZoomStudyMaterialRef={youtubeZoomStudyMaterialRef}
        handleYoutubeZoomSubmit={handleYoutubeZoomSubmit}
        showYoutubeZoomSEO={showYoutubeZoomSEO}
        setShowYoutubeZoomSEO={setShowYoutubeZoomSEO}
        getAuthHeaders={getAuthHeaders}
        showToast={showToast}
        showWebinarModal={showWebinarModal}
        setShowWebinarModal={setShowWebinarModal}
        activeWebinarTab={activeWebinarTab}
        setActiveWebinarTab={setActiveWebinarTab}
        webinarForm={webinarForm}
        setWebinarForm={setWebinarForm}
        getImageUrl={getImageUrl}
        webinarImageRef={webinarImageRef}
        handleWebinarImageUpload={handleWebinarImageUpload}
        webinarPdf1Ref={webinarPdf1Ref}
        webinarPdf2Ref={webinarPdf2Ref}
        webinarStudyMaterialRef={webinarStudyMaterialRef}
        handleWebinarFileUpload={handleWebinarFileUpload}
        handleWebinarSubmit={handleWebinarSubmit}
        showSubjectiveTestDrawer={showSubjectiveTestDrawer}
        setShowSubjectiveTestDrawer={setShowSubjectiveTestDrawer}
        setSubjectiveTestSearch={setSubjectiveTestSearch}
        setShowSubjectiveDropdown={setShowSubjectiveDropdown}
        setSelectedSubjectiveList={setSelectedSubjectiveList}
        courses={courses}
        showOMRDrawer={showOMRDrawer}
        setShowOMRDrawer={setShowOMRDrawer}
        testSeriesList={testSeriesList}
        isTestSeriesLoading={isTestSeriesLoading}
        fetchTestsBySeries={fetchTestsBySeries}
        omrTests={omrTests}
        isOMRTestsLoading={isOMRTestsLoading}
        selectedCourse={selectedCourse}
        currentFolder={currentFolder}
        API_BASE_URL={API_BASE_URL}
        loadCourseContent={loadCourseContent}
        showTestDrawer={showTestDrawer}
        setShowTestDrawer={setShowTestDrawer}
        standardTests={standardTests}
        isStandardTestsLoading={isStandardTestsLoading}
        showQuizDrawer={showQuizDrawer}
        setShowQuizDrawer={setShowQuizDrawer}
        showAudioDrawer={showAudioDrawer}
        setShowAudioDrawer={setShowAudioDrawer}
        handleFilesUpload={handleFilesUpload}
        showDocumentDrawer={showDocumentDrawer}
        setShowDocumentDrawer={setShowDocumentDrawer}
        showLinkDrawer={showLinkDrawer}
        setShowLinkDrawer={setShowLinkDrawer}
        notes={notes}
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        importSource={importSource}
        setImportSource={setImportSource}
        importSearch={importSearch}
        setImportSearch={setImportSearch}
        importItems={importItems}
        selectedImportItems={selectedImportItems}
        setSelectedImportItems={setSelectedImportItems}
        isImportLoading={isImportLoading}
        handleImportAction={handleImportAction}
        showFolderModal={showFolderModal}
        setShowFolderModal={setShowFolderModal}
        setEditingFolder={setEditingFolder}
        handleFolderSubmit={handleFolderSubmit}
        uploadFolderImage={uploadFolderImage}
        editingFolder={editingFolder}
        showVideoModal={showVideoModal}
        setShowVideoModal={setShowVideoModal}
        setEditingVideo={setEditingVideo}
        handleVideoSubmit={handleVideoSubmit}
        editingVideo={editingVideo}
        showNoteModal={showNoteModal}
        setShowNoteModal={setShowNoteModal}
        setEditingNote={setEditingNote}
        handleNoteSubmit={handleNoteSubmit}
        uploadAPI={uploadAPI}
        editingNote={editingNote}
        showTestModal={showTestModal}
        setShowTestModal={setShowTestModal}
        setEditingTest={setEditingTest}
        handleTestSubmit={handleTestSubmit}
        editingTest={editingTest}
        showQuestionModal={showQuestionModal}
        setShowQuestionModal={setShowQuestionModal}
        setEditingQuestion={setEditingQuestion}
        handleQuestionSubmit={handleQuestionSubmit}
        editingQuestion={editingQuestion}
        showImageDrawer={showImageDrawer}
        setShowImageDrawer={setShowImageDrawer}
        showDocumentModal={showDocumentModal}
        setShowDocumentModal={setShowDocumentModal}
      />

    </>
  );
};

export default CourseContentManager;


