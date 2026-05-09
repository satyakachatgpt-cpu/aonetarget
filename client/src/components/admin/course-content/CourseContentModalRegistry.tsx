import React from 'react';
import CourseContentModals from './CourseContentModals';

export interface CourseContentModalRegistryProps {
  modalState: {
    showLiveStreamModal: boolean;
    showYoutubeZoomModal: boolean;
    showYoutubeZoomSEO: boolean;
    showWebinarModal: boolean;
    showSubjectiveTestDrawer: boolean;
    showOMRDrawer: boolean;
    showTestDrawer: boolean;
    showQuizDrawer: boolean;
    showAudioDrawer: boolean;
    showDocumentDrawer: boolean;
    showLinkDrawer: boolean;
    showImportModal: boolean;
    showFolderModal: boolean;
    showVideoModal: boolean;
    showNoteModal: boolean;
    showTestModal: boolean;
    showQuestionModal: boolean;
    showImageDrawer: boolean;
    showDocumentModal: boolean;
    showBulkActionDrawer: boolean;
  };
  modalSetters: {
    setShowLiveStreamModal: (show: boolean) => void;
    setShowYoutubeZoomModal: (show: boolean) => void;
    setShowYoutubeZoomSEO: (show: boolean) => void;
    setShowWebinarModal: (show: boolean) => void;
    setShowSubjectiveTestDrawer: (show: boolean) => void;
    setShowOMRDrawer: (show: boolean) => void;
    setShowTestDrawer: (show: boolean) => void;
    setShowQuizDrawer: (show: boolean) => void;
    setShowAudioDrawer: (show: boolean) => void;
    setShowDocumentDrawer: (show: boolean) => void;
    setShowLinkDrawer: (show: boolean) => void;
    setShowImportModal: (show: boolean) => void;
    setShowFolderModal: (show: boolean) => void;
    setShowVideoModal: (show: boolean) => void;
    setShowNoteModal: (show: boolean) => void;
    setShowTestModal: (show: boolean) => void;
    setShowQuestionModal: (show: boolean) => void;
    setShowImageDrawer: (show: boolean) => void;
    setShowDocumentModal: (show: boolean) => void;
    setShowBulkActionDrawer: (show: boolean) => void;
    setShowSubjectiveDropdown?: (show: boolean) => void;
  };
  forms: {
    liveStreamForm: any;
    youtubeZoomForm: any;
    webinarForm: any;
    importSource: string;
    importSearch: string;
    selectedImportItems: any[];
    subjectiveTestSearch: string;
  };
  formSetters: {
    setLiveStreamForm: (form: any) => void;
    setYoutubeZoomForm: (form: any) => void;
    setWebinarForm: (form: any) => void;
    setImportSource: (source: string) => void;
    setImportSearch: (search: string) => void;
    setSelectedImportItems: (items: any[]) => void;
    setSubjectiveTestSearch?: (search: string) => void;
    setSelectedSubjectiveList?: (list: any[]) => void;
  };
  refs: {
    liveStreamImageRef: React.RefObject<HTMLInputElement>;
    liveStreamPdf1Ref: React.RefObject<HTMLInputElement>;
    liveStreamPdf2Ref: React.RefObject<HTMLInputElement>;
    liveStreamStudyMaterialRef: React.RefObject<HTMLInputElement>;
    youtubeZoomImageRef: React.RefObject<HTMLInputElement>;
    youtubeZoomPdf1Ref: React.RefObject<HTMLInputElement>;
    youtubeZoomPdf2Ref: React.RefObject<HTMLInputElement>;
    youtubeZoomStudyMaterialRef: React.RefObject<HTMLInputElement>;
    webinarImageRef: React.RefObject<HTMLInputElement>;
    webinarPdf1Ref: React.RefObject<HTMLInputElement>;
    webinarPdf2Ref: React.RefObject<HTMLInputElement>;
    webinarStudyMaterialRef: React.RefObject<HTMLInputElement>;
  };
  editState: {
    editingYoutubeZoom: any;
    editingFolder: any;
    editingVideo: any;
    editingNote: any;
    editingTest: any;
    editingQuestion: any;
  };
  editSetters: {
    setEditingFolder: (folder: any) => void;
    setEditingVideo: (video: any) => void;
    setEditingNote: (note: any) => void;
    setEditingTest: (test: any) => void;
    setEditingQuestion: (question: any) => void;
  };
  handlers: {
    handleLiveStreamImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleLiveStreamFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
    handleLiveStreamSubmit: () => void;
    handleYoutubeZoomImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleYoutubeZoomSubmit: () => void;
    handleWebinarImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleWebinarFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
    handleWebinarSubmit: () => void;
    fetchTestsBySeries: (id: string, type: string) => void;
    handleFilesUpload: (files: File[], type: string) => void;
    handleImportAction: (action: 'move' | 'copy') => void;
    handleFolderSubmit: (data: any) => void;
    uploadFolderImage: (file: File) => Promise<string>;
    handleVideoSubmit: (data: any) => void;
    handleNoteSubmit: (data: any) => void;
    handleTestSubmit: (data: any) => void;
    handleQuestionSubmit: (data: any) => void;
    resetYoutubeZoomForm: () => void;
  };
  context: {
    courses: any[];
    testSeriesList: any[];
    isTestSeriesLoading: boolean;
    omrTests: any[];
    isOMRTestsLoading: boolean;
    selectedCourse: any;
    currentFolder: any;
    API_BASE_URL: string;
    loadCourseContent: () => void;
    standardTests: any[];
    isStandardTestsLoading: boolean;
    notes: any[];
    importItems: any[];
    isImportLoading: boolean;
    uploadAPI: any;
    getAuthHeaders: () => any;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    getImageUrl: (url: string) => string;
  };
}

