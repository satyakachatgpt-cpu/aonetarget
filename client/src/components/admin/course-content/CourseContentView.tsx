import React from 'react';
import CourseContentTreeView from './CourseContentTreeView';
import CourseOverviewView from './CourseOverviewView';
import CourseGroupChat from '../CourseGroupChat';
import CoursePosts from '../CoursePosts';
import ForumManager from '../ForumManager';
import ContentHeader from './ContentHeader';

interface CourseContentViewProps {
  selectedCourse: any;
  onBack?: () => void;
  onClearInitialCourse?: () => void;
  setSelectedCourse: (course: any) => void;
  handlePreview: (course: any) => void;
  handleTogglePublishWrapper: () => void;
  publishLoading: boolean;
  isPublished: boolean;
  activeMainTab: string;
  setActiveMainTab: (tab: string) => void;
  folderStack: any[];
  handleBackClick: () => void;
  currentFolder: any;
  contentSearchQuery: string;
  setContentSearchQuery: (query: string) => void;
  isContentFilterOpen: boolean;
  setIsContentFilterOpen: (open: boolean) => void;
  contentTypeFilter: string;
  setContentTypeFilter: (type: string) => void;
  onBulkActionClick?: () => void;
  rootFilteredItems: any[];
  finalRenderedItems: React.ReactNode;
  setEditingFolder: (folder: any) => void;
  setShowFolderModal: (show: boolean) => void;
  resetVideoForm: () => void;
  setShowVideoModal: (show: boolean) => void;
  setShowDocumentDrawer: (show: boolean) => void;
  setShowYoutubeZoomModal: (show: boolean) => void;
  fetchTestSeriesList: () => void;
  setShowTestDrawer: (show: boolean) => void;
  setShowDocumentModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  showFullDesc: boolean;
  setShowFullDesc: (show: boolean) => void;
  handleEditCourseClick: () => void;
  resetYoutubeZoomForm: () => void;
}

const CourseContentView: React.FC<CourseContentViewProps> = ({
  selectedCourse,
  onBack,
  onClearInitialCourse,
  setSelectedCourse,
  handlePreview,
  handleTogglePublishWrapper,
  publishLoading,
  isPublished,
  activeMainTab,
  setActiveMainTab,
  folderStack,
  handleBackClick,
  currentFolder,
  contentSearchQuery,
  setContentSearchQuery,
  isContentFilterOpen,
  setIsContentFilterOpen,
  contentTypeFilter,
  setContentTypeFilter,
  onBulkActionClick,
  rootFilteredItems,
  finalRenderedItems,
  setEditingFolder,
  setShowFolderModal,
  resetVideoForm,
  setShowVideoModal,
  setShowDocumentDrawer,
  setShowYoutubeZoomModal,
  fetchTestSeriesList,
  setShowTestDrawer,
  setShowDocumentModal,
  setShowImportModal,
  showFullDesc,
  setShowFullDesc,
  handleEditCourseClick,
  resetYoutubeZoomForm
}) => {
  return (
    <div className="space-y-0 animate-fade-in pb-10 min-h-screen bg-[#f5f6f8]">
      <ContentHeader
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
      />

      {activeMainTab === 'Content' ? (
        <div className="flex gap-6 px-6 py-4 max-w-[1600px] mx-auto">
          <CourseContentTreeView
            folderStack={folderStack}
            onBackFolder={handleBackClick}
            currentFolder={currentFolder}
            searchQuery={contentSearchQuery}
            setSearchQuery={setContentSearchQuery}
            isFilterOpen={isContentFilterOpen}
            setIsFilterOpen={setIsContentFilterOpen}
            contentTypeFilter={contentTypeFilter}
            setContentTypeFilter={setContentTypeFilter}
            onBulkActionClick={onBulkActionClick}
            itemsCount={rootFilteredItems.length}
            renderItems={finalRenderedItems}
          />

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
                  { label: 'Live stream', icon: 'videocam', onClick: () => { resetYoutubeZoomForm(); setShowYoutubeZoomModal(true); } },
                  { label: 'Test', icon: 'assignment', onClick: () => { fetchTestSeriesList(); setShowTestDrawer(true); } },
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
        <CourseOverviewView
          course={selectedCourse}
          showFullDesc={showFullDesc}
          setShowFullDesc={setShowFullDesc}
          isPublished={isPublished}
          onEdit={handleEditCourseClick}
        />
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
      )}
    </div>
  );
};

export default CourseContentView;
