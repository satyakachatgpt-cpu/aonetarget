import React from 'react';
import { createPortal } from 'react-dom';
import AddFolderDrawer from '../AddFolderDrawer';
import AddVideoDrawer from '../AddVideoDrawer';
import AddNoteDrawer from '../AddNoteDrawer';
import AddTestDrawer from '../AddTestDrawer';
import AddQuestionDrawer from '../AddQuestionDrawer';
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
    setShowDocumentModal
  } = props;

  return (
    <>
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
                        <div className="flex items-center justify-between">
                          <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1280x720 px (16:9 Ratio)</span>
                        </div>
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

      {/* --- ADD LIVE STREAM DRAWER --- */}
      {
        showYoutubeZoomModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex justify-end">
            <div
              className="absolute inset-0 bg-black/50 animate-fade-in transition-opacity"
              onClick={() => { setShowYoutubeZoomModal(false); }}
            />
            <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden transition-all duration-300">
              {/* Header */}
              <div className="flex justify-between items-center px-8 py-4 border-b border-gray-100 shrink-0">
                <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">{editingYoutubeZoom ? 'Edit Live stream' : 'Add Live stream'}</h3>
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
                  className={`flex-1 flex items-center justify-center py-3 text-[15px] font-bold transition-all relative ${activeYoutubeZoomTab === 'basic' ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Basic
                </button>
                <div className="w-[1px] bg-gray-100 my-2" />
                <button
                  onClick={() => setActiveYoutubeZoomTab('advanced')}
                  className={`flex-1 flex items-center justify-center py-3 text-[15px] font-bold transition-all relative ${activeYoutubeZoomTab === 'advanced' ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Advanced
                </button>
              </div>

              {/* Content Area - Scrollable */}
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 pb-10">
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

                      {/* Status Toggle */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Status <span className="text-red-500">*</span></label>
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

                      {/* Platform */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Platform <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select
                            value={youtubeZoomForm.platform || 'YouTube Live'}
                            onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, platform: e.target.value })}
                            className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none shadow-sm"
                          >
                            <option value="Google Meet">Google Meet</option>
                            <option value="Zoom">Zoom</option>
                            <option value="YouTube Live">YouTube Live</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[24px] pointer-events-none">expand_more</span>
                        </div>
                      </div>


                      {/* Meeting Link */}
                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Meeting Link <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={youtubeZoomForm.link}
                          onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, link: e.target.value })}
                          className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                          placeholder="https://..."
                        />
                      </div>

                      {/* Image Upload */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1280x720 px (16:9 Ratio)</span>
                        </div>
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

                    </div>

                    {/* Additional Content Section */}
                    <div className="space-y-8 pt-6 border-t border-gray-50">
                      <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Additional Content</h4>

                      {[1, 2].map((num) => {
                        const fieldName = `pdf${num}` as 'pdf1' | 'pdf2';
                        const fileUrl = youtubeZoomForm[fieldName];
                        const ref = num === 1 ? youtubeZoomPdf1Ref : youtubeZoomPdf2Ref;
                        return (
                          <div key={num} className="space-y-2">
                            <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attach PDF {num}</label>
                            <div className="flex gap-4">
                              <input
                                type="file"
                                ref={ref}
                                className="hidden"
                                accept="application/pdf"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    showToast('Uploading PDF...', 'success');
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    const res = await fetch('/api/v2/upload/pdf', {
                                      method: 'POST',
                                      headers: getAuthHeaders(),
                                      body: formData
                                    });
                                    if (!res.ok) throw new Error('Upload failed');
                                    const data = await res.json();
                                    setYoutubeZoomForm((prev: any) => ({ ...prev, [fieldName]: data.url }));
                                    showToast('PDF uploaded successfully!', 'success');
                                  } catch (error) {
                                    showToast('Failed to upload PDF', 'error');
                                  }
                                }}
                              />
                              <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden relative group">
                                {fileUrl ? (
                                  <div className="flex flex-col items-center gap-2 p-2">
                                    <span className="material-symbols-outlined text-[40px] text-red-500">picture_as_pdf</span>
                                    <span className="text-[11px] font-bold text-[#8e8e8e] text-center w-full break-all truncate block px-2">Uploaded PDF</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                                      <span className="material-symbols-outlined text-[20px] text-[#8e8e8e]">help</span>
                                    </div>
                                    <span className="text-[13px] font-bold text-[#8e8e8e]">No PDF</span>
                                  </>
                                )}
                              </div>
                              <div
                                onClick={() => ref.current?.click()}
                                className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center"
                              >
                                <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">{fileUrl ? 'Change PDF' : 'Upload PDF'}</h4>
                                <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="space-y-2">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Study Material</label>
                        <div className="flex gap-4">
                          <input
                            type="file"
                            ref={youtubeZoomStudyMaterialRef}
                            className="hidden"
                            accept="*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                showToast('Uploading material...', 'success');
                                const formData = new FormData();
                                formData.append('file', file);
                                const res = await fetch('/api/v2/upload/pdf', {
                                  method: 'POST',
                                  headers: getAuthHeaders(),
                                  body: formData
                                });
                                if (!res.ok) throw new Error('Upload failed');
                                const data = await res.json();
                                setYoutubeZoomForm((prev: any) => ({ ...prev, studyMaterial: data.url }));
                                showToast('Material uploaded successfully!', 'success');
                              } catch (error) {
                                showToast('Failed to upload material', 'error');
                              }
                            }}
                          />
                          <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden relative group">
                            {youtubeZoomForm.studyMaterial ? (
                              <div className="flex flex-col items-center gap-2 p-2">
                                <span className="material-symbols-outlined text-[40px] text-blue-500">description</span>
                                <span className="text-[11px] font-bold text-[#8e8e8e] text-center w-full break-all truncate block px-2">Uploaded Material</span>
                              </div>
                            ) : (
                              <>
                                <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                                  <span className="material-symbols-outlined text-[20px] text-[#8e8e8e]">help</span>
                                </div>
                                <span className="text-[13px] font-bold text-[#8e8e8e]">No File</span>
                              </>
                            )}
                          </div>
                          <div
                            onClick={() => youtubeZoomStudyMaterialRef.current?.click()}
                            className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center"
                          >
                            <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">{youtubeZoomForm.studyMaterial ? 'Change File' : 'Upload File'}</h4>
                            <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeYoutubeZoomTab === 'advanced' && (
                  <div className="space-y-10">


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

                        <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-100">
                          <label className="text-[13px] font-bold text-gray-600 tracking-tight uppercase">Stream Visibility</label>
                          <select
                            value={youtubeZoomForm.visibility}
                            onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, visibility: e.target.value as 'public' | 'private' })}
                            className="w-full h-[48px] bg-white border border-gray-200 rounded-[12px] px-4 text-[15px] font-bold outline-none focus:border-gray-400 transition-all cursor-pointer"
                          >
                            <option value="public">Public (Visible to everyone)</option>
                            <option value="private">Private (Only enrolled/invited)</option>
                          </select>
                        </div>
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
                <div className="mt-10 mb-6">
                  <button
                    className="w-full h-[60px] bg-[#1a1c1e] text-white text-[16px] font-bold tracking-tight rounded-[16px] hover:bg-black transition-all flex items-center justify-center shadow-lg active:scale-[0.98]"
                    onClick={handleYoutubeZoomSubmit}
                  >
                    Submit
                  </button>
                </div>
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
                      <div className="flex items-center justify-between">
                        <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1280x720 px (16:9 Ratio)</span>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                          {webinarForm.image ? (
                            <img src={getImageUrl(webinarForm.image)} className="w-full h-full object-cover" alt="Preview" />
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
                    {courses.map(course => (
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
                        importItems.filter(item => (item.title || item.name || '').toLowerCase().includes(importSearch.toLowerCase())).map((item) => {
                          const type = item.type;
                          const title = (item.title || item.name || '').toLowerCase();
                          const isLive = item.platform || item.streamStatus || title.includes('live') || item.contentType === 'live' || item.streamSource;
                          
                          let badgeLabel = '';
                          let badgeColor = '';
                          
                          if (type === 'folder') {
                            badgeLabel = 'FOLDER';
                            badgeColor = 'bg-blue-50 text-blue-600 border-blue-100/50';
                          } else if (type === 'video') {
                            if (isLive) {
                              badgeLabel = 'LIVE';
                              badgeColor = 'bg-red-50 text-red-600 border-red-100/50';
                            } else {
                              badgeLabel = 'VIDEO';
                              badgeColor = 'bg-indigo-50 text-indigo-600 border-indigo-100/50';
                            }
                          } else {
                            // Map notes, documents, and tests to DOCUMENT
                            badgeLabel = 'DOCUMENT';
                            badgeColor = 'bg-teal-50 text-teal-600 border-teal-100/50';
                          }

                          return (
                            <div
                              key={item._id || item.id}
                              onClick={() => {
                                const id = item._id || item.id;
                                setSelectedImportItems((prev: any[]) => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                              }}
                              className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 rounded-[15px] cursor-pointer transition-all border border-transparent group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow transition-all shrink-0">
                                  <span className="material-symbols-outlined text-gray-400 text-[20px]">
                                    {type === 'folder' ? 'folder' : (type === 'video' ? 'videocam' : 'description')}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[15px] font-bold text-gray-700 tracking-tight">{item.title || item.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${badgeColor}`}>
                                      {badgeLabel}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedImportItems.includes(item._id || item.id)}
                                onChange={() => { }} // Handled by div click
                                className="w-5 h-5 accent-black cursor-pointer rounded-md"
                              />
                            </div>
                          );
                        })
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
      {showFolderModal && (
        <AddFolderDrawer
          isOpen={showFolderModal}
          onClose={() => { setShowFolderModal(false); setEditingFolder(null); }}
          onSubmit={handleFolderSubmit}
          onUploadImage={uploadFolderImage}
          editingFolder={editingFolder}
          showToast={showToast}
        />
      )}

      {showVideoModal && (
        <AddVideoDrawer
          isOpen={showVideoModal}
          onClose={() => { setShowVideoModal(false); setEditingVideo(null); }}
          onSubmit={handleVideoSubmit}
          editingVideo={editingVideo}
        />
      )}

      <AddNoteDrawer
        isOpen={showNoteModal}
        onClose={() => { setShowNoteModal(false); setEditingNote(null); }}
        onSubmit={handleNoteSubmit}
        onUploadFile={async (file, type) => {
          if (type === 'note' || type === 'document') {
            const data = await uploadAPI.uploadDocument(file);
            return data.url;
          } else if (type === 'audio') {
            const data = await uploadAPI.uploadVideo(file);
            return data.url;
          } else {
            const data = await uploadAPI.uploadImage(file);
            return data.url;
          }
        }}
        editingNote={editingNote}
      />

      <AddTestDrawer
        isOpen={showTestModal}
        onClose={() => { setShowTestModal(false); setEditingTest(null); }}
        onSubmit={handleTestSubmit}
        editingTest={editingTest}
        courses={courses}
        showToast={showToast}
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
    </>
  );
};

export default CourseContentModals;
