import React from "react";

interface TestsListTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (updater: number | ((p: number) => number)) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (n: number) => void;
  handleOpenModal: (test?: any) => void;
  paginatedTests: any[];
  currentPage: number;
  totalPages: number;
  filteredTests: any[];
  loading: boolean;
  activeMenu: any;
  setActiveMenu: (id: any) => void;
  handleSetViewingTestSeries: (test: any) => void;
  toggleStatus: (test: any) => void;
  handleDelete: (id: any) => void;
  handleDuplicateTest: (test: any) => void;
  handlePublish: (id: any) => void;
}

const TestsListTab: React.FC<TestsListTabProps> = ({
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  isFilterOpen,
  setIsFilterOpen,
  filterStatus,
  setFilterStatus,
  itemsPerPage,
  setItemsPerPage,
  handleOpenModal,
  paginatedTests,
  currentPage,
  totalPages,
  filteredTests,
  loading,
  activeMenu,
  setActiveMenu,
  handleSetViewingTestSeries,
  toggleStatus,
  handleDelete,
  handleDuplicateTest,
  handlePublish,
}) => {
  const getExpiryStatus = (series: any) => {
    const mode = series.expiryMode;
    const val = series.validity;

    if (!mode || mode === 'Lifetime Access' || mode === 'lifetime') {
      return 'lifetime';
    }

    if (mode === 'End Date' && val) {
      const parts = val.split('-');
      let dateStr = val;
      if (parts.length === 3 && parts[2].length === 4) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const expiry = new Date(dateStr);
      return new Date() > expiry ? 'expired' : 'active';
    }

    if (mode === 'Validity' && val) {
      return 'months';
    }

    return 'lifetime';
  };
  return (
    <>
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
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center w-11 h-11 bg-[#1a202c] text-white rounded-full transition-all hover:bg-black active:scale-95 shadow-md"
            >
              <span className="material-symbols-outlined text-[26px]">
                add
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 mb-6 shadow-sm">
        <div className="">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f1f3f5] text-gray-500">
              <tr>
                <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                  <div className="flex items-center gap-2 cursor-pointer group uppercase">
                    S. No.{" "}
                    <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                  <div className="flex items-center gap-2 cursor-pointer group uppercase">
                    Logo{" "}
                    <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                  <div className="flex items-center gap-2 cursor-pointer group uppercase">
                    Title{" "}
                    <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                  <div className="flex items-center gap-2 cursor-pointer group uppercase">
                    Price{" "}
                    <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                  <div className="flex items-center gap-2 cursor-pointer group uppercase">
                    Sort By{" "}
                    <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight text-center uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedTests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-200 mb-2 block">
                      quiz
                    </span>
                    <p className="text-gray-400 font-medium font-bold italic">
                      No records found
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTests.map((test, index) => (
                  <tr
                    key={test.id || index}
                    className="hover:bg-gray-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5 text-[13px] text-gray-700 font-medium">
                      {test.id
                        ? String(test.id).length > 8
                          ? index + 1
                          : String(test.id).replace("test_", "")
                        : index + 1}
                    </td>
                    <td className="px-6 py-5">
                      <div className="w-[84px] h-[48px] bg-white rounded-md overflow-hidden border border-gray-100 flex items-center justify-center p-0.5 group-hover:border-gray-200 transition-all">
                        {test.logo || test.image ? (
                          <img
                            src={test.logo || test.image}
                            alt="Logo"
                            className="w-full h-full object-cover rounded-[3px]"
                          />
                        ) : (
                          <div className="bg-gray-50 w-full h-full flex items-center justify-center rounded-[3px]">
                            <span className="material-symbols-outlined text-gray-200 text-[20px]">
                              image
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[14px] font-medium text-[#1a202c]">
                      <button
                        onClick={() => handleSetViewingTestSeries(test)}
                        className="hover:text-blue-600 transition-all text-left leading-snug flex items-center gap-2"
                      >
                        {test.name || test.title}
                        {test.isSeries && (
                          (() => {
                            const status = getExpiryStatus(test);
                            switch (status) {
                              case 'expired':
                                return <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100 uppercase tracking-tighter">Expired</span>;
                              case 'active':
                                return <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100 uppercase tracking-tighter">Active</span>;
                              case 'lifetime':
                                return <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-100 uppercase tracking-tighter">Lifetime</span>;
                              case 'months':
                                return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 uppercase tracking-tighter">{test.validity} Months</span>;
                              default:
                                return null;
                            }
                          })()
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-5 font-medium text-gray-700 text-[14px]">
                      ₹{test.price || "0"}
                    </td>
                    <td className="px-6 py-5">
                      <div className="bg-[#eff1f3] rounded-3xl h-6 px-4 inline-flex items-center justify-center min-w-[80px]">
                        <span className="text-[12px] font-medium text-gray-600">
                          {Number(test.sortBy || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="relative inline-block action-menu-container">
                        <button
                          onClick={() => setActiveMenu(activeMenu === test.id ? null : test.id)}
                          className={`flex items-center justify-between gap-2 px-4 h-9 border rounded-lg text-[13px] font-bold transition-all shadow-sm w-[110px] ${activeMenu === test.id ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                        >
                          Actions
                          <span className={`material-symbols-outlined text-[18px] transition-all duration-200 ${activeMenu === test.id ? "rotate-180 text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                            expand_more
                          </span>
                        </button>

                        {activeMenu === test.id && (
                          <div className={`absolute right-0 ${paginatedTests.length > 3 ? (index >= paginatedTests.length - 2 ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right") : index >= paginatedTests.length - 1 ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"} w-[180px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[9999] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                            {[
                              { id: "view", label: "View Tests", icon: "folder_open", onClick: () => { handleSetViewingTestSeries(test); setActiveMenu(null); } },
                              { id: "edit", label: "Edit", icon: "edit", onClick: () => { handleOpenModal(test); setActiveMenu(null); } },
                              { id: "duplicate", label: "Duplicate", icon: "content_copy", onClick: () => { handleDuplicateTest(test); setActiveMenu(null); } },
                              { id: "publish", label: "Publish Changes", icon: "sync", onClick: () => { handlePublish(test.id || (test as any)._id); setActiveMenu(null); } },
                            ].map((item) => (
                              <button
                                key={item.id}
                                onClick={() => item.onClick()}
                                className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                              >
                                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-black">
                                  {item.icon}
                                </span>
                                <span className="text-[13px] font-bold text-gray-600 group-hover:text-black">
                                  {item.label}
                                </span>
                              </button>
                            ))}

                            <div className="w-full flex items-center justify-between px-5 py-2 hover:bg-gray-50 transition-all group">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-black">
                                  check_circle
                                </span>
                                <span className="text-[13px] font-bold text-gray-600 group-hover:text-black">
                                  Enabled
                                </span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleStatus(test); }}
                                className={`w-8 h-4.5 rounded-full relative transition-all duration-300 ${test.status === "active" ? "bg-black" : "bg-gray-200"}`}
                              >
                                <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 ${test.status === "active" ? "left-4" : "left-0.5"}`} />
                              </button>
                            </div>

                            <div className="h-[1px] bg-gray-50 my-1 mx-2"></div>

                            <button
                              onClick={() => { handleDelete(test.id || (test as any)._id); setActiveMenu(null); }}
                              className="w-full px-5 py-2 flex items-center gap-3 hover:bg-red-50 transition-colors group text-left"
                            >
                              <span className="material-symbols-outlined text-[20px] text-red-500">
                                delete
                              </span>
                              <span className="text-[13px] font-bold text-red-600">
                                Delete
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standardized Pagination Footer */}
        {!loading && filteredTests.length > 0 && (
          <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center group">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                  expand_more
                </span>
              </div>
              <span className="text-[13px] font-medium text-gray-400 italic">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredTests.length)} of{" "}
                {filteredTests.length} entries
              </span>
            </div>

            <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
              >
                Previous
              </button>
              <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
              <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                {currentPage}
              </button>
              <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TestsListTab;