const CourseContentModalRegistry: React.FC<CourseContentModalRegistryProps> = ({
  modalState,
  modalSetters,
  forms,
  formSetters,
  refs,
  editState,
  editSetters,
  handlers,
  context
}) => {
  return (
    <CourseContentModals
      showLiveStreamModal={modalState.showLiveStreamModal}
      setShowLiveStreamModal={modalSetters.setShowLiveStreamModal}
      liveStreamForm={forms.liveStreamForm}
      setLiveStreamForm={formSetters.setLiveStreamForm}
      liveStreamImageRef={refs.liveStreamImageRef}
      handleLiveStreamImageUpload={handlers.handleLiveStreamImageUpload}
      liveStreamPdf1Ref={refs.liveStreamPdf1Ref}
      liveStreamPdf2Ref={refs.liveStreamPdf2Ref}
      liveStreamStudyMaterialRef={refs.liveStreamStudyMaterialRef}
      handleLiveStreamFileUpload={handlers.handleLiveStreamFileUpload}
      handleLiveStreamSubmit={handlers.handleLiveStreamSubmit}
      showYoutubeZoomModal={modalState.showYoutubeZoomModal}
      setShowYoutubeZoomModal={modalSetters.setShowYoutubeZoomModal}
      editingYoutubeZoom={editState.editingYoutubeZoom}
      youtubeZoomForm={forms.youtubeZoomForm}
      setYoutubeZoomForm={formSetters.setYoutubeZoomForm}
      youtubeZoomImageRef={refs.youtubeZoomImageRef}
      handleYoutubeZoomImageUpload={handlers.handleYoutubeZoomImageUpload}
      youtubeZoomPdf1Ref={refs.youtubeZoomPdf1Ref}
      youtubeZoomPdf2Ref={refs.youtubeZoomPdf2Ref}
      youtubeZoomStudyMaterialRef={refs.youtubeZoomStudyMaterialRef}
      handleYoutubeZoomSubmit={handlers.handleYoutubeZoomSubmit}
      resetYoutubeZoomForm={handlers.resetYoutubeZoomForm}
      showYoutubeZoomSEO={modalState.showYoutubeZoomSEO}
      setShowYoutubeZoomSEO={modalSetters.setShowYoutubeZoomSEO}
      getAuthHeaders={context.getAuthHeaders}
      showToast={context.showToast}
      showWebinarModal={modalState.showWebinarModal}
      setShowWebinarModal={modalSetters.setShowWebinarModal}
      webinarForm={forms.webinarForm}
      setWebinarForm={formSetters.setWebinarForm}
      getImageUrl={context.getImageUrl}
      webinarImageRef={refs.webinarImageRef}
      handleWebinarImageUpload={handlers.handleWebinarImageUpload}
      webinarPdf1Ref={refs.webinarPdf1Ref}
      webinarPdf2Ref={refs.webinarPdf2Ref}
      webinarStudyMaterialRef={refs.webinarStudyMaterialRef}
      handleWebinarFileUpload={handlers.handleWebinarFileUpload}
      handleWebinarSubmit={handlers.handleWebinarSubmit}
      showSubjectiveTestDrawer={modalState.showSubjectiveTestDrawer}
      setShowSubjectiveTestDrawer={modalSetters.setShowSubjectiveTestDrawer}
      setSubjectiveTestSearch={formSetters.setSubjectiveTestSearch}
      setShowSubjectiveDropdown={modalSetters.setShowSubjectiveDropdown}
      setSelectedSubjectiveList={formSetters.setSelectedSubjectiveList}
      courses={context.courses}
      showOMRDrawer={modalState.showOMRDrawer}
      setShowOMRDrawer={modalSetters.setShowOMRDrawer}
      testSeriesList={context.testSeriesList}
      isTestSeriesLoading={context.isTestSeriesLoading}
      fetchTestsBySeries={handlers.fetchTestsBySeries}
      omrTests={context.omrTests}
      isOMRTestsLoading={context.isOMRTestsLoading}
      selectedCourse={context.selectedCourse}
      currentFolder={context.currentFolder}
      API_BASE_URL={context.API_BASE_URL}
      loadCourseContent={context.loadCourseContent}
      showTestDrawer={modalState.showTestDrawer}
      setShowTestDrawer={modalSetters.setShowTestDrawer}
      standardTests={context.standardTests}
      isStandardTestsLoading={context.isStandardTestsLoading}
      showQuizDrawer={modalState.showQuizDrawer}
      setShowQuizDrawer={modalSetters.setShowQuizDrawer}
      showAudioDrawer={modalState.showAudioDrawer}
      setShowAudioDrawer={modalSetters.setShowAudioDrawer}
      handleFilesUpload={handlers.handleFilesUpload}
      showDocumentDrawer={modalState.showDocumentDrawer}
      setShowDocumentDrawer={modalSetters.setShowDocumentDrawer}
      showLinkDrawer={modalState.showLinkDrawer}
      setShowLinkDrawer={modalSetters.setShowLinkDrawer}
      notes={context.notes}
      showImportModal={modalState.showImportModal}
      setShowImportModal={modalSetters.setShowImportModal}
      importSource={forms.importSource}
      setImportSource={formSetters.setImportSource}
      importSearch={forms.importSearch}
      setImportSearch={formSetters.setImportSearch}
      importItems={context.importItems}
      selectedImportItems={forms.selectedImportItems}
      setSelectedImportItems={formSetters.setSelectedImportItems}
      isImportLoading={context.isImportLoading}
      handleImportAction={handlers.handleImportAction}
      showFolderModal={modalState.showFolderModal}
      setShowFolderModal={modalSetters.setShowFolderModal}
      setEditingFolder={editSetters.setEditingFolder}
      handleFolderSubmit={handlers.handleFolderSubmit}
      uploadFolderImage={handlers.uploadFolderImage}
      editingFolder={editState.editingFolder}
      showVideoModal={modalState.showVideoModal}
      setShowVideoModal={modalSetters.setShowVideoModal}
      setEditingVideo={editSetters.setEditingVideo}
      handleVideoSubmit={handlers.handleVideoSubmit}
      editingVideo={editState.editingVideo}
      showNoteModal={modalState.showNoteModal}
      setShowNoteModal={modalSetters.setShowNoteModal}
      setEditingNote={editSetters.setEditingNote}
      handleNoteSubmit={handlers.handleNoteSubmit}
      uploadAPI={context.uploadAPI}
      editingNote={editState.editingNote}
      showTestModal={modalState.showTestModal}
      setShowTestModal={modalSetters.setShowTestModal}
      setEditingTest={editSetters.setEditingTest}
      handleTestSubmit={handlers.handleTestSubmit}
      editingTest={editState.editingTest}
      showQuestionModal={modalState.showQuestionModal}
      setShowQuestionModal={modalSetters.setShowQuestionModal}
      setEditingQuestion={editSetters.setEditingQuestion}
      handleQuestionSubmit={handlers.handleQuestionSubmit}
      editingQuestion={editState.editingQuestion}
      showImageDrawer={modalState.showImageDrawer}
      setShowImageDrawer={modalSetters.setShowImageDrawer}
      showDocumentModal={modalState.showDocumentModal}
      setShowDocumentModal={modalSetters.setShowDocumentModal}
    />
  );
};

export default CourseContentModalRegistry;
