import React from "react";
import CustomDropdown from "./shared/CustomDropdown";

interface TestsResultsTabProps {
  results: any[];
  resultFilters: {
    series: string;
    test: string;
    subject: string;
    type: string;
  };
  setResultFilters: (filters: any) => void;
  resultsPageSize: number;
  setResultsPageSize: (size: number) => void;
  resultsCurrentPage: number;
  setResultsCurrentPage: (page: number | ((prev: number) => number)) => void;
  tests: any[];
  showToast: (msg: string) => void;
  setViewingStudentAnalysis: (result: any) => void;
  loading: boolean;
}

const TestsResultsTab: React.FC<TestsResultsTabProps> = ({
  results,
  resultFilters,
  setResultFilters,
  resultsPageSize,
  setResultsPageSize,
  resultsCurrentPage,
  setResultsCurrentPage,
  tests,
  showToast,
  setViewingStudentAnalysis,
  loading,
}) => {
  const filteredResults = results.filter((res) => {
    const matchSeries =
      !resultFilters.series ||
      res.courseName === resultFilters.series ||
      res.courseId === resultFilters.series;

    const matchTest =
      !resultFilters.test ||
      res.testName === resultFilters.test ||
      res.testId === resultFilters.test;

    const matchSubject =
      !resultFilters.subject || res.subject === resultFilters.subject;

    const matchType = !resultFilters.type || res.type === resultFilters.type;

    return matchSeries && matchTest && matchSubject && matchType;
  });

  const totalResults = filteredResults.length;
  const totalResultsPages = Math.ceil(totalResults / resultsPageSize);
  const resultsStartIndex = (resultsCurrentPage - 1) * resultsPageSize;
  const resultsEndIndex = Math.min(
    resultsStartIndex + resultsPageSize,
    totalResults
  );
  const paginatedResults = filteredResults.slice(
    resultsStartIndex,
    resultsEndIndex
  );
  const resultsShowingStart = totalResults === 0 ? 0 : resultsStartIndex + 1;

  const formatTime = (seconds: number) => {
    if (!seconds) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${seconds % 60}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search/Filter Card */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-500">
              Test Series Title
            </label>
            <CustomDropdown
              options={tests
                .filter((t) => t.isSeries)
                .map((t) => ({
                  value: t.name || t.title || "",
                  label: t.name || t.title || "",
                }))}
              value={resultFilters.series}
              onChange={(val: any) =>
                setResultFilters({ ...resultFilters, series: val, test: "" })
              }
              placeholder="--Select--"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-500">
              Test Subject
            </label>
            <CustomDropdown
              options={Array.from(
                new Set(results.map((r) => r.subject).filter(Boolean))
              )
                .sort()
                .map((s) => ({ value: s, label: s }))}
              value={resultFilters.subject}
              onChange={(val: any) =>
                setResultFilters({ ...resultFilters, subject: val })
              }
              placeholder="Select Subject"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-500">
              Test Type
            </label>
            <CustomDropdown
              options={Array.from(
                new Set(results.map((r) => r.type).filter(Boolean))
              )
                .sort()
                .map((t) => ({ value: t, label: t }))}
              value={resultFilters.type}
              onChange={(val: any) =>
                setResultFilters({ ...resultFilters, type: val })
              }
              placeholder="Select Type"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-500">
              Test Title
            </label>
            <CustomDropdown
              options={Array.from(
                new Set(
                  results
                    .filter(
                      (r) =>
                        !resultFilters.series ||
                        r.courseName === resultFilters.series ||
                        r.courseId === resultFilters.series
                    )
                    .map((r) => r.testName || r.testTitle)
                )
              )
                .filter(Boolean)
                .sort()
                .map((name) => ({
                  value: name,
                  label: name,
                }))}
              value={resultFilters.test}
              onChange={(val: any) =>
                setResultFilters({ ...resultFilters, test: val })
              }
              placeholder="Select Test"
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={() => showToast("Exporting data...")}
            className="bg-[#5C67F2] text-white px-8 py-2.5 rounded-xl font-bold text-[14px] hover:bg-[#4B53D3] transition-colors flex items-center gap-2"
          >
            Export
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F8F9FB] border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    S. NO.{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    STUDENT DETAILS{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    TIME TAKEN{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    MARKS{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    RE-EVALUATED MARKS{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    DATE & TIME{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">
                  ACTIONS{" "}
                  <span className="material-symbols-outlined text-[14px]">
                    unfold_more
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <p className="text-gray-400 font-medium">
                      No data available in table
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-gray-600">
                      {resultsStartIndex + idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[14px] font-bold text-gray-800">
                          {r.studentName || "Student Name"}
                        </p>
                        <p className="text-[12px] text-gray-400">
                          {r.studentId || "ID#12345"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[14px] font-medium text-gray-600">
                      {formatTime(r.timeTaken || 3600)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-4 py-1.5 bg-[#E9F7EF] text-[#155724] rounded-full text-[12px] font-black border border-[#D4EDDA] shadow-sm italic">
                        {r.obtainedMarks || 0} / {r.totalMarks || 8}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-[14px] font-bold text-blue-600 text-center">
                      {r.reevaluatedMarks !== undefined ? (
                        <span className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[12px] font-black border border-blue-100 shadow-sm italic animate-pulse">
                          {r.reevaluatedMarks} / {r.totalMarks || 8}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-[14px] font-bold text-gray-600">
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              }
                            )
                          : "N/A"}
                      </p>
                      <p className="text-[12px] font-medium text-gray-400">
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : ""}
                      </p>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <button
                        onClick={() => {
                          setViewingStudentAnalysis(r);
                        }}
                        className="w-10 h-10 flex items-center justify-center border border-gray-100 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          visibility
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standardized Pagination Footer for Results */}
      {!loading && filteredResults.length > 0 && (
        <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center group">
              <select
                value={resultsPageSize}
                onChange={(e) => setResultsPageSize(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
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
              Showing {resultsShowingStart} to {resultsEndIndex} of {totalResults}{" "}
              entries
            </span>
          </div>

          <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <button
              onClick={() => setResultsCurrentPage((p) => Math.max(1, p - 1))}
              disabled={resultsCurrentPage === 1}
              className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              Previous
            </button>
            <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>

            {/* Render Truncated Page Numbers */}
            {(() => {
              const pages = [];
              const maxVisible = 3;
              let start = Math.max(1, resultsCurrentPage - 1);
              let end = Math.min(totalResultsPages, start + maxVisible - 1);

              if (end === totalResultsPages) {
                start = Math.max(1, end - maxVisible + 1);
              }

              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setResultsCurrentPage(i)}
                    className={`h-9 w-9 flex items-center justify-center text-[13px] rounded-xl transition-all ${
                      resultsCurrentPage === i
                        ? "font-black bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        : "font-bold text-gray-400 hover:text-black hover:bg-gray-50"
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              return pages;
            })()}

            <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
            <button
              onClick={() =>
                setResultsCurrentPage((p) =>
                  Math.min(totalResultsPages, p + 1)
                )
              }
              disabled={
                resultsCurrentPage === totalResultsPages ||
                totalResultsPages === 0
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

export default TestsResultsTab;
