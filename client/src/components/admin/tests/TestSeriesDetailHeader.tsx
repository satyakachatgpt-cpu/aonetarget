import React from 'react';

interface TestSeriesDetailHeaderProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (v: boolean) => void;
  filters: { status: string };
  setFilters: (f: any) => void;
  isAddMenuOpen: boolean;
  setIsAddMenuOpen: (v: boolean) => void;
  onBack: () => void;
  onAddCreate: () => void;
  onAddPDF: () => void;
  onAddSubjective: () => void;
}

const TestSeriesDetailHeader: React.FC<TestSeriesDetailHeaderProps> = ({
  title,
  searchQuery,
  setSearchQuery,
  isFilterOpen,
  setIsFilterOpen,
  filters,
  setFilters,
  isAddMenuOpen,
  setIsAddMenuOpen,
  onBack,
  onAddCreate,
  onAddPDF,
  onAddSubjective
}) => {
  return (
    <div className="bg-white px-8 py-3 border-b border-gray-100 flex items-center sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-5">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-400 hover:text-black transition-all"
        >
          <span className="material-symbols-outlined text-[24px]">
            arrow_back
          </span>
        </button>
        <h1 className="text-[20px] font-bold text-gray-800 tracking-tight">
          {title}
        </h1>
      </div>

      {/* Header Search & Actions */}
      <div className="ml-auto flex items-center gap-2 mr-6">
        <div className="w-[280px] relative group">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] transition-colors group-focus-within:text-black">
            search
          </span>
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[#f8f9fa] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-black focus:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`h-11 px-5 rounded-xl border flex items-center gap-2 text-[12px] font-bold transition-all ${isFilterOpen ? "bg-black text-white border-black shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-black hover:shadow-sm"}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              tune
            </span>
            Filters
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-50 p-4 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["all", "published", "draft"].map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setFilters({ ...filters, status: s })
                        }
                        className={`h-8 rounded-lg text-[11px] font-bold capitalize border transition-all ${filters.status === s ? "bg-black text-white border-black" : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
          className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-md active:scale-95"
          title="Add Test"
        >
          <span className="material-symbols-outlined text-[26px]">add</span>
        </button>
        {isAddMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-[250px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[101]">
            <button
              onClick={() => {
                setIsAddMenuOpen(false);
                onAddCreate();
              }}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="material-symbols-outlined text-[20px] text-gray-500">post_add</span>
              <span className="text-[14px] font-bold text-gray-800">Create Test</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TestSeriesDetailHeader);
