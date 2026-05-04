import React from 'react';
import { createPortal } from 'react-dom';
import StandardContentModals from './modals/StandardContentModals';
import ImportContentModal from './modals/ImportContentModal';
import LiveStreamDrawer from './modals/LiveStreamDrawer';
import YoutubeZoomDrawer from './modals/YoutubeZoomDrawer';
import WebinarDrawer from './modals/WebinarDrawer';
import SubjectiveTestDrawer from '../SubjectiveTestDrawer';
import { OMRTestDrawer, TestDrawer, QuizDrawer, LinkDrawer, UploadDrawer } from '../FeatureDrawers';

interface CourseContentModalsProps {
  showLiveStreamModal: boolean;
  setShowLiveStreamModal: (show: boolean) => void;
  activeLiveStreamTab: 'basic' | 'advanced';
  setActiveLiveStreamTab: (tab: 'basic' | 'advanced') => void;
  liveStreamForm: any;
  setLiveStreamForm: (form: any) => void;
  liveStreamImageRef: React.RefObject<HTMLInputElement>;
  handleLiveStreamImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  liveStreamPdf1Ref: React.RefObject<HTMLInputElement>;
  liveStreamPdf2Ref: React.RefObject<HTMLInputElement>;
  liveStreamStudyMaterialRef: React.RefObject<HTMLInputElement>;
  handleLiveStreamFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  handleLiveStreamSubmit: () => void;
  showYoutubeZoomModal: boolean;
  setShowYoutubeZoomModal: (show: boolean) => void;
  editingYoutubeZoom: any;
  activeYoutubeZoomTab: 'basic' | 'advanced';
  setActiveYoutubeZoomTab: (tab: 'basic' | 'advanced') => void;
  youtubeZoomForm: any;
  setYoutubeZoomForm: (form: any | ((prev: any) => any)) => void;
  youtubeZoomImageRef: React.RefObject<HTMLInputElement>;
  handleYoutubeZoomImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  youtubeZoomPdf1Ref: React.RefObject<HTMLInputElement>;
  youtubeZoomPdf2Ref: React.RefObject<HTMLInputElement>;
  youtubeZoomStudyMaterialRef: React.RefObject<HTMLInputElement>;
  handleYoutubeZoomSubmit: () => void;
  resetYoutubeZoomForm: () => void;
  showYoutubeZoomSEO: boolean;
  setShowYoutubeZoomSEO: (show: boolean) => void;
  getAuthHeaders: () => any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  showWebinarModal: boolean;
  setShowWebinarModal: (show: boolean) => void;
  activeWebinarTab: 'basic' | 'advanced';
  setActiveWebinarTab: (tab: 'basic' | 'advanced') => void;
  webinarForm: any;
  setWebinarForm: (form: any) => void;
  getImageUrl: (url: string) => string;
  webinarImageRef: React.RefObject<HTMLInputElement>;
  handleWebinarImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  webinarPdf1Ref: React.RefObject<HTMLInputElement>;
  webinarPdf2Ref: React.RefObject<HTMLInputElement>;
  webinarStudyMaterialRef: React.RefObject<HTMLInputElement>;
  handleWebinarFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  handleWebinarSubmit: () => void;
  showSubjectiveTestDrawer: boolean;
  setShowSubjectiveTestDrawer: (show: boolean) => void;
  setSubjectiveTestSearch?: (search: string) => void;
  setShowSubjectiveDropdown?: (show: boolean) => void;
  setSelectedSubjectiveList?: (list: any[]) => void;
  courses: any[];
  showOMRDrawer: boolean;
  setShowOMRDrawer: (show: boolean) => void;
  testSeriesList: any[];
  isTestSeriesLoading: boolean;
  fetchTestsBySeries: (id: string, type: string) => void;
  omrTests: any[];
  isOMRTestsLoading: boolean;
  selectedCourse: any;
  currentFolder: any;
  API_BASE_URL: string;
  loadCourseContent: () => void;
  showTestDrawer: boolean;
  setShowTestDrawer: (show: boolean) => void;
  standardTests: any[];
  isStandardTestsLoading: boolean;
  showQuizDrawer: boolean;
  setShowQuizDrawer: (show: boolean) => void;
  showAudioDrawer: boolean;
  setShowAudioDrawer: (show: boolean) => void;
  handleFilesUpload: (files: File[], type: string) => void;
  showDocumentDrawer: boolean;
  setShowDocumentDrawer: (show: boolean) => void;
  showLinkDrawer: boolean;
  setShowLinkDrawer: (show: boolean) => void;
  notes: any[];
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  importSource: string;
  setImportSource: (source: string) => void;
  importSearch: string;
  setImportSearch: (search: string) => void;
  importItems: any[];
  selectedImportItems: any[];
  setSelectedImportItems: (items: any[] | ((prev: any[]) => any[])) => void;
  isImportLoading: boolean;
  handleImportAction: (action: 'move' | 'copy') => void;
  showFolderModal: boolean;
  setShowFolderModal: (show: boolean) => void;
  setEditingFolder: (folder: any) => void;
  handleFolderSubmit: (data: any) => void;
  uploadFolderImage: (file: File) => Promise<string>;
  editingFolder: any;
  showVideoModal: boolean;
  setShowVideoModal: (show: boolean) => void;
  setEditingVideo: (video: any) => void;
  handleVideoSubmit: (data: any) => void;
  editingVideo: any;
  showNoteModal: boolean;
  setShowNoteModal: (show: boolean) => void;
  setEditingNote: (note: any) => void;
  handleNoteSubmit: (data: any) => void;
  uploadAPI: any;
  editingNote: any;
  showTestModal: boolean;
  setShowTestModal: (show: boolean) => void;
  setEditingTest: (test: any) => void;
  handleTestSubmit: (data: any) => void;
  editingTest: any;
  showQuestionModal: boolean;
  setShowQuestionModal: (show: boolean) => void;
  setEditingQuestion: (question: any) => void;
  handleQuestionSubmit: (data: any) => void;
  editingQuestion: any;
  showImageDrawer: boolean;
  setShowImageDrawer: (show: boolean) => void;
  showDocumentModal: boolean;
  setShowDocumentModal: (show: boolean) => void;
}

