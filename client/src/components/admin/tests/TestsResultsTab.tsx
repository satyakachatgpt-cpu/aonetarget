import React, { useMemo, useEffect } from "react";
import CustomDropdown from "./shared/CustomDropdown";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  selectedResultIds: string[];
  setSelectedResultIds: (val: string[] | ((prev: string[]) => string[])) => void;
  latestFilter: string;
  setLatestFilter: (val: string) => void;
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
  selectedResultIds,
  setSelectedResultIds,
  latestFilter,
  setLatestFilter,
}) => {
  // Clear selection when filters change for safety
  useEffect(() => {
    setSelectedResultIds([]);
  }, [resultFilters, latestFilter, setSelectedResultIds]);

  const filteredResults = useMemo(() => {
    let list = [...results];

    // 1. Metadata Filters
    list = list.filter((res) => {
      const matchSeries =
        !resultFilters.series ||
        res.courseName === resultFilters.series ||
        res.courseId === resultFilters.series;

      const matchTest =
        !resultFilters.test ||
        res.testName === resultFilters.test ||
        res.testId === resultFilters.test;

      return matchSeries && matchTest;
    });

    // 2. Latest/Time Filter
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (latestFilter === "today") {
      list = list.filter(r => r.submittedAt && new Date(r.submittedAt) >= todayStart);
    } else if (latestFilter === "last24h") {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      list = list.filter(r => r.submittedAt && new Date(r.submittedAt) >= oneDayAgo);
    } else if (latestFilter === "last7d") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter(r => r.submittedAt && new Date(r.submittedAt) >= sevenDaysAgo);
    } else if (latestFilter === "latestAttemptOnly") {
      const latestMap = new Map();
      list.forEach(r => {
        const key = `${r.studentId}_${r.testId || r.testName}`;
        const currentBest = latestMap.get(key);
        if (!currentBest || new Date(r.submittedAt) > new Date(currentBest.submittedAt)) {
          latestMap.set(key, r);
        }
      });
      list = Array.from(latestMap.values());
    }

    return list;
  }, [results, resultFilters, latestFilter]);

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allVisibleIds = filteredResults.map(r => String(r.id || r._id));
      setSelectedResultIds(allVisibleIds);
    } else {
      setSelectedResultIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedResultIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (selectedResultIds.length === 0) {
      showToast("Please select at least one result to export.");
      return;
    }

    const selectedData = filteredResults.filter(r => selectedResultIds.includes(String(r.id || r._id)));
    
    // 1. Build Filter Summary
    const filterSummary = [
      resultFilters.series ? `Series: ${resultFilters.series}` : "Series: All",
      resultFilters.test ? `Test: ${resultFilters.test}` : "",
      latestFilter !== "all" ? `Filter: ${latestFilter}` : "Filter: All Results"
    ].filter(Boolean).join(" | ");

    // 2. Build Metadata Rows
    const metadata = [
      ["A ONE TARGET - TEST RESULTS REPORT"],
      [`Generated At: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`],
      [`Total Exported Results: ${selectedData.length}`],
      [`Filters Applied: ${filterSummary}`],
      [], // Spacer
    ];

    // 3. Build Table Headers
    const headers = [
      "S. No.", 
      "Student Name", 
      "Student ID", 
      "Test Series", 
      "Test Title", 
      "Submitted Date", 
      "Submitted Time", 
      "Time Taken", 
      "Obtained Marks", 
      "Total Marks", 
      "Score", 
      "Percentage", 
      "Rank"
    ];

    // 4. Build Data Rows
    const rows = selectedData.map((r, idx) => {
      const submittedDate = r.submittedAt ? new Date(r.submittedAt) : null;
      const obtained = r.obtainedMarks || 0;
      const total = r.totalMarks || 0;
      const pct = r.percentage || (total ? (obtained / total) * 100 : 0);
      const rankVal = r.rank || r.studentRank || r.overallRank || "-";

      return [
        idx + 1,
        r.studentName || "-",
        r.studentId || "-",
        r.courseName || "-",
        r.testName || r.testTitle || "-",
        submittedDate ? submittedDate.toLocaleDateString('en-GB') : "-", // DD/MM/YYYY
        submittedDate ? submittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "-",
        formatTime(r.timeTaken),
        obtained,
        total,
        `${obtained} / ${total}`,
        `${parseFloat(String(pct)).toFixed(2)}%`,
        rankVal
      ];
    });

    // 5. Create Worksheet from AOA (Array of Arrays)
    const ws = XLSX.utils.aoa_to_sheet([...metadata, headers, ...rows]);

    // 6. Layout: Merges and Column Widths
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } } // Merge Title across all 13 columns
    ];

    ws['!cols'] = [
      { wch: 8 },  // S. No.
      { wch: 25 }, // Student Name
      { wch: 20 }, // Student ID
      { wch: 35 }, // Test Series
      { wch: 25 }, // Test Title
      { wch: 16 }, // Submitted Date
      { wch: 16 }, // Submitted Time
      { wch: 14 }, // Time Taken
      { wch: 16 }, // Obtained Marks
      { wch: 14 }, // Total Marks
      { wch: 16 }, // Score
      { wch: 14 }, // Percentage
      { wch: 10 }  // Rank
    ];

    // 7. Download
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, "Test Results");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    const fileName = `test-results-report-${new Date().toISOString().split('T')[0]}-${new Date().getHours()}-${new Date().getMinutes()}.xlsx`;
    saveAs(data, fileName);
    showToast("Export successful!");
  };

  // Helper to get filtered options for dropdowns
  const availableOptions = useMemo(() => {
    const resForSeries = results.filter(r => !resultFilters.series || r.courseName === resultFilters.series || r.courseId === resultFilters.series);

    return {
      tests: Array.from(new Set(resForSeries.map(r => r.testName || r.testTitle).filter(Boolean))).sort()
    };
  }, [results, resultFilters.series]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
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
                setResultFilters({ series: val, subject: "", type: "", test: "" })
              }
              placeholder="--Select--"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-500">
              Select Test
            </label>
            <CustomDropdown
              options={availableOptions.tests.map((name) => ({
                value: name,
                label: name,
              }))}
              value={resultFilters.test}
              onChange={(val: any) =>
                setResultFilters({ ...resultFilters, test: val })
              }
              placeholder={resultFilters.series ? "Select Test" : "Select series first"}
              disabled={!resultFilters.series}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-gray-500">
              Result Filter
            </label>
            <CustomDropdown
              options={[
                { value: "all", label: "All Results" },
                { value: "today", label: "Latest Today" },
                { value: "last24h", label: "Last 24 Hours" },
                { value: "last7d", label: "Last 7 Days" },
                { value: "latestAttemptOnly", label: "Latest Attempt Only" },
              ]}
              value={latestFilter}
              onChange={(val: any) => setLatestFilter(val)}
              placeholder="Select Filter"
            />
          </div>
        </div>
        <div className="flex justify-between mt-6 items-center">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[12px] font-bold">
              Showing {filteredResults.length} results
            </span>
          </div>
          <div className="flex items-center gap-4">
            {selectedResultIds.length > 0 && (
              <span className="text-[13px] font-bold text-gray-500 italic animate-pulse">
                {selectedResultIds.length} students selected
              </span>
            )}
            <button
              onClick={handleExport}
              className="bg-[#5C67F2] text-white px-8 py-2.5 rounded-xl font-bold text-[14px] hover:bg-[#4B53D3] transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F8F9FB] border-b border-gray-200">
              <tr>
                <th className="px-3 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={filteredResults.length > 0 && selectedResultIds.length === filteredResults.length}
                  />
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    S. NO.{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    STUDENT DETAILS{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    TEST INFO{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    TIME TAKEN{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    SCORE / %{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    STATS (C/W/U){" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    DATE & TIME{" "}
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">
                  ACTIONS{" "}
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
                    <td className="px-3 py-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                        checked={selectedResultIds.includes(String(r.id || r._id))}
                        onChange={() => handleSelectRow(String(r.id || r._id))}
                      />
                    </td>
                    <td className="px-3 py-4 text-[14px] font-bold text-gray-600">
                      {resultsStartIndex + idx + 1}
                    </td>
                    <td className="px-3 py-4">
                      <div>
                        <p className="text-[14px] font-bold text-gray-800">
                          {r.studentName || "Student Name"}
                        </p>
                        <p className="text-[12px] text-gray-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">badge</span>
                          {r.studentId || "ID#12345"}
                        </p>
                        {(r.studentPhone || r.phone) && (
                          <p className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[11px]">call</span>
                            {r.studentPhone || r.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="max-w-[180px]">
                        <p className="text-[13px] font-bold text-gray-700 truncate" title={r.testName || r.testTitle}>
                          {r.testName || r.testTitle || "Test Title"}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate" title={r.courseName}>
                          {r.courseName || "Series Name"}
                        </p>
                        {r.subject && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px] font-medium border border-gray-100 uppercase tracking-tighter">
                            {r.subject}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-[13px] font-medium text-gray-600">
                      {formatTime(r.timeTaken)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="space-y-1">
                        <span className="px-3 py-1 bg-[#E9F7EF] text-[#155724] rounded-lg text-[12px] font-black border border-[#D4EDDA] shadow-sm flex items-center w-fit gap-1">
                          {r.obtainedMarks || 0} / {r.totalMarks || 0}
                        </span>
                        <p className="text-[11px] font-black text-gray-400 ml-1">
                          {r.percentage || (r.totalMarks ? Math.round((r.obtainedMarks / r.totalMarks) * 100) : 0)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-black text-green-600">{r.correctAnswers || 0}</span>
                          <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter">COR</span>
                        </div>
                        <div className="w-[1px] h-4 bg-gray-100"></div>
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-black text-red-500">{r.wrongAnswers || 0}</span>
                          <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter">WRN</span>
                        </div>
                        <div className="w-[1px] h-4 bg-gray-100"></div>
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-black text-gray-400">{r.unanswered || 0}</span>
                          <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter">UNA</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-[13px] font-bold text-gray-600">
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "N/A"}
                      </p>
                      <p className="text-[11px] font-medium text-gray-400">
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : ""}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => {
                          setViewingStudentAnalysis(r);
                        }}
                        className="w-10 h-10 flex items-center justify-center border border-gray-100 rounded-xl text-gray-400 hover:text-[#5C67F2] hover:bg-indigo-50 hover:border-indigo-100 transition-all shadow-sm mx-auto"
                      >
                        <span className="material-symbols-outlined text-[20px]">
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
