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
import CourseContentModalRegistry from './course-content/CourseContentModalRegistry';
import ContentListWrapper from './course-content/ContentListWrapper';
import AddCourse from './AddCourse';
import BulkActionsDrawer from './BulkActionsDrawer';
import { useCourseContentHandlers } from './course-content/hooks/useCourseContentHandlers';
import { useCourseContentCounts } from './course-content/hooks/useCourseContentCounts';
import { useCourseContentSearch } from './course-content/hooks/useCourseContentSearch';
import { useCourseContentBulk } from './course-content/hooks/useCourseContentBulk';
import { useCourseContentUIState } from './course-content/hooks/useCourseContentUIState';
import { normalizeId, getAnyId, getParentFolderId, folderMatches, isChildOfFolder } from './course-content/courseContentUtils';
import { 
  Course, Video, Note, Test, Question, VideoForm, YoutubeZoomForm, WebinarForm, Folder, BulkContentItem,
  CourseContentManagerProps as Props 
} from './course-content/CourseContent.types';
import { API_BASE_URL } from './course-content/CourseContent.constants';
import { 
  initialYoutubeZoomForm, initialLiveStreamForm, initialWebinarForm 
} from './course-content/CourseContent.formUtils';

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


const getAuthHeaders = () => {
  const adminToken = localStorage.getItem('adminToken');
  const adminId = localStorage.getItem('adminId');
  const headers: any = {};
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  if (adminId) headers['x-admin-id'] = adminId;
  return headers;
};


