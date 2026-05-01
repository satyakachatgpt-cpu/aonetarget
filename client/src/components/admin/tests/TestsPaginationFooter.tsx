import React from "react";

interface Props {
  loading: boolean;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  totalPages: number;
}

const TestsPaginationFooter: React.FC<Props> = ({
  loading,
  totalCount,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalPages,
}) => {
  if (loading || totalCount === 0) return null;

  return (
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
          {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}{" "}
          entries
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
  );
};

export default React.memo(TestsPaginationFooter);
