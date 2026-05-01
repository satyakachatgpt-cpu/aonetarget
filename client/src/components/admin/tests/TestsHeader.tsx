import React from 'react';

interface TestsHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (num: number) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  onAddClick: () => void;
}

const TestsHeader: React.FC<TestsHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  filterStatus,
  setFilterStatus,
  itemsPerPage,
  setItemsPerPage,
  isFilterOpen,
  setIsFilterOpen,
  onAddClick
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      <div>
        <h2 className="text-[22px] font-bold text-[#1a202c] tracking-tight">
          Tests
        </h2>
      </div>
      <div className="flex gap-3 items-center w-full md:w-auto">
        <div className="relative group w-full md:w-[280px]">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] transition-colors group-focus-within:text-black">
            search
          </span>
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-11 pl-11 pr-4 bg-[#f8f9fa] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-black focus:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 h-11 px-6 rounded-xl border text-[13px] font-bold transition-all ${isFilterOpen ? "bg-black text-white border-black shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-black hover:bg-gray-50"}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              tune
            </span>
            Filters
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-[280px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-[101] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["all", "published", "draft"].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setFilterStatus(s === "all" ? "" : s);
                          setIsFilterOpen(false);
                        }}
                        className={`h-9 rounded-lg text-[11px] font-bold capitalize border transition-all ${(!filterStatus && s === "all") || filterStatus === s ? "bg-black text-white border-black shadow-sm" : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
                    Items Per Page
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setItemsPerPage(n);
                          setIsFilterOpen(false);
                        }}
                        className={`h-9 rounded-lg text-[11px] font-bold border transition-all ${itemsPerPage === n ? "bg-black text-white border-black shadow-sm" : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={onAddClick}
            className="flex items-center justify-center w-11 h-11 bg-[#1a202c] text-white rounded-full transition-all hover:bg-black active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-[26px]">
              add
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestsHeader);
