import React from 'react';

interface CourseContentToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  contentTypeFilter: string;
  setContentTypeFilter: (type: string) => void;
}

const CourseContentToolbar: React.FC<CourseContentToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  isFilterOpen,
  setIsFilterOpen,
  contentTypeFilter,
  setContentTypeFilter
}) => {
  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Folder', value: 'folder' },
    { label: 'Video', value: 'video' },
    { label: 'Live Stream', value: 'live_stream' },
    { label: 'Test', value: 'test' },
    { label: 'Document', value: 'document' }
  ];

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
        <span className="material-symbols-outlined absolute right-3 text-gray-400 text-[20px] pointer-events-none">search</span>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`w-[44px] h-[44px] flex items-center justify-center rounded-[10px] border transition-all ${isFilterOpen ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>

        {isFilterOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl p-2 z-[100] animate-in fade-in zoom-in duration-200 origin-top-right">
            <div className="text-[10px] font-bold text-gray-400 px-2 py-1 mb-1 uppercase tracking-wider">Filter By Type</div>
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setContentTypeFilter(opt.value);
                  setIsFilterOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[13px] font-bold rounded-lg transition-colors ${contentTypeFilter === opt.value ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CourseContentToolbar);
