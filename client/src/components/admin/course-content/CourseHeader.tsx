import React from 'react';

interface CourseHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onBulkActionClick: () => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
}

const CourseHeader: React.FC<CourseHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onBulkActionClick,
  isFilterOpen,
  setIsFilterOpen
}) => {
  return (
    <div className="flex items-center gap-3">
      <div className="relative group flex items-center">
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[300px] h-[44px] bg-white border border-gray-200 pl-4 pr-10 text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-400 rounded-[10px]"
        />
      </div>

      <button
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        className="w-[44px] h-[44px] flex items-center justify-center bg-white border border-gray-200 rounded-[10px] text-gray-400 hover:bg-gray-50 transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">tune</span>
      </button>

      <button className="w-[44px] h-[44px] flex items-center justify-center bg-white border border-gray-200 rounded-[10px] text-gray-400 hover:bg-gray-50 transition-all">
        <span className="material-symbols-outlined text-[20px]">swap_vert</span>
      </button>

      <button
        onClick={onBulkActionClick}
        className="flex items-center gap-2 h-[44px] px-4 bg-white border border-gray-200 rounded-[10px] text-gray-600 font-bold text-[14px] hover:bg-gray-50 transition-all"
      >
        <span className="material-symbols-outlined text-[18px] rotate-12">bolt</span>
        Bulk Action
      </button>
    </div>
  );
};

export default CourseHeader;