const CourseContentModals: React.FC<CourseContentModalsProps> = (props) => {
  const {
    showLiveStreamModal,
    setShowLiveStreamModal,
    activeLiveStreamTab,
    setActiveLiveStreamTab,
    liveStreamForm,
    setLiveStreamForm,
    liveStreamImageRef,
    handleLiveStreamImageUpload,
    liveStreamPdf1Ref,
    liveStreamPdf2Ref,
    liveStreamStudyMaterialRef,
    handleLiveStreamFileUpload,
    handleLiveStreamSubmit,
    showYoutubeZoomModal,
    setShowYoutubeZoomModal,
    editingYoutubeZoom,
    activeYoutubeZoomTab,
    setActiveYoutubeZoomTab,
    youtubeZoomForm,
    setYoutubeZoomForm,
    youtubeZoomImageRef,
    handleYoutubeZoomImageUpload,
    youtubeZoomPdf1Ref,
    youtubeZoomPdf2Ref,
    youtubeZoomStudyMaterialRef,
    handleYoutubeZoomSubmit,
    showYoutubeZoomSEO,
    setShowYoutubeZoomSEO,
    getAuthHeaders,
    showToast,
    showWebinarModal,
    setShowWebinarModal,
    activeWebinarTab,
    setActiveWebinarTab,
    webinarForm,
    setWebinarForm,
    getImageUrl,
    webinarImageRef,
    handleWebinarImageUpload,
    webinarPdf1Ref,
    webinarPdf2Ref,
    webinarStudyMaterialRef,
    handleWebinarFileUpload,
    handleWebinarSubmit,
    showSubjectiveTestDrawer,
    setShowSubjectiveTestDrawer,
    setSubjectiveTestSearch,
    setShowSubjectiveDropdown,
    setSelectedSubjectiveList,
    courses,
    showOMRDrawer,
    setShowOMRDrawer,
    testSeriesList,
    isTestSeriesLoading,
    fetchTestsBySeries,
    omrTests,
    isOMRTestsLoading,
    selectedCourse,
    currentFolder,
    API_BASE_URL,
    loadCourseContent,
    showTestDrawer,
    setShowTestDrawer,
    standardTests,
    isStandardTestsLoading,
    showQuizDrawer,
    setShowQuizDrawer,
    showAudioDrawer,
    setShowAudioDrawer,
    handleFilesUpload,
    showDocumentDrawer,
    setShowDocumentDrawer,
    showLinkDrawer,
    setShowLinkDrawer,
    notes,
    showImportModal,
    setShowImportModal,
    importSource,
    setImportSource,
    importSearch,
    setImportSearch,
    importItems,
    selectedImportItems,
    setSelectedImportItems,
    isImportLoading,
    handleImportAction,
    showFolderModal,
    setShowFolderModal,
    setEditingFolder,
    handleFolderSubmit,
    uploadFolderImage,
    editingFolder,
    showVideoModal,
    setShowVideoModal,
    setEditingVideo,
    handleVideoSubmit,
    editingVideo,
    showNoteModal,
    setShowNoteModal,
    setEditingNote,
    handleNoteSubmit,
    uploadAPI,
    editingNote,
    showTestModal,
    setShowTestModal,
    setEditingTest,
    handleTestSubmit,
    editingTest,
    showQuestionModal,
    setShowQuestionModal,
    setEditingQuestion,
    handleQuestionSubmit,
    editingQuestion,
    showImageDrawer,
    setShowImageDrawer,
    showDocumentModal,
    setShowDocumentModal,
    resetYoutubeZoomForm
  } = props;

  return (
    <>
      <LiveStreamDrawer
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
      />

      <YoutubeZoomDrawer
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
        showYoutubeZoomSEO={showYoutubeZoomSEO}
        setShowYoutubeZoomSEO={setShowYoutubeZoomSEO}
        handleYoutubeZoomSubmit={handleYoutubeZoomSubmit}
        resetYoutubeZoomForm={resetYoutubeZoomForm}
        getAuthHeaders={getAuthHeaders}
        showToast={showToast}
      />

      <WebinarDrawer
        showWebinarModal={showWebinarModal}
        setShowWebinarModal={setShowWebinarModal}
        activeWebinarTab={activeWebinarTab}
        setActiveWebinarTab={setActiveWebinarTab}
        webinarForm={webinarForm}
        setWebinarForm={setWebinarForm}
        webinarImageRef={webinarImageRef}
        handleWebinarImageUpload={handleWebinarImageUpload}
        webinarPdf1Ref={webinarPdf1Ref}
        webinarPdf2Ref={webinarPdf2Ref}
        webinarStudyMaterialRef={webinarStudyMaterialRef}
        handleWebinarFileUpload={handleWebinarFileUpload}
        handleWebinarSubmit={handleWebinarSubmit}
        getImageUrl={getImageUrl}
      />



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
              const testData = { 
                ...test, 
                sourceTestId: test.id || test._id, // Store source ID for question copying
                courseId, 
                folderId, 
                id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` 
              };
              await fetch(`${API_BASE_URL}/courses/${courseId}/tests`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
              const testData = { 
                ...test, 
                sourceTestId: test.id || test._id, // Store source ID for question copying
                courseId, 
                folderId, 
                id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` 
              };
              await fetch(`${API_BASE_URL}/courses/${courseId}/tests`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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

      {showQuizDrawer && (
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
                  headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
      )}

      <UploadDrawer
        isOpen={showAudioDrawer}
        onClose={() => setShowAudioDrawer(false)}
        title="Add Audio File(s)"
        subtitle="Upload Audio"
        accept="audio/*"
        onSubmit={(files) => handleFilesUpload(files, 'audio')}
      />

      <UploadDrawer
        isOpen={showDocumentDrawer}
        onClose={() => setShowDocumentDrawer(false)}
        title="Add Document(s) / Note(s)"
        subtitle="Upload Files"
        accept=".pdf,.doc,.docx,application/pdf"
        onSubmit={(files) => handleFilesUpload(files, 'document')}
      />

      {showLinkDrawer && (
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
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
      )}

      <ImportContentModal
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
        courses={courses}
        handleImportAction={handleImportAction}
      />
      <StandardContentModals
        showFolderModal={showFolderModal}
        setShowFolderModal={setShowFolderModal}
        handleFolderSubmit={handleFolderSubmit}
        uploadFolderImage={uploadFolderImage}
        editingFolder={editingFolder}
        setEditingFolder={setEditingFolder}
        showToast={showToast}
        showVideoModal={showVideoModal}
        setShowVideoModal={setShowVideoModal}
        handleVideoSubmit={handleVideoSubmit}
        editingVideo={editingVideo}
        setEditingVideo={setEditingVideo}
        showNoteModal={showNoteModal}
        setShowNoteModal={setShowNoteModal}
        handleNoteSubmit={handleNoteSubmit}
        uploadAPI={uploadAPI}
        editingNote={editingNote}
        setEditingNote={setEditingNote}
        showTestModal={showTestModal}
        setShowTestModal={setShowTestModal}
        handleTestSubmit={handleTestSubmit}
        editingTest={editingTest}
        setEditingTest={setEditingTest}
        courses={courses}
        showQuestionModal={showQuestionModal}
        setShowQuestionModal={setShowQuestionModal}
        handleQuestionSubmit={handleQuestionSubmit}
        editingQuestion={editingQuestion}
        setEditingQuestion={setEditingQuestion}
        showImageDrawer={showImageDrawer}
        setShowImageDrawer={setShowImageDrawer}
        handleFilesUpload={handleFilesUpload}
        showDocumentModal={showDocumentModal}
        setShowDocumentModal={setShowDocumentModal}
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
    </>
  );
};

export default CourseContentModals;
