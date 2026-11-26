import React from 'react';

interface CourseTopNavProps {
  courseTitle: string;
  mainTab: 'overview' | 'content';
  onTabChange: (tab: 'overview' | 'content') => void;
  onBack: () => void;
  onShare: () => void;
  shareSuccess?: boolean;
}

export const CourseTopNav: React.FC<CourseTopNavProps> = ({
  courseTitle,
  mainTab,
  onTabChange,
  onBack,
  onShare,
  shareSuccess,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      {/* Top Bar with Back, Title, Share */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
          aria-label="Back"
        >
          <span className="material-symbols-rounded text-2xl font-bold">arrow_back</span>
        </button>

        <h1 className="text-sm font-black text-gray-900 truncate mx-3 flex-1 text-center font-outfit">
          {courseTitle}
        </h1>

        <div className="relative">
          <button
            onClick={onShare}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
            aria-label="Share"
          >
            <span className="material-symbols-rounded text-xl">share</span>
          </button>
          {shareSuccess && (
            <div className="absolute top-10 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md whitespace-nowrap animate-fade-in z-40">
              Copied!
            </div>
          )}
        </div>
      </div>

      {/* Segmented Pill Tabs Matching Screenshot 6 */}
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-0.5 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => onTabChange('overview')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 shrink-0 ${
            mainTab === 'overview'
              ? 'bg-[#1e293b] text-white shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>Overview</span>
        </button>

        <button
          onClick={() => onTabChange('content')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 shrink-0 ${
            mainTab === 'content'
              ? 'bg-[#1e293b] text-white shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>Content</span>
        </button>
      </div>
    </div>
  );
};
