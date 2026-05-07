import { useState, useEffect, useCallback } from 'react';
import { resultsAPI, reportedQuestionsAPI } from '../services/apiClient';

interface Props {
  showToast: (m: string, type?: "success" | "error") => void;
  tests: any[];
  activeTab: string;
}

export const useTestsAnalyticsLogic = ({ showToast, tests, activeTab }: Props) => {
  // Results Tab States
  const [results, setResults] = useState<any[]>([]);
  const [resultFilters, setResultFilters] = useState({
    series: "",
    subject: "",
    type: "",
    test: "",
  });
  const [resultsPageSize, setResultsPageSize] = useState(10);
  const [resultsCurrentPage, setResultsCurrentPage] = useState(1);
  const [latestFilter, setLatestFilter] = useState("all");
  const [viewingStudentAnalysis, setViewingStudentAnalysis] = useState<any | null>(null);

  // Reported Questions Tab States
  const [reportedQuestions, setReportedQuestions] = useState<any[]>([]);
  const [reportedSearchQuery, setReportedSearchQuery] = useState("");
  const [isReportedFilterOpen, setIsReportedFilterOpen] = useState(false);
  const [reportedFilters, setReportedFilters] = useState({
    issue: "",
    testSeries: "",
    testTitle: "",
  });
  const [reportedPageSize, setReportedPageSize] = useState(10);
  const [reportedCurrentPage, setReportedCurrentPage] = useState(1);
  const [selectedReportedIds, setSelectedReportedIds] = useState<string[]>([]);

  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);

  const loadResults = useCallback(async () => {
    try {
      const data = await resultsAPI.getAll();
      const enrichedData = (Array.isArray(data) ? data : []).map((res: any) => {
        let enriched = { ...res };
        
        // Enrich Series Name if missing
        if (!enriched.courseName && enriched.courseId) {
          const series = tests.find(t => t.isSeries && (String(t.id) === String(enriched.courseId) || String((t as any)._id) === String(enriched.courseId)));
          if (series) enriched.courseName = series.name || series.title;
        }

        // Enrich Test Name if missing
        if (!enriched.testName && enriched.testId) {
          const testItem = tests.find(t => !t.isSeries && (String(t.id) === String(enriched.testId) || String((t as any)._id) === String(enriched.testId)));
          if (testItem) enriched.testName = testItem.name || testItem.title;
        }

        return enriched;
      });
      setResults(enrichedData);
    } catch (err: any) {
      console.error("Error loading results:", err);
      showToast("Failed to load test results", "error");
      setResults([]);
    }
  }, [tests, showToast]);

  const loadReportedQuestions = useCallback(async () => {
    try {
      const reports = await reportedQuestionsAPI.getAll();
      setReportedQuestions(reports);
    } catch (error) {
      console.error("Error loading reported questions:", error);
    }
  }, []);

  const handleQuickResolve = async (report: any) => {
    if (!report) return;
    try {
      await reportedQuestionsAPI.updateStatus(report.id || report._id, "resolved", "Resolved by Admin");
      await loadReportedQuestions();
      showToast("Report resolved successfully!", "success");
    } catch (error: any) {
      console.error("Error resolving report:", error);
      showToast(error.message || "Failed to resolve report", "error");
    }
  };

  const handleDeleteReport = async (report: any) => {
    if (!report) return;
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
    
    try {
      await reportedQuestionsAPI.delete(String(report.id || report._id));
      setSelectedReportedIds(prev => prev.filter(id => id !== String(report.id || report._id)));
      await loadReportedQuestions();
      showToast("Report deleted successfully!", "success");
    } catch (error: any) {
      console.error("Error deleting report:", error);
      showToast(error.message || "Failed to delete report", "error");
    }
  };

  const handleBulkDeleteReports = async () => {
    if (selectedReportedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedReportedIds.length} selected report(s)? This cannot be undone.`)) return;
    try {
      await reportedQuestionsAPI.bulkDelete(selectedReportedIds);
      setSelectedReportedIds([]);
      await loadReportedQuestions();
      showToast(`${selectedReportedIds.length} report(s) deleted!`, "success");
    } catch (error: any) {
      console.error("Error bulk deleting reports:", error);
      showToast(error.message || "Failed to delete reports", "error");
    }
  };

  // Pagination reset effects
  useEffect(() => {
    if (activeTab === "Results") {
      setResultsCurrentPage(1);
    }
  }, [resultFilters, resultsPageSize, activeTab]);

  useEffect(() => {
    if (activeTab === "Reported Questions") {
      setReportedCurrentPage(1);
    }
  }, [reportedSearchQuery, reportedFilters, reportedPageSize, activeTab]);

  useEffect(() => {
    if (activeTab === "Results") {
      loadResults();
    }
    if (activeTab === "Reported Questions") {
      loadReportedQuestions();
    }
  }, [activeTab, loadResults, loadReportedQuestions]);

  return {
    results,
    setResults,
    resultFilters,
    setResultFilters,
    resultsPageSize,
    setResultsPageSize,
    resultsCurrentPage,
    setResultsCurrentPage,
    latestFilter,
    setLatestFilter,
    viewingStudentAnalysis,
    setViewingStudentAnalysis,
    reportedQuestions,
    setReportedQuestions,
    reportedSearchQuery,
    setReportedSearchQuery,
    isReportedFilterOpen,
    setIsReportedFilterOpen,
    reportedFilters,
    setReportedFilters,
    reportedPageSize,
    setReportedPageSize,
    reportedCurrentPage,
    setReportedCurrentPage,
    selectedReportedIds,
    setSelectedReportedIds,
    selectedResultIds,
    setSelectedResultIds,
    loadResults,
    loadReportedQuestions,
    handleQuickResolve,
    handleDeleteReport,
    handleBulkDeleteReports
  };
};