const CourseContentManager: React.FC<Props> = ({ showToast, initialCourse, onClearInitialCourse, onBack, setActiveView, initialMainTab }) => {
  const navigate = useNavigate();
  const [openContentActionMenuId, setOpenContentActionMenuId] = useState<string | null>(null);
  const { 
    modalState, modalSetters, editState, editSetters, 
    standardForms, standardFormSetters, standardFormResetters 
  } = useCourseContentUIState();
  const {
    showYoutubeZoomModal, showLiveStreamModal, showWebinarModal, showYoutubeZoomSEO,
    showImportModal, showFolderModal, showVideoModal, showNoteModal, showTestModal,
    showQuestionModal, showDocumentModal, showTestDrawer, showQuizDrawer,
    showAudioDrawer, showDocumentDrawer, showLinkDrawer, showImageDrawer,
    showSubjectiveTestDrawer, showOMRDrawer
  } = modalState;
  const {
    setShowYoutubeZoomModal, setShowLiveStreamModal, setShowWebinarModal, setShowYoutubeZoomSEO,
    setShowImportModal, setShowFolderModal, setShowVideoModal, setShowNoteModal, setShowTestModal,
    setShowQuestionModal, setShowDocumentModal, setShowTestDrawer, setShowQuizDrawer,
    setShowAudioDrawer, setShowDocumentDrawer, setShowLinkDrawer, setShowImageDrawer,
    setShowSubjectiveTestDrawer, setShowOMRDrawer,
    setShowSubjectiveDropdown, setShowCourseEditModal
  } = modalSetters;
  const {
    editingYoutubeZoom, editingVideo, editingNote, editingTest, editingFolder,
    editingQuestion, currentTestForQuestions, selectedImportItems
  } = editState;
  const {
    setEditingYoutubeZoom, setEditingVideo, setEditingNote, setEditingTest,
    setEditingFolder, setEditingQuestion, setCurrentTestForQuestions, setSelectedImportItems
  } = editSetters;

  const {
    videoForm, noteForm, testForm, questionForm
  } = standardForms;
  const {
    setVideoForm, setNoteForm, setTestForm, setQuestionForm
  } = standardFormSetters;
  const {
    resetVideoForm, resetNoteForm, resetTestForm, resetQuestionForm
  } = standardFormResetters;

  const [selectedBulkActionId, setSelectedBulkActionId] = useState<string | null>(null);

  const [youtubeZoomForm, setYoutubeZoomForm] = useState<YoutubeZoomForm>(initialYoutubeZoomForm);

  const [liveStreamForm, setLiveStreamForm] = useState(initialLiveStreamForm);

  const [webinarForm, setWebinarForm] = useState<WebinarForm>(initialWebinarForm);

  const resetYoutubeZoomForm = () => {
    setYoutubeZoomForm(initialYoutubeZoomForm);
    setEditingYoutubeZoom(null);
  };

  const resetLiveStreamForm = () => {
    setLiveStreamForm(initialLiveStreamForm);
  };

  const resetWebinarForm = () => {
    setWebinarForm(initialWebinarForm);
  };




  const [subjectiveTestSearch, setSubjectiveTestSearch] = useState('');
  const [selectedSubjectiveList, setSelectedSubjectiveList] = useState<any[]>([]);
  const [isSubjectiveLoading, setIsSubjectiveLoading] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState<any>(false);
  const [testSeriesList, setTestSeriesList] = useState<any[]>([]);
  const [isTestSeriesLoading, setIsTestSeriesLoading] = useState(false);
  const [omrTests, setOmrTests] = useState<any[]>([]);
  const [standardTests, setStandardTests] = useState<any[]>([]);
  const [isOMRTestsLoading, setIsOMRTestsLoading] = useState(false);
  const [isStandardTestsLoading, setIsStandardTestsLoading] = useState(false);
  const [importSource, setImportSource] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [availableSubjectiveTests, setAvailableSubjectiveTests] = useState<any[]>([]);
  const [importItems, setImportItems] = useState<any[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [courseFormData, setCourseFormData] = useState<any>({ name: '', description: '', imageUrl: '', price: '0', categoryId: '' });
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
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

  const { folderCounts, allBulkContent } = useCourseContentCounts({
    folders,
    videos,
    notes,
    tests
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
      endTime: video.endTime || video.endDateTime || '',
      recordedLink: video.recordedLink || ''
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



  const [activeLiveStreamTab, setActiveLiveStreamTab] = useState<'basic' | 'advanced'>('basic');

  const [activeYoutubeZoomTab, setActiveYoutubeZoomTab] = useState<'basic' | 'advanced'>('basic');


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

  const {
    showBulkActionDrawer,
    setShowBulkActionDrawer,
    bulkActionLoading,
    handleBulkAction
  } = useCourseContentBulk({
    selectedCourse,
    allBulkContent,
    API_BASE_URL,
    getAdminHeaders,
    showToast,
    loadCourseContent,
    invalidateCache
  });

  const {
    getFilteredFlatItems,
    getAccordionTreeItems
  } = useCourseContentSearch({
    folders,
    videos,
    notes,
    tests,
    debouncedContentSearch,
    contentStatusFilter,
    contentTypeFilter
  });

  const contentHandlers = useCourseContentHandlers({
    selectedCourse,
    API_BASE_URL,
    getAuthHeaders,
    loadCourseContent,
    showToast,
    navigate,
    setOpenContentActionMenuId,
    handleFolderClick,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleToggleVideoStatus,
    handleToggleNoteStatus,
    handleToggleTestStatus,
    handleToggleVideoFree,
    handleToggleNoteFree,
    handleToggleTestFree,
    handleSendContentNotification,
    handleStartLiveStream,
    handleEndLiveStream,
    handleEditFolder,
    handleEditYoutubeZoom,
    handleEditVideo,
    handleEditNote,
    handleEditTest,
    handleDeleteFolder,
    handleDeleteVideo,
    handleDeleteNote,
    handleDeleteTest
  });


  const renderAccordionTree = (parentId: string | null = null, level: number = 0, visited = new Set<string>()) => {
    // Cycle Protection: Prevent infinite recursion if folder hierarchy has a loop
    if (parentId && visited.has(parentId)) return null;
    if (parentId) visited.add(parentId);

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
        renderChildTree={(pid, lvl) => renderAccordionTree(pid, lvl, visited)}
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
        resetYoutubeZoomForm={resetYoutubeZoomForm}
        fetchTestSeriesList={fetchTestSeriesList}
        setShowTestDrawer={setShowTestDrawer}
        setShowDocumentModal={setShowDocumentModal}
        setShowImportModal={setShowImportModal}
        showFullDesc={showFullDesc}
        setShowFullDesc={setShowFullDesc}
        handleEditCourseClick={handleEditCourseClick}
        onBulkActionClick={() => setShowBulkActionDrawer(true)}
      />
      <CourseContentModalRegistry
        modalState={{ ...modalState, showBulkActionDrawer }}
        modalSetters={{ ...modalSetters, setShowBulkActionDrawer }}
        forms={{
          liveStreamForm, activeLiveStreamTab, youtubeZoomForm, activeYoutubeZoomTab,
          webinarForm, activeWebinarTab, importSource, importSearch,
          selectedImportItems, subjectiveTestSearch
        }}
        formSetters={{
          setLiveStreamForm, setActiveLiveStreamTab, setYoutubeZoomForm, setActiveYoutubeZoomTab,
          setWebinarForm, setActiveWebinarTab, setImportSource, setImportSearch,
          setSelectedImportItems, setSubjectiveTestSearch, setSelectedSubjectiveList
        }}
        refs={{
          liveStreamImageRef, liveStreamPdf1Ref, liveStreamPdf2Ref, liveStreamStudyMaterialRef,
          youtubeZoomImageRef, youtubeZoomPdf1Ref, youtubeZoomPdf2Ref, youtubeZoomStudyMaterialRef,
          webinarImageRef, webinarPdf1Ref, webinarPdf2Ref, webinarStudyMaterialRef
        }}
        editState={editState}
        editSetters={editSetters}
        handlers={{
          handleLiveStreamImageUpload, handleLiveStreamFileUpload, handleLiveStreamSubmit,
          handleYoutubeZoomImageUpload, handleYoutubeZoomSubmit, handleWebinarImageUpload,
          handleWebinarFileUpload, handleWebinarSubmit, fetchTestsBySeries, handleFilesUpload,
          handleImportAction, handleFolderSubmit, uploadFolderImage, handleVideoSubmit,
          handleNoteSubmit, handleTestSubmit, handleQuestionSubmit,
          resetYoutubeZoomForm
        }}
        context={{
          courses, testSeriesList, isTestSeriesLoading, omrTests, isOMRTestsLoading,
          selectedCourse, currentFolder, API_BASE_URL, loadCourseContent, standardTests,
          isStandardTestsLoading, notes, importItems, isImportLoading, uploadAPI, getAuthHeaders,
          showToast, getImageUrl
        }}
      />
      <BulkActionsDrawer
        isOpen={showBulkActionDrawer}
        onClose={() => setShowBulkActionDrawer(false)}
        items={allBulkContent}
        onApplyAction={handleBulkAction}
        isLoading={bulkActionLoading}
      />
    </>
  );
};

export default CourseContentManager;


