import React from "react";

interface ReportedQuestionsTabProps {
  paginatedReported: any[];
  reportedSearchQuery: string;
  setReportedSearchQuery: (query: string) => void;
  reportedFilters: {
    issue: string;
  };
  setReportedFilters: (filters: any) => void;
  isReportedFilterOpen: boolean;
  setIsReportedFilterOpen: (open: boolean) => void;
  reportedQuestions: any[];
  reportedPageSize: number;
  setReportedPageSize: (size: number) => void;
  reportedShowingStart: number;
  reportedEndIndex: number;
  totalReported: number;
  reportedCurrentPage: number;
  setReportedCurrentPage: (updater: (p: number) => number) => void;
  totalReportedPages: number;
  updateReportStatus: (id: any, status: string) => void;
  loading: boolean;
}

const ReportedQuestionsTab: React.FC<ReportedQuestionsTabProps> = ({
  paginatedReported,
  reportedSearchQuery,
  setReportedSearchQuery,
  reportedFilters,
  setReportedFilters,
  isReportedFilterOpen,
  setIsReportedFilterOpen,
  reportedQuestions,
  reportedPageSize,
  setReportedPageSize,
  reportedShowingStart,
  reportedEndIndex,
  totalReported,
  reportedCurrentPage,
  setReportedCurrentPage,
  totalReportedPages,
  updateReportStatus,
  loading,
}) => {
  const tableRows = paginatedReported.length === 0
    ? [(
      <tr key="empty">
        <td colSpan={9} className="px-8 py-20 text-center">
          <p className="text-gray-400 font-medium">No reported questions found</p>
        </td>
      </tr>
    )]
    : paginatedReported.map((rq: any, idx: number) => {
      const issueClass = rq.status === "resolved"
        ? "bg-green-50 text-green-600"
        : "bg-red-50 text-red-600";
      return (
        <tr key={String(rq.id || idx)} className="hover:bg-gray-50/50 transition-colors group">
          <td className="px-4 py-8 text-center align-top border-b border-gray-50/50">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 mt-1" />
          </td>
          <td className="px-4 py-8 text-[14px] font-bold text-gray-600 align-top border-b border-gray-50/50 text-center">
            {idx + 1 + (reportedCurrentPage - 1) * reportedPageSize}
          </td>
          <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
            <p className="text-[14px] font-bold text-gray-800 leading-tight mb-0.5 truncate">{rq.studentName}</p>
            <p className="text-[12px] font-medium text-gray-500 mb-0.5 truncate">{rq.studentPhone}</p>
            <p className="text-[12px] font-medium text-gray-400 truncate">{rq.studentEmail}</p>
          </td>
          <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
            <p className="text-[14px] font-bold text-gray-800 uppercase tracking-tight leading-tight mb-1 line-clamp-2">{rq.testTitle}</p>
            <p className="text-[12px] font-medium text-gray-400 leading-tight line-clamp-2">{rq.batchSeries}</p>
          </td>
          <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
            <p className="text-[14px] font-bold text-gray-800 leading-relaxed line-clamp-3 pr-4">
              {rq.questionNumber ? `${rq.questionNumber}. ` : ""}{rq.questionEn}
            </p>
            {rq.questionHi && (
              <p className="text-[14px] font-medium text-gray-600 leading-relaxed line-clamp-3 pr-4">{rq.questionHi}</p>
            )}
          </td>
          <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
            <span className={"px-3 py-1.5 rounded-full text-[11px] font-bold inline-block shadow-sm whitespace-nowrap " + issueClass}>
              {rq.issue}
            </span>
          </td>
          <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
            {rq.comment
              ? <button onClick={() => alert("Comment: " + rq.comment)} title={rq.comment} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><span className="material-symbols-outlined text-[18px]">comment</span></button>
              : <span className="text-gray-300 text-xs">&#8212;</span>
            }
          </td>
          <td className="px-4 py-8 align-top text-center border-b border-gray-50/50 text-gray-500 text-[12px] whitespace-nowrap">
            {new Date(rq.reportedDate).toLocaleString()}
          </td>
          <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
            {rq.status !== "resolved"
              ? <button onClick={() => updateReportStatus(rq.id, "resolved")} className="h-9 px-4 bg-black text-white rounded-xl text-[12px] font-bold hover:bg-gray-800 transition-colors shadow-sm">Resolve</button>
              : <span className="text-green-600 flex items-center justify-center gap-1 text-[12px] font-bold"><span className="material-symbols-outlined text-[16px]">check_circle</span>Resolved</span>
            }
          </td>
        </tr>
      );
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-gray-800 tracking-tight">
            Reported Questions
          </h2>
        </div>
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <div className="relative group flex-1 sm:w-[280px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] transition-colors group-focus-within:text-black">
              search
            </span>
            <input
              type="text"
              placeholder="Search report..."
              value={reportedSearchQuery}
              onChange={(e) => setReportedSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-[#f8f9fa] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-black focus:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsReportedFilterOpen(!isReportedFilterOpen)}
              className={`flex items-center gap-2 px-5 h-11 rounded-xl border text-[13px] font-bold transition-all ${isReportedFilterOpen ? "bg-black text-white border-black shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50"}`}
            >
              <span className="material-symbols-outlined text-[18px]">
                tune
              </span>
              Filters
            </button>

            {isReportedFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-50 p-5 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                      Issue Type
                    </label>
                    <select
                      value={reportedFilters.issue}
                      onChange={(e) =>
                        setReportedFilters({
                          ...reportedFilters,
                          issue: e.target.value,
                        })
                      }
                      className="w-full h-9 px-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] outline-none focus:border-black"
                    >
                      <option value="">All Issues</option>
                      {Array.from(
                        new Set(
                          reportedQuestions
                            .map((rq) => rq.issue)
                            .filter(Boolean),
                        ),
                      ).map((issue: any) => (
                        <option key={issue} value={issue}>
                          {issue}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-visible">
        <div className="">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-[#F8F9FB] border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 w-[40px] text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-4 w-[50px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">
                  S. NO.
                </th>
                <th className="px-4 py-4 w-[160px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  STUDENT DETAILS
                </th>
                <th className="px-4 py-4 w-[130px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  TITLE
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  QUESTION
                </th>
                <th className="px-4 py-4 w-[110px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">
                  ISSUE
                </th>
                <th className="px-4 py-4 w-[80px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">
                  COMMENT
                </th>
                <th className="px-4 py-4 w-[140px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">
                  DATE & TIME
                </th>
                <th className="px-4 py-4 w-[130px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tableRows}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standardized Pagination Footer for Reported Questions */}
      {!loading && totalReported > 0 && (
        <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center group">
              <select
                value={reportedPageSize}
                onChange={(e) => setReportedPageSize(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                expand_more
              </span>
            </div>
            <span className="text-[13px] font-medium text-gray-400 italic">
              Showing {reportedShowingStart} to {reportedEndIndex} of{" "}
              {totalReported} entries
            </span>
          </div>

          <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <button
              onClick={() => setReportedCurrentPage((p) => Math.max(1, p - 1))}
              disabled={reportedCurrentPage === 1}
              className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              Previous
            </button>
            <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
            <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              {reportedCurrentPage}
            </button>
            <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
            <button
              onClick={() =>
                setReportedCurrentPage((p) =>
                  Math.min(totalReportedPages, p + 1)
                )
              }
              disabled={
                reportedCurrentPage === totalReportedPages ||
                totalReportedPages === 0
              }
              className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportedQuestionsTab;
