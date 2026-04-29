import React from "react";

interface TestsReportedQuestionsTabProps {
  reportedQuestions: any[];
  reportedSearchQuery: string;
  setReportedSearchQuery: (q: string) => void;
  reportedFilters: { issue: string };
  setReportedFilters: (f: any) => void;
  reportedPageSize: number;
  setReportedPageSize: (size: number) => void;
  reportedCurrentPage: number;
  setReportedCurrentPage: (page: number | ((prev: number) => number)) => void;
  isReportedFilterOpen: boolean;
  setIsReportedFilterOpen: (open: boolean) => void;
  selectedReportedIds: string[];
  setSelectedReportedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  handleBulkDeleteReports: () => void;
  handleQuickResolve: (rq: any) => void;
  handleDeleteReport: (rq: any) => void;
  loading: boolean;
}

const TestsReportedQuestionsTab: React.FC<TestsReportedQuestionsTabProps> = ({
  reportedQuestions,
  reportedSearchQuery,
  setReportedSearchQuery,
  reportedFilters,
  setReportedFilters,
  reportedPageSize,
  reportedCurrentPage,
  setReportedCurrentPage,
  isReportedFilterOpen,
  setIsReportedFilterOpen,
  selectedReportedIds,
  setSelectedReportedIds,
  handleBulkDeleteReports,
  handleQuickResolve,
  handleDeleteReport,
  loading,
}) => {
  const filteredReported = reportedQuestions.filter((rq) => {
    const query = reportedSearchQuery.toLowerCase();
    const matchSearch =
      (rq.studentName || "").toLowerCase().includes(query) ||
      (rq.testTitle || "").toLowerCase().includes(query) ||
      (rq.questionEn || "").toLowerCase().includes(query) ||
      (rq.questionHi || "").toLowerCase().includes(query);
    const matchIssue =
      !reportedFilters.issue || rq.issue === reportedFilters.issue;
    return matchSearch && matchIssue;
  });

  const totalReported = filteredReported.length;
  const totalReportedPages = Math.ceil(totalReported / reportedPageSize);
  const reportedStartIndex = (reportedCurrentPage - 1) * reportedPageSize;
  const reportedEndIndex = Math.min(
    reportedStartIndex + reportedPageSize,
    totalReported
  );
  const paginatedReported = filteredReported.slice(
    reportedStartIndex,
    reportedEndIndex
  );
  const reportedShowingStart = totalReported === 0 ? 0 : reportedStartIndex + 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-gray-800 tracking-tight">
              Reported Questions
            </h2>
          </div>
          {selectedReportedIds.length > 0 && (
            <button
              onClick={handleBulkDeleteReports}
              className="flex items-center gap-1.5 px-4 h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[12px] font-bold transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                delete_sweep
              </span>
              Delete {selectedReportedIds.length} Selected
            </button>
          )}
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
              className={`flex items-center gap-2 px-5 h-11 rounded-xl border text-[13px] font-bold transition-all ${
                isReportedFilterOpen
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
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
                            .filter(Boolean)
                        )
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
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    checked={
                      paginatedReported.length > 0 &&
                      paginatedReported.every((rq: any) =>
                        selectedReportedIds.includes(String(rq.id || rq._id))
                      )
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newIds = paginatedReported.map((rq: any) =>
                          String(rq.id || rq._id)
                        );
                        setSelectedReportedIds((prev) =>
                          Array.from(new Set([...prev, ...newIds]))
                        );
                      } else {
                        const pageIds = paginatedReported.map((rq: any) =>
                          String(rq.id || rq._id)
                        );
                        setSelectedReportedIds((prev) =>
                          prev.filter((id) => !pageIds.includes(id))
                        );
                      }
                    }}
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
                <th className="px-4 py-4 w-[100px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedReported.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-8 py-20 text-center">
                    <p className="text-gray-400 font-medium">
                      No reported questions found
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedReported.map((rq: any, idx: number) => {
                  const issueClass =
                    rq.status === "resolved"
                      ? "bg-green-50 text-green-600"
                      : "bg-red-50 text-red-600";
                  return (
                    <tr
                      key={String(rq.id || idx)}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-4 py-8 text-center align-top border-b border-gray-50/50">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 mt-1 cursor-pointer"
                          checked={selectedReportedIds.includes(
                            String(rq.id || rq._id)
                          )}
                          onChange={(e) => {
                            const id = String(rq.id || rq._id);
                            setSelectedReportedIds((prev: any) =>
                              e.target.checked
                                ? [...prev, id]
                                : prev.filter((x: any) => x !== id)
                            );
                          }}
                        />
                      </td>
                      <td className="px-4 py-8 text-[14px] font-bold text-gray-600 align-top border-b border-gray-50/50 text-center">
                        {reportedStartIndex + idx + 1}
                      </td>
                      <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
                        <p className="text-[14px] font-bold text-gray-800 leading-tight mb-0.5 truncate">
                          {rq.studentName}
                        </p>
                        <p className="text-[12px] font-medium text-gray-500 mb-0.5 truncate">
                          {rq.studentPhone}
                        </p>
                        <p className="text-[12px] font-medium text-gray-400 truncate">
                          {rq.studentEmail}
                        </p>
                      </td>
                      <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
                        <p className="text-[14px] font-bold text-gray-800 uppercase tracking-tight leading-tight mb-1 line-clamp-2">
                          {rq.testTitle}
                        </p>
                        <p className="text-[12px] font-medium text-gray-400 leading-tight line-clamp-2">
                          {rq.batchSeries}
                        </p>
                      </td>
                      <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
                        <p className="text-[14px] font-bold text-gray-800 leading-relaxed line-clamp-3 pr-4">
                          {rq.questionNumber ? `${rq.questionNumber}. ` : ""}
                          {rq.questionEn}
                        </p>
                        {rq.questionHi && (
                          <p className="text-[14px] font-medium text-gray-600 leading-relaxed line-clamp-3 pr-4">
                            {rq.questionHi}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
                        <span
                          className={
                            "px-3 py-1.5 rounded-full text-[11px] font-bold inline-block shadow-sm whitespace-nowrap " +
                            issueClass
                          }
                        >
                          {rq.issue}
                        </span>
                      </td>
                      <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
                        {rq.comment ? (
                          <button
                            onClick={() => alert("Comment: " + rq.comment)}
                            title={rq.comment}
                            className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              comment
                            </span>
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">&#8212;</span>
                        )}
                      </td>
                      <td className="px-4 py-8 align-top text-center border-b border-gray-50/50 text-gray-500 text-[12px] whitespace-nowrap">
                        {rq.reportedDate || rq.createdAt
                          ? new Date(rq.reportedDate || rq.createdAt).toLocaleString(
                              undefined,
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
                        {rq.status !== "resolved" ? (
                          <button
                            onClick={() => handleQuickResolve(rq)}
                            className="h-9 px-4 bg-black text-white rounded-xl text-[12px] font-bold hover:bg-gray-800 transition-colors shadow-sm"
                          >
                            Resolve
                          </button>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-green-600 flex items-center justify-center gap-1 text-[12px] font-bold">
                              <span className="material-symbols-outlined text-[16px]">
                                check_circle
                              </span>
                              Resolved
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteReport(rq)}
                          className="mt-2 text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete Report"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination for Reported Questions */}
      {!loading && filteredReported.length > 0 && (
        <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-gray-400 italic">
              Showing {reportedShowingStart} to {reportedEndIndex} of{" "}
              {totalReported} reports
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
            <button
              className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white shadow-sm rounded-xl"
            >
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

export default TestsReportedQuestionsTab;
