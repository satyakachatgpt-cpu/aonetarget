import React from 'react';

interface ContentHeaderProps {
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
}

const ContentHeader: React.FC<ContentHeaderProps> = ({
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
}) => {
  return (
    <>
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
            <h2 className="text-[17px] font-bold text-gray-900 tracking-tight leading-none">
              {selectedCourse.name || selectedCourse.title || 'Batch'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handlePreview(selectedCourse as any)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[18px]">north_east</span>
            Preview
          </button>
          <button
            onClick={handleTogglePublishWrapper}
            disabled={publishLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 bg-black text-white hover:bg-gray-800 disabled:opacity-60`}
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            {publishLoading ? 'Saving...' : isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="bg-white px-8 flex items-center gap-10 border-b border-gray-100">
        {['Overview', 'Content'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveMainTab(tab)}
            className={`py-4 text-[14px] font-bold transition-all relative shrink-0 ${
              activeMainTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab}
            {activeMainTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </>
  );
};

export default ContentHeader;
