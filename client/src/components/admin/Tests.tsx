import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AdminUIContext } from "../../context/AdminUIContext";
import {
  testsAPI,
  coursesAPI,
  questionsAPI,
  invalidateCache,
  reportedQuestionsAPI,
  getAdminHeaders,
} from "../../services/apiClient";
import QuestionPaperRenderer from "./QuestionPaperRenderer";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

import AddTestDrawer from "./AddTestDrawer";
import AddSingleTestDrawer from "./AddSingleTestDrawer";
import AddTestPDFDrawer from "./AddTestPDFDrawer";
import SubjectiveTestDrawer from "./SubjectiveTestDrawer";
import AddTestPDFBulkDrawer from "./AddTestPDFBulkDrawer";
import ViewFormatModal from "./ViewFormatModal";
import AddQuestionEditorDrawer from "./tests/AddQuestionEditorDrawer";

import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { parseFile } from "../../utils/testUtils/questionParser";
import { formatTime, getCourseName, testSortComparator } from "../../utils/testUtils/testHelpers";
import { generateDOCX } from "./DOCXGenerator";
import TestsResultsTab from "./tests/TestsResultsTab";
import ReportedQuestionsTab from "./tests/ReportedQuestionsTab";
import TestsListTab from "./tests/TestsListTab";
import TestsBulkUploaderTab from "./tests/TestsBulkUploaderTab";
import QuestionEditorHeader from "./tests/QuestionEditorHeader";
import QuestionEditorToolbar from "./tests/QuestionEditorToolbar";
import QuestionEditorList from "./tests/QuestionEditorList";
import QuestionSortModal from "./tests/QuestionSortModal";

// pdfjsLib worker configured in @/utils/testUtils/questionParser

const tabs = ["Tests", "Results", "Bulk Uploader", "Reported Questions"];
const detailSubTabs = [
  "Tests",
  "Test PDFs",
  "Subjective Tests",
  "Users",
] as const;

type DetailSubTab = (typeof detailSubTabs)[number];

const mockPDFs: any[] = [];
const mockSubjectives: any[] = [];
const mockUsers: any[] = [];
const mockDetailTests: any[] = [];

interface Test {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  course: string;
  courseId: string;
  courseName: string;
  questions: number | string;
  status: "active" | "inactive" | "scheduled" | "draft";
  date: string;
  openDate?: string;
  closeDate?: string;
  duration?: number | string;
  featured?: boolean;
  totalAttempts?: number;
  avgScore?: number;
  logo?: string;
  image?: string;
  price?: number | string;
  sortBy?: number | string;
  marks?: number | string;
  time?: number | string;
  published?: string;
  isSeries?: boolean;
}

interface Course {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  categoryId?: string;
}

interface Props {
  showToast: (m: string, type?: "success" | "error") => void;
}

const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Searching...",
  isMulti = false,
  showSelectAll = false,
  selectAllVariant = "inline",
  dropup = false,
  hideSearch = false,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) =>
    (o.label || "").toLowerCase().includes(search.toLowerCase()),
  );

  const toggleOption = (optVal: string) => {
    if (isMulti) {
      if (value.includes(optVal)) {
        onChange(value.filter((v: string) => v !== optVal));
      } else {
        onChange([...value, optVal]);
      }
    } else {
      onChange(optVal);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (value.length === options.length && options.length > 0) {
      onChange([]);
    } else {
      onChange(options.map((o: any) => o.value));
    }
  };
  const handleClear = () => onChange(isMulti ? [] : "");

  return (
    <div className={`relative ${isOpen ? "z-[100]" : "z-10"}`} ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-[12px] font-medium text-gray-700 outline-none flex items-center justify-between cursor-pointer focus:border-gray-400"
      >
        <span className="truncate text-left flex-1">
          {isMulti
            ? value.length > 0
              ? placeholder === "Select"
                ? `${value.length} selected`
                : placeholder
              : placeholder
            : value
              ? options.find((o: any) => o.value === value)?.label ||
              placeholder
              : placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-gray-400 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </div>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${dropup ? "bottom-full mb-1" : "top-full mt-1"} bg-white border border-gray-300 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col`}
        >
          {!dropup && !hideSearch && (
            <div className="border-b border-gray-200">
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 px-4 bg-transparent border-0 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {showSelectAll && isMulti && selectAllVariant === "buttons" && (
            <div className="flex justify-between items-center px-4 py-2 bg-[#fcfcfc] border-b border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAll();
                }}
                className="text-[12px] font-medium text-gray-600 hover:text-gray-800 uppercase tracking-wide"
              >
                SELECT ALL
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-[12px] font-medium text-gray-600 hover:text-gray-800 uppercase tracking-wide"
              >
                CLEAR
              </button>
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto py-1">
            {showSelectAll &&
              isMulti &&
              selectAllVariant === "inline" &&
              filtered.length > 0 && (
                <div
                  onClick={() => handleSelectAll()}
                  className={`px-4 py-2.5 text-[13px] cursor-pointer hover:bg-gray-50 flex items-center gap-3 transition-colors ${value.length === options.length && options.length > 0 ? "bg-blue-50/50 text-[#4361EE] font-medium" : "text-gray-600"}`}
                >
                  <input
                    type="checkbox"
                    checked={
                      value.length === options.length && options.length > 0
                    }
                    readOnly
                    className="w-[16px] h-[16px] rounded-[4px] border-gray-300 text-[#4361EE] focus:ring-[#4361EE] pointer-events-none"
                  />
                  <span>Select All</span>
                </div>
              )}
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-gray-400 text-center">
                No results found
              </div>
            ) : (
              filtered.map((opt: any) => {
                const isSelected = isMulti
                  ? value.includes(opt.value)
                  : value === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`px-4 py-3 text-[13px] cursor-pointer transition-colors flex items-center gap-3 ${isSelected && !isMulti ? "bg-[#1a5fdf] text-white font-medium shadow-sm" : "text-gray-700 hover:bg-[#eff4ff] hover:text-[#1a5fdf]"}`}
                  >
                    {isMulti && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-[16px] h-[16px] rounded-[4px] border-gray-300 text-[#4361EE] focus:ring-[#4361EE] pointer-events-none"
                      />
                    )}
                    <span>{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>

          {dropup && !hideSearch && (
            <div className="border-t border-gray-100 bg-white p-2">
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 px-3 bg-[#f8faff] rounded-lg border-0 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const Tests: React.FC<Props> = ({ showToast }) => {
  const { "*": routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [detailFilterOpen, setDetailFilterOpen] = useState(false);
  const [detailFilters, setDetailFilters] = useState({
    status: "all",
    type: "all",
  });
  const [activeTab, setActiveTab] = useState("Tests");
  const [selectedContentType, setSelectedContentType] = useState("");

  const [bulkUploadData, setBulkUploadData] = useState<{
    testSeries: string;
    testTitle: string;
    format: string;
    file: File | null;
    parsedQuestions: any[];
    extractedImages: string[];
  }>({
    testSeries: "",
    testTitle: "",
    format: "default",
    file: null,
    parsedQuestions: [],
    extractedImages: [],
  });

  const [activeImageAssignment, setActiveImageAssignment] = useState<{
    questionId: number;
    field: string; // "question" | "A" | "B" | "C" | "D"
  } | null>(null);

  const handleImageSelect = (dataUrl: string) => {
    if (!activeImageAssignment) return;
    const { questionId, field } = activeImageAssignment;
    setBulkUploadData(prev => ({
      ...prev,
      parsedQuestions: prev.parsedQuestions.map(q => {
        if (q.id === questionId) {
          if (field === "question") return { ...q, questionImage: dataUrl, hasDiagramOptions: false };
          
          // Handle option images
          const oIdx = field.charCodeAt(0) - 65; // A=0, B=1...
          const newOptionImages = [...(q.optionImages || ["", "", "", ""])];
          newOptionImages[oIdx] = dataUrl;
          return { ...q, optionImages: newOptionImages };
        }
        return q;
      })
    }));
    setActiveImageAssignment(null);
  };

  const handleRemoveImage = (qId: number, field: string) => {
    setBulkUploadData(prev => ({
      ...prev,
      parsedQuestions: prev.parsedQuestions.map(q => {
        if (q.id === qId) {
          if (field === "question") return { ...q, questionImage: "" };
          const oIdx = field.charCodeAt(0) - 65;
          const newOptionImages = [...(q.optionImages || ["", "", "", ""])];
          newOptionImages[oIdx] = "";
          return { ...q, optionImages: newOptionImages };
        }
        return q;
      })
    }));
  };

  // parseFile and extractQuestionsFromText moved to @/utils/testUtils/questionParser

  const [viewingFormatModal, setViewingFormatModal] = useState<string | null>(
    null,
  );
  const [viewingPaperQuestions, setViewingPaperQuestions] = useState<
    any[] | null
  >(null);
  const [viewingQuestionDetail, setViewingQuestionDetail] = useState<
    any | null
  >(null);
  const [viewingStudentAnalysis, setViewingStudentAnalysis] = useState<
    any | null
  >(null);
  const [viewingTestSeries, setViewingTestSeriesState] = useState<any | null>(
    () => {
      try {
        const saved = localStorage.getItem("viewingTestSeries");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    },
  );

  const setViewingTestSeries = (val: any) => {
    if (val) localStorage.setItem("viewingTestSeries", JSON.stringify(val));
    else localStorage.removeItem("viewingTestSeries");
    setViewingTestSeriesState(val);
  };

  const [viewingTestSeriesTab, setViewingTestSeriesTabState] =
    useState<DetailSubTab>(() => {
      return (localStorage.getItem("viewingTestSeriesTab") as any) || "Tests";
    });

  const setViewingTestSeriesTab = (val: DetailSubTab) => {
    localStorage.setItem("viewingTestSeriesTab", val);
    setViewingTestSeriesTabState(val);
  };
  const [viewingQuestionEditor, setViewingQuestionEditorState] = useState<
    any | null
  >(() => {
    try {
      const saved = localStorage.getItem("viewingQuestionEditor");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setViewingQuestionEditor = (val: any) => {
    if (val) localStorage.setItem("viewingQuestionEditor", JSON.stringify(val));
    else localStorage.removeItem("viewingQuestionEditor");
    setViewingQuestionEditorState(val);
  };

  const [expandedDropdownItem, setExpandedDropdownItem] = useState<string | null>(null);
  const [viewingReevaluateTest, setViewingReevaluateTest] = useState<any | null>(null);
  const [viewingExportPDFTest, setViewingExportPDFTest] = useState<any | null>(null);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddSingleTestDrawer, setShowAddSingleTestDrawer] = useState(false);
  const [showAddTestPDFDrawer, setShowAddTestPDFDrawer] = useState(false);
  const [showSubjectiveTestDrawer, setShowSubjectiveTestDrawer] =
    useState(false);
  const [showAddTestPDFBulkDrawer, setShowAddTestPDFBulkDrawer] =
    useState(false);
  const [showFloatingAddMenu, setShowFloatingAddMenu] = useState(false);
  const [showFloatingMoreMenu, setShowFloatingMoreMenu] = useState(false);
  const [viewingAddQuestionForm, setViewingAddQuestionForm] = useState<
    any | null
  >(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedBulkDeleteQuestions, setSelectedBulkDeleteQuestions] =
    useState<number[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);


  // Results Tab States
  const [results, setResults] = useState<any[]>([]);
  const [resultFilters, setResultFilters] = useState({
    series: "",
    subject: "",
    type: "",
    test: "",
  });

  // Reported Questions Tab States
  const [reportedQuestions, setReportedQuestions] = useState<any[]>([]);
  const [reportedSearchQuery, setReportedSearchQuery] = useState("");
  const [isReportedFilterOpen, setIsReportedFilterOpen] = useState(false);
  const [reportedFilters, setReportedFilters] = useState({
    issue: "",
    testSeries: "",
    testTitle: "",
  });
  const [activeActionMenuId, setActiveActionMenuId] = useState<
    string | number | null
  >(null);

  // New states for standardized pagination
  const [resultsPageSize, setResultsPageSize] = useState(10);
  const [resultsCurrentPage, setResultsCurrentPage] = useState(1);
  const [reportedPageSize, setReportedPageSize] = useState(10);
  const [reportedCurrentPage, setReportedCurrentPage] = useState(1);

  // Question Library States

  const [detailTests, setDetailTests] = useState<any[]>([]);
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [questionFormData, setQuestionFormData] = useState<any>(null);
  const [editorQuestions, setEditorQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (routeId) {
      const parts = routeId.split("/");
      const id = parts[0];
      const subPath = parts.slice(1).join("/");

      // Search in all available lists including nested tests
      const foundTest =
        tests.find((t) => t.id === id || (t as any)._id === id) ||
        detailTests.find((t) => t.id === id || (t as any)._id === id);
      const foundCourse = courses.find(
        (c) => c.id === id || (c as any)._id === id,
      );

      if (foundTest) {
        // If it's a test, we might also want to set its parent series if possible
        // but for now ensure the editor/view is shown
        if (subPath === "questions/add" || subPath === "review") {
          setActiveTab("Tests");
          setViewingQuestionEditor(foundTest);
        } else if (subPath === "edit") {
          setActiveTab("Tests");
          setEditingTest(foundTest);
          setShowAddSingleTestDrawer(true);
        } else if (subPath === "results") {
          setActiveTab("Results");
          setResultFilters((prev) => ({
            ...prev,
            series: foundTest.courseName || "",
            test: foundTest.name || foundTest.title || "",
          }));
        }
      } else if (foundCourse) {
        setViewingTestSeries(foundCourse);
      }
    } else if (viewingTestSeries) {
      if (location.pathname === "/admin/tests") {
        setViewingTestSeries(null);
        setViewingQuestionEditor(null);
      }
    }
  }, [routeId, tests, courses, detailTests, location.pathname]);

  // Sync viewingTestSeries with route
  const handleSetViewingTestSeries = (val: any) => {
    try {
      if (val) {
        const id = typeof val === "object" ? val.id || val._id : val;
        if (id && location.pathname !== `/admin/tests/${id}`) {
          navigate(`/admin/tests/${id}`);
        }
        if (typeof val === "object") {
          localStorage.setItem("viewingTestSeries", JSON.stringify(val));
        }
      } else {
        if (location.pathname !== "/admin/tests") {
          navigate("/admin/tests");
        }
        localStorage.removeItem("viewingTestSeries");
      }
      setViewingTestSeriesState(val);
    } catch (error) {
      console.error("Error in handleSetViewingTestSeries:", error);
      setViewingTestSeriesState(val);
    }
  };

  // Helper to render text with math support (shared for preview)
  const renderQuestionText = (text: any) => {
    if (typeof text !== "string") return String(text || "");
    const parts = text.split(/(\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part && part.startsWith("$") && part.endsWith("$")) {
        const math = part.slice(1, -1).trim();
        if (!math) return null;
        try {
          return <InlineMath key={i} math={math} />;
        } catch (e) {
          return (
            <span key={i} className="text-red-500 font-mono text-[10px]">
              {part}
            </span>
          );
        }
      }
      return (
        <span key={i} dangerouslySetInnerHTML={{ __html: String(part) }} />
      );
    });
  };

  // Helper to render question diagram — handles both inline diagrams and diagram-option questions
  const renderDiagram = (q: any, field: string = "question") => {
    const dataUrl =
      field === "question"
        ? q.questionImage
        : q.optionImages?.[field.charCodeAt(0) - 65] || "";

    if (!dataUrl) {
      return (
        <div className="mt-2 text-center">
          <button
            onClick={() =>
              setActiveImageAssignment({ questionId: q.id, field })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed transition-all ${activeImageAssignment?.questionId === q.id && activeImageAssignment?.field === field ? "border-amber-400 bg-amber-50 text-amber-700 animate-pulse" : "border-gray-200 text-gray-400 hover:border-black hover:text-black"}`}
          >
            <span className="material-symbols-outlined text-[16px]">
              add_photo_alternate
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              {activeImageAssignment?.questionId === q.id &&
              activeImageAssignment?.field === field
                ? "Select from Gallery"
                : `Add ${field === "question" ? "Diagram" : `Image`}`}
            </span>
          </button>
        </div>
      );
    }

    const isPageLevel = field === "question" && q.hasDiagramOptions;

    return (
      <div
        className={`mt-3 border rounded-xl overflow-hidden relative group ${isPageLevel ? "border-amber-200 bg-amber-50/40" : "border-blue-100 bg-blue-50/40"}`}
      >
        <div
          className={`px-3 py-1.5 border-b flex items-center justify-between gap-1.5 ${isPageLevel ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-100"}`}
        >
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">
              {isPageLevel ? "schema" : "image"}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${isPageLevel ? "text-amber-600" : "text-blue-500"}`}
            >
              {isPageLevel
                ? "Options as Diagrams"
                : field === "question"
                  ? "Question Diagram"
                  : `Option ${field} Image`}
            </span>
          </div>
          <button
            onClick={() => handleRemoveImage(q.id, field)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
        <div className="p-2 flex flex-col items-center">
          <img
            src={dataUrl}
            alt="Diagram"
            className={`w-full h-auto rounded-lg object-contain ${field === "question" ? "max-h-64" : "max-h-32"}`}
            loading="lazy"
          />
          <button
            onClick={() =>
              setActiveImageAssignment({ questionId: q.id, field })
            }
            className="mt-2 text-[10px] font-bold text-gray-400 hover:text-black flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">sync</span>
            Change
          </button>
        </div>
      </div>
    );
  };

  const handleSaveQuestion = async (data?: any) => {
    const payload = data || questionFormData;
    if (!payload) return;
    try {
      const editorId = viewingQuestionEditor?.id || viewingQuestionEditor?._id;
      const questionId = String(payload.id || payload._id || "");

      if (questionId) {
        console.log(
          "[handleSaveQuestion] Updating question:",
          questionId,
          "payload keys:",
          Object.keys(payload),
        );
        await questionsAPI.update(questionId, payload);
        showToast("Question updated successfully", "success");
      } else {
        console.log(
          "[handleSaveQuestion] Creating new question for test:",
          editorId,
        );
        await questionsAPI.create({ ...payload, testId: editorId });
        showToast("Question created successfully", "success");
      }
      invalidateCache("tests"); // Force refresh for questions list
      setViewingAddQuestionForm(null);
      setQuestionFormData(null);
      // Refresh questions list for the editor
      if (editorId) {
        const qs = await testsAPI.getQuestions(editorId);
        setEditorQuestions(qs);
      }
    } catch (err: any) {
      console.error("[handleSaveQuestion] Error:", err);
      showToast(err.message || "Failed to save question", "error");
    }
  };

  const handleDeleteQuestion = async (id: string | number) => {
    if (!window.confirm("Are you sure you want to delete this question?"))
      return;
    try {
      await questionsAPI.delete(String(id));
      invalidateCache("tests");
      showToast("Question deleted successfully", "success");
      // Refresh questions list for the editor
      const editorId = viewingQuestionEditor?.id || viewingQuestionEditor?._id;
      if (editorId) {
        const qs = await testsAPI.getQuestions(editorId);
        setEditorQuestions(qs);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    if (viewingTestSeries) {
      // Load actual tests for this series from the server
      const seriesId = viewingTestSeries?.id || viewingTestSeries?._id;
      if (!seriesId) return;
      const loadDetailTests = async () => {
        try {
          // Try course-specific endpoint first
          const res = await fetch(`/api/courses/${seriesId}/tests`);
          if (res.ok) {
            const data = await res.json();
            setDetailTests(Array.isArray(data) ? data : []);
          } else {
            // Fall back to filtering all tests
            const allRes = await fetch("/api/tests");
            if (allRes.ok) {
              const allTests = await allRes.json();
              const filtered = (Array.isArray(allTests) ? allTests : []).filter(
                (t: any) =>
                  t &&
                  (t.courseId === seriesId ||
                    (t as any)._id === seriesId ||
                    t.id === seriesId),
              );
              setDetailTests(filtered);
            }
          }
        } catch (err) {
          console.error("Error loading detail tests:", err);
          setDetailTests([]);
        }
      };
      loadDetailTests();
    } else {
      setDetailTests([]);
    }
  }, [viewingTestSeries]);

  useEffect(() => {
    const fetchQs = async () => {
      const editorId =
        viewingQuestionEditor?.id || (viewingQuestionEditor as any)?._id;
      if (viewingQuestionEditor && editorId) {
        try {
          const qs = await testsAPI.getQuestions(editorId);
          setEditorQuestions(Array.isArray(qs) ? qs : []);
        } catch (err) {
          setEditorQuestions([]);
        }
      }
    };
    fetchQs();
  }, [viewingQuestionEditor]);

  useEffect(() => {
    if (viewingAddQuestionForm) {
      if (
        typeof viewingAddQuestionForm === "object" &&
        viewingAddQuestionForm !== null
      ) {
        setQuestionFormData({ ...viewingAddQuestionForm });
      } else {
        setQuestionFormData({
          id: null,
          textEn: "",
          textHi: "",
          optionsContent: [
            { id: "a", label: "" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
            { id: "d", label: "D" },
          ],
          correctOption: "c",
          solutionEn: "",
          positiveMarks: "1.00",
          negativeMarks: "0.00",
          type: "Multiple Choice Question",
          section: viewingQuestionEditor?.name || "Default",
        });
      }
    } else {
      setQuestionFormData(null);
    }
  }, [viewingAddQuestionForm, viewingQuestionEditor]);

  useEffect(() => {
    loadData();
    if (activeTab === "Results") {
      loadResults();
    }
    if (activeTab === "Reported Questions") {
      loadReportedQuestions();
    }

  }, [activeTab]);



  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (showFloatingAddMenu && !target.closest(".add-menu-container")) {
        setShowFloatingAddMenu(false);
      }

      if (showFloatingMoreMenu && !target.closest(".more-menu-container")) {
        setShowFloatingMoreMenu(false);
      }

      if (
        activeActionMenuId !== null &&
        !target.closest(".action-menu-container")
      ) {
        setActiveActionMenuId(null);
      }

      if (
        activeMenu !== null &&
        !target.closest(".action-menu-container")
      ) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showFloatingAddMenu, showFloatingMoreMenu, activeActionMenuId, activeMenu]);

  const loadResults = async () => {
    // Mock results matching screenshot + more entries
    const mockResults = [
      {
        id: "res_1",
        studentName: "Harsh",
        studentId: "STU-1772001203724",
        timeTaken: 19,
        obtainedMarks: 0,
        totalMarks: 8,
        submittedAt: "2026-02-25T15:57:00",
        testId: "test_159",
        testName: "HSSC TEST-159",
      },
      {
        id: "res_2",
        studentName: "Karan",
        studentId: "STU-1772012972378",
        timeTaken: 3,
        obtainedMarks: 0,
        totalMarks: 8,
        submittedAt: "2026-02-25T15:27:00",
        testId: "test_159",
        testName: "HSSC TEST-159",
      },
      {
        id: "res_3",
        studentName: "Karan",
        studentId: "STU-1772012972378",
        timeTaken: 5,
        obtainedMarks: 3,
        totalMarks: 8,
        submittedAt: "2026-02-25T15:27:00",
        testId: "test_159",
        testName: "HSSC TEST-159",
      },
      {
        id: "res_4",
        studentName: "Harsh",
        studentId: "STU-1772001203724",
        timeTaken: 45,
        obtainedMarks: 6,
        totalMarks: 8,
        submittedAt: "2026-02-26T10:15:00",
        testId: "test_160",
        testName: "HSSC TEST-160",
      },
      {
        id: "res_5",
        studentName: "Amit Verma",
        studentId: "STU-1883012932910",
        timeTaken: 120,
        obtainedMarks: 8,
        totalMarks: 8,
        submittedAt: "2026-02-26T11:40:00",
        testId: "test_159",
        testName: "HSSC TEST-159",
      },
      {
        id: "res_6",
        studentName: "Rahul",
        studentId: "STU-1994032139044",
        timeTaken: 60,
        obtainedMarks: 5,
        totalMarks: 8,
        submittedAt: "2026-02-26T14:20:00",
        testId: "test_161",
        testName: "HSSC TEST-161",
      },
    ];
    setResults(mockResults);
  };

  const loadReportedQuestions = async () => {
    try {
      const reports = await reportedQuestionsAPI.getAll();
      setReportedQuestions(reports);
    } catch (error) {
      console.error("Error loading reported questions:", error);
      // Fallback or empty state already handled by setReportedQuestions([]) init
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      await reportedQuestionsAPI.updateStatus(reportId, status);
      await loadReportedQuestions();
      alert(`Report status updated to ${status}`);
    } catch (error) {
      console.error("Error updating report status:", error);
      alert("Failed to update status");
    }
  };

  const loadData = async () => {
    // Safety fallback: Ensure loading is disabled after 10 seconds 
    // even if requests are extremely slow or hanging.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 10000);

    try {
      const [testData, courseData] = await Promise.all([
        testsAPI.getAll().catch((err) => {
          console.error("Error fetching tests:", err);
          return [];
        }),
        coursesAPI.getAll().catch((err) => {
          console.error("Error fetching courses:", err);
          return [];
        }),
      ]);
      setTests(Array.isArray(testData) ? testData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
    } catch (error) {
      console.error("loadData massive failure:", error);
      setTests([]);
      setCourses([]);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  // getCourseName and formatTime moved to @/utils/testUtils/testHelpers

  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      !searchQuery ||
      (test.name &&
        test.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCourse =
      !filterCourse ||
      test.courseId === filterCourse ||
      (!test.courseId && test.course === filterCourse);
    const matchesStatus = !filterStatus || test.status === filterStatus;

    // ONLY show Test Series in the main global list.
    // Individual tests should only be visible inside their respective series.
    const isMainSeries = test.isSeries === true;

    return matchesSearch && matchesCourse && matchesStatus && isMainSeries;
  }).sort(testSortComparator);

  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const paginatedTests = filteredTests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleOpenModal = (test?: Test) => {
    if (test) {
      setEditingTest(test);
    } else {
      setEditingTest(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTest(null);
  };

  const handleSubmit = async (data: any) => {
    // Auto-fill courseId from the test series we're currently viewing
    const effectiveCourseId =
      data.courseId || viewingTestSeries?.id || viewingTestSeries?._id || "";
    const effectiveCourseName =
      data.courseName ||
      (viewingTestSeries
        ? viewingTestSeries.name || viewingTestSeries.title
        : "");

    if (!data.name) {
      showToast("Please fill Test Title", "error");
      return;
    }
    if (!effectiveCourseId) {
      showToast("Please select a Course / Test Series", "error");
      return;
    }

    const selectedCourse =
      courses.find(
        (c) =>
          c.id === effectiveCourseId || (c as any)._id === effectiveCourseId,
      ) || viewingTestSeries;

    try {
      const testData: any = {
        id: editingTest?.id || `test_${Date.now()}`,
        name: data.name,
        courseId: effectiveCourseId,
        courseName: selectedCourse
          ? selectedCourse.name || selectedCourse.title
          : effectiveCourseName,
        course: selectedCourse
          ? selectedCourse.name || selectedCourse.title
          : effectiveCourseName,
        noOfQuestions: parseInt(data.noOfQuestions || data.questions) || 0,
        duration: parseInt(data.duration || 0) || 0,
        status: data.status || "active",
        openDate: data.openDate || "",
        closeDate: data.closeDate || "",
        featured: data.featured || false,
        price: data.price,
        logo: data.image,
        sortBy: data.sortBy,
        isSeries: viewingTestSeries ? false : true,
        testSeriesId: viewingTestSeries
          ? viewingTestSeries.id || viewingTestSeries._id
          : undefined,
        date:
          editingTest?.date ||
          new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      };

      if (editingTest) {
        try {
          await testsAPI.update(
            editingTest.id || (editingTest as any)._id,
            testData,
          );
          setTests(
            tests.map((t) =>
              (t.id || (t as any)._id) ===
                (editingTest.id || (editingTest as any)._id)
                ? testData
                : t,
            ),
          );
          showToast("Test updated successfully!");
        } catch (apiError) {
          console.error("API update error:", apiError);
          setTests(
            tests.map((t) =>
              (t.id || (t as any)._id) ===
                (editingTest.id || (editingTest as any)._id)
                ? testData
                : t,
            ),
          );
          showToast("Test updated (local only)");
        }
      } else {
        try {
          await testsAPI.create(testData);
          // Add to local list immediately for instant UI feedback
          setTests((prev) => [...prev, testData]);
          // Also refresh full list from server
          loadData();
          // If inside a test series view, reload that series' tests too
          if (viewingTestSeries) {
            const seriesId =
              viewingTestSeries.id || (viewingTestSeries as any)._id;
            const res = await fetch(`/api/courses/${seriesId}/tests`);
            if (res.ok) {
              const data = await res.json();
              setDetailTests(Array.isArray(data) ? data : []);
            } else {
              setDetailTests((prev) => [...prev, testData]);
            }
          }
          showToast("Test created successfully!");
        } catch (apiError) {
          console.error("API create error:", apiError);
          setTests([...tests, testData]);
          showToast("Test created (local only)");
        }
      }

      handleCloseModal();
    } catch (error) {
      console.error("Test save error:", error);
      showToast(
        `Error: ${error instanceof Error ? error.message : "Failed to save test"}`,
        "error",
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this test?")) {
      try {
        await testsAPI.delete(id);
        setTests(tests.filter((t) => (t.id || (t as any)._id) !== id));
        if (viewingTestSeries) {
          setDetailTests((prev) =>
            prev.filter((t) => (t.id || (t as any)._id) !== id),
          );
        }
        showToast("Test deleted successfully!");
      } catch (error) {
        showToast("Failed to delete test", "error");
      }
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      showToast("Downloading file...");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Download started!");
    } catch (err) {
      showToast("Failed to download PDF", "error");
    }
  };

  const handleDuplicateTest = async (test: any) => {
    const testId = test.id || (test as any)._id;
    try {
      showToast("Duplicating test...");
      const response = await testsAPI.duplicate(testId);
      const createdTest = response?.data || response;
      setTests((prev) => [...prev, createdTest]);
      if (viewingTestSeries) {
        setDetailTests((prev) => [...prev, createdTest]);
      }
      showToast("Test duplicated successfully!");
    } catch (error) {
      console.error("Duplicate error:", error);
      showToast("Failed to duplicate test", "error");
    }
  };

  const handleViewResults = (test: any) => {
    const testId = test.id || (test as any)._id;
    navigate(`/admin/tests/${testId}/results`);
    setActiveActionMenuId(null);
  };

  const handleReevaluate = async (test: any) => {
    const testId = test.id || (test as any)._id;
    try {
      showToast("Re-evaluating attempts...");
      await testsAPI.reevaluate(testId);
      showToast("Re-evaluation completed successfully!");
      loadData(); // Refresh UI to show updated marks
    } catch (err: any) {
      showToast(err.message || "Failed to re-evaluate", "error");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      showToast("Updating publish status...");
      await testsAPI.publish(id);
      setTests((prev) =>
        prev.map((t) =>
          (t.id || (t as any)._id) === id
            ? { ...t, status: t.status === "active" ? "inactive" : "active" }
            : t,
        ),
      );
      if (viewingTestSeries) {
        setDetailTests((prev) =>
          prev.map((t) =>
            (t.id || (t as any)._id) === id
              ? { ...t, status: t.status === "active" ? "inactive" : "active" }
              : t,
          ),
        );
      }
      showToast("Publish status updated!");
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  };

  const handleExportPDF = async (test: any, withSolution: boolean) => {
    const testId = test.id || (test as any)._id;
    const testName = (test.name || test.title || "test").replace(/\s+/g, "-").toLowerCase();
    const filename = `${testName}-${withSolution ? "with" : "without"}-solution.pdf`;
    const url = `/api/tests/${testId}/export?solution=${withSolution}`;
    await downloadFile(url, filename);
  };

  const handleBulkDelete = async () => {
    if (selectedTests.length === 0) return;
    if (confirm(`Delete ${selectedTests.length} selected tests?`)) {
      try {
        await Promise.all(selectedTests.map((id) => testsAPI.delete(id)));
        setTests(
          tests.filter((t) => !selectedTests.includes(t.id || (t as any)._id)),
        );
        setSelectedTests([]);
        showToast(`${selectedTests.length} tests deleted!`);
      } catch (error) {
        showToast("Failed to delete tests", "error");
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedTests.length === paginatedTests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(paginatedTests.map((t) => t.id || (t as any)._id));
    }
  };

  const toggleSelectTest = (id: string) => {
    setSelectedTests((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const toggleFeatured = async (test: Test) => {
    try {
      const updatedTest = { ...test, featured: !test.featured };
      await testsAPI.update(test.id || (test as any)._id, updatedTest);
      setTests(
        tests.map((t) =>
          (t.id || (t as any)._id) === (test.id || (test as any)._id)
            ? updatedTest
            : t,
        ),
      );
      showToast(
        test.featured ? "Removed from featured!" : "Added to featured!",
      );
    } catch (error) {
      showToast("Failed to update test", "error");
    }
  };

  const toggleStatus = async (test: Test) => {
    const newStatus = test.status === "active" ? "inactive" : "active";
    try {
      const updatedTest = { ...test, status: newStatus as any };
      await testsAPI.update(test.id || (test as any)._id, updatedTest);
      setTests(
        tests.map((t) =>
          (t.id || (t as any)._id) === (test.id || (test as any)._id)
            ? updatedTest
            : t,
        ),
      );
      showToast(`Test ${newStatus}!`);
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  };

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

  const handleBulkUploadFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setBulkUploadData({
        ...bulkUploadData,
        file,
        parsedQuestions: [],
      });
      setIsParsing(true);
      showToast(`Preparing to parse ${file.name}...`, "success");
      try {
        const { questions, extractedImages } = await parseFile(file);
        setBulkUploadData((prev) => ({
          ...prev,
          file,
          parsedQuestions: questions,
          extractedImages: extractedImages || [],
        }));
        if (questions.length === 0) {
          showToast(
            "No questions could be extracted. Please check the document format.",
            "error",
          );
        } else {
          showToast(
            `Successfully extracted ${questions.length} questions and ${extractedImages?.length || 0} images!`,
            "success",
          );
        }
      } catch (err) {
        console.error("File parsing error:", err);
        showToast(
          "Error parsing file. Ensure it is a valid document.",
          "error",
        );
      } finally {
        setIsParsing(false);
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleBulkUploadProceed = async () => {
    const testId =
      bulkUploadData.testTitle ||
      viewingQuestionEditor?.id ||
      (viewingQuestionEditor as any)?._id;
    if (!bulkUploadData.testSeries && !viewingQuestionEditor) {
      showToast("Please select Test Series", "error");
      return;
    }
    if (!testId) {
      showToast("Please select Test Title", "error");
      return;
    }
    if (
      !bulkUploadData.file ||
      (bulkUploadData.parsedQuestions || []).length === 0
    ) {
      showToast(
        "No questions to upload. Please parse a file first.",
        "error",
      );
      return;
    }

    try {
      // 1. Fetch current questions for duplicate check and limit enforcement
      const existingQuestions =
        await testsAPI.getQuestions(testId);
      const existingTexts = new Set(
        existingQuestions.map((q: any) =>
          (q.questionEn || q.question || "").trim().toLowerCase(),
        ),
      );

      // Get the limit for this test
      const targetTestMatch =
        tests.find((t) => (t.id || (t as any)._id) === testId) ||
        detailTests.find(
          (t) => (t.id || (t as any)._id) === testId,
        );
      const limit = targetTestMatch?.noOfQuestions || 0;
      const currentCount = existingQuestions.length;

      if (limit > 0 && currentCount >= limit) {
        showToast(
          `Test already has ${currentCount} questions. Limit is ${limit}.`,
          "error",
        );
        return;
      }

      // 2. Prepare payload - Standardization to displayOptions
      const uploadBase64Image = async (base64Str: string) => {
        if (!base64Str || !base64Str.startsWith("data:image")) return base64Str;
        try {
          const r = await fetch("/api/v2/upload/image/base64", {
            method: "POST",
            headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Str }),
          });
          if (!r.ok) return base64Str;
          const data = await r.json();
          return data.url || base64Str;
        } catch (e) {
          return base64Str;
        }
      };

      let filteredList = (bulkUploadData.parsedQuestions || []).filter(
        (q) => !existingTexts.has((q.questionEn || "").trim().toLowerCase()),
      );

      let questionsToUpload = await Promise.all(
        filteredList.map(async (q) => {
          const qImageUrl = await uploadBase64Image(q.questionImage || "");
          
          const processedOptions = await Promise.all(
            (q.options || []).map(async (opt: string, i: number) => {
              const optImageUrl = await uploadBase64Image(q.optionImages?.[i] || "");
              return {
                id: i + 1,
                text: opt,
                image: optImageUrl,
                isCorrect: String(q.correctAnswer).toUpperCase() === String.fromCharCode(65 + i),
              };
            })
          );

          return {
            testId: testId,
            courseId:
              bulkUploadData.testSeries ||
              viewingTestSeries?.id ||
              (viewingTestSeries as any)?._id,
            questionEn: q.questionEn,
            questionHi: q.questionHi || "",
            questionImage: qImageUrl,
            type: "Multiple Choice Question",
            marks: q.positiveMarks || 4,
            negative: q.negativeMarks || -1,
            displayOptions: processedOptions,
            hasDiagramOptions: q.hasDiagramOptions || false,
            solution: {
              heading: "Full Solution",
              text: q.solution || "",
            },
            format: bulkUploadData.format || "default",
          };
        })
      );


      if (questionsToUpload.length === 0) {
        showToast(
          "All questions in this file already exist in the test.",
          "error",
        );
        return;
      }

      // Enforce the limit
      if (
        limit > 0 &&
        currentCount + questionsToUpload.length > limit
      ) {
        const allowed = limit - currentCount;
        showToast(
          `Only ${allowed} out of ${questionsToUpload.length} new questions will be uploaded as per the limit (${limit}).`,
          "error",
        );
        questionsToUpload = questionsToUpload.slice(0, allowed);
      }

      showToast(
        `Uploading ${questionsToUpload.length} new questions...`,
        "success",
      );

      // 3. Bulk upload
      const res = await fetch("/api/questions/bulk", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ questions: questionsToUpload }),
      });

      if (!res.ok) throw new Error("Upload failed");

      invalidateCache("tests");
      showToast(
        `${questionsToUpload.length} questions uploaded successfully!`,
        "success",
      );

      // 4. Update the test's viewFormat if needed
      const formatVal = bulkUploadData.format || "default";
      await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewFormat: formatVal }),
      });

      // 5. Cleanup and Sync
      setBulkUploadData({
        ...bulkUploadData,
        file: null,
        parsedQuestions: [],
      });

      // Sync the editor view if we are in it
      const updatedQs = await testsAPI.getQuestions(testId);
      setEditorQuestions(updatedQs);

      // 6. Redirect to view results
      if (targetTestMatch) {
        setViewingQuestionEditor(targetTestMatch);
        setActiveTab("Tests");
      }
      loadData();
    } catch (err: any) {
      showToast(
        err.message || "Failed to upload questions",
        "error",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  const renderTestSeriesDetail = () => {
    if (!viewingTestSeries && !viewingQuestionEditor) return null;

    const mockDetailTests: any[] = [];
    const mockPDFs: any[] = [];
    const mockSubjectives: any[] = [];
    const mockUsers: any[] = [];

    // Question Editor View (Full Page)
    if (viewingQuestionEditor) {
      const qeTests = editorQuestions;

      return (
        <div className="w-full bg-[#f8f9fa] min-h-screen pb-20 animate-in fade-in duration-500">
          <QuestionEditorHeader
            testName={viewingQuestionEditor?.name || viewingQuestionEditor?.title || viewingTestSeries?.name || "Unnamed Test"}
            seriesName={viewingTestSeries?.name || "Test"}
            onBack={() => setViewingQuestionEditor(null)}
            onPublish={async () => {
              const testId = viewingQuestionEditor?.id || viewingQuestionEditor?._id;
              if (!testId) return;
              try {
                showToast("Publish changes...");
                await testsAPI.publish(testId);
                showToast("Test published successfully!");
              } catch (error: any) {
                showToast(error.message || "Failed to publish test", "error");
              }
            }}
          />

          <div className="max-w-[1400px] mx-auto p-6 space-y-6">
            <QuestionEditorToolbar
              marks={viewingQuestionEditor.marks}
              time={viewingQuestionEditor.time}
              lastPublished={viewingQuestionEditor.published}
              testName={viewingQuestionEditor.name}
              showFloatingAddMenu={showFloatingAddMenu}
              setShowFloatingAddMenu={setShowFloatingAddMenu}
              showFloatingMoreMenu={showFloatingMoreMenu}
              setShowFloatingMoreMenu={setShowFloatingMoreMenu}
              setActiveActionMenuId={setActiveActionMenuId}
              onAddQuestion={() => setViewingAddQuestionForm({})}
              onBulkUpload={() => {
                setViewingTestSeries(null);
                setActiveTab("Bulk Uploader");
              }}
              onBulkDelete={() => {
                setShowBulkDeleteModal(true);
                setSelectedBulkDeleteQuestions([]);
              }}
              onSort={() => setShowSortModal(true)}
            />

            <QuestionEditorList
              questions={qeTests}
              renderQuestionText={renderQuestionText}
              onEditQuestion={(q) => setViewingAddQuestionForm(q)}
              onDeleteQuestion={(id) => handleDeleteQuestion(id)}
            />
          </div>
        </div>
      );
    }

    // Detail Header
    return (
      <div className="flex flex-col h-full bg-[#fafafa] animate-in fade-in duration-500 min-h-screen">
        {/* Detail Header */}
        <div className="bg-white px-8 py-3 border-b border-gray-100 flex items-center sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-5">
            <button
              onClick={() => handleSetViewingTestSeries(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-400 hover:text-black transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_back
              </span>
            </button>
            <h1 className="text-[20px] font-bold text-gray-800 tracking-tight">
              {viewingTestSeries?.name ||
                viewingTestSeries?.title ||
                (typeof viewingTestSeries === "string"
                  ? viewingTestSeries
                  : "Test Series Detail")}
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
                value={detailSearchQuery}
                onChange={(e) => setDetailSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-[#f8f9fa] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-black focus:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setDetailFilterOpen(!detailFilterOpen)}
                className={`h-11 px-5 rounded-xl border flex items-center gap-2 text-[12px] font-bold transition-all ${detailFilterOpen ? "bg-black text-white border-black shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-black hover:shadow-sm"}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  tune
                </span>
                Filters
              </button>

              {detailFilterOpen && (
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
                              setDetailFilters({ ...detailFilters, status: s })
                            }
                            className={`h-8 rounded-lg text-[11px] font-bold capitalize border transition-all ${detailFilters.status === s ? "bg-black text-white border-black" : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300"}`}
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
              onClick={() => setShowAddSingleTestDrawer(true)}
              className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-md active:scale-95"
              title="Add Test"
            >
              <span className="material-symbols-outlined text-[26px]">add</span>
            </button>
          </div>
        </div>

        {/* Detail Tabs */}
        <div className="bg-white px-10 flex gap-8 border-b border-gray-100 sticky top-[73px] z-20 shadow-sm overflow-x-auto no-scrollbar">
          {detailSubTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setViewingTestSeriesTab(tab as DetailSubTab)}
              className={`py-4 text-[11.5px] font-bold tracking-[0.12em] uppercase transition-all relative whitespace-nowrap ${viewingTestSeriesTab === tab
                ? "text-black"
                : "text-gray-400 hover:text-gray-800"
                }`}
            >
              {tab}
              {viewingTestSeriesTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8">
          {viewingTestSeriesTab === "Tests" && (
            <div className="space-y-6">
              {/* Test Cards List */}
              <div className="grid grid-cols-1 gap-4">
                {(() => {
                  const filtered = (detailTests.length > 0 ? detailTests : mockDetailTests)
                    .filter((t) => {
                      if (!t) return false;
                      const name = (t.name || t.title || "").toLowerCase();
                      const matchesSearch = name.includes(
                        detailSearchQuery.toLowerCase(),
                      );
                      const matchesStatus =
                        detailFilters.status === "all" ||
                        (detailFilters.status === "published"
                          ? t.published !== false
                          : t.published === false);
                      return matchesSearch && matchesStatus;
                    }).sort((a, b) => {
                      const sortA = parseFloat(String((a as any).sortBy || "0")) || 0;
                      const sortB = parseFloat(String((b as any).sortBy || "0")) || 0;
                      return sortB - sortA;
                    });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white rounded-[2rem] p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                          <span className="material-symbols-outlined text-[32px]">assignment_late</span>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-[16px] font-bold text-gray-800">No tests found</h3>
                          <p className="text-[13px] text-gray-400 font-medium max-w-[280px]">We couldn't find any tests for this series. Try adjusting your search or add a new test.</p>
                        </div>
                        <button
                          onClick={() => setShowAddSingleTestDrawer(true)}
                          className="px-6 py-2 bg-black text-white rounded-xl text-[13px] font-bold shadow-sm hover:scale-105 transition-all mt-2"
                        >
                          Add Your First Test
                        </button>
                      </div>
                    );
                  }

                  return filtered.map((test, index) => (
                    <div
                      key={String(test?.id || (test as any)._id || index)}
                      className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="px-5 py-4 flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-[16px] h-[16px] rounded border-gray-300 accent-black cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-[14px] font-bold text-gray-800 hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                            onClick={() => {
                              setViewingQuestionEditor(test);
                              setEditingTest(test);
                            }}
                          >
                            {test.name || (test as any).title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-[12px] text-gray-500 font-medium">
                            <span><span className="font-bold text-gray-700">{test.marks || 0}</span> Marks</span>
                            <span><span className="font-bold text-gray-700">{test.time || 0}</span> Minutes</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                          {/* Last Published */}
                          <span className="text-[11px] text-gray-400 whitespace-nowrap hidden xl:block mr-2">
                            Last Published:<span className="font-semibold ml-1">{(test as any).published || "—"}</span>
                          </span>

                          {/* Toggle */}
                          <button
                            onClick={() => toggleStatus(test)}
                            className={`w-9 h-[20px] rounded-full relative transition-all duration-300 ${test.status === "active" ? "bg-gray-700" : "bg-gray-200"}`}
                          >
                            <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow ${test.status === "active" ? "left-[18px]" : "left-[2px]"}`} />
                          </button>

                          {/* Lock Icon */}
                          <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <span className="material-symbols-outlined text-[19px]">lock_open</span>
                          </button>

                          {/* Price */}
                          <span className="text-[13px] font-bold text-gray-700 min-w-[32px] text-center">
                            {Number((test as any).price || 0).toFixed(2)}
                          </span>

                          {/* Actions Dropdown */}
                          <div className="relative action-menu-container" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                            <button
                              onClick={() =>
                                setActiveActionMenuId(
                                  activeActionMenuId ===
                                    (test.id || (test as any)._id)
                                    ? null
                                    : test.id || (test as any)._id,
                                )
                              }
                              className={`flex items-center gap-1 px-3 h-8 border rounded text-[12.5px] font-semibold transition-all whitespace-nowrap ${String(activeActionMenuId) === String(test.id || (test as any)._id) ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-300 text-gray-700 hover:border-gray-500"}`}
                            >
                              Actions
                              <span className="material-symbols-outlined text-[14px]">expand_more</span>
                            </button>

                            {String(activeActionMenuId) ===
                              String(test.id || (test as any)._id) && (
                                <div className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[999] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                  {[
                                    {
                                      id: "add_questions",
                                      label: "Add Questions",
                                      icon: "add_circle",
                                      onClick: (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        const testId = test.id || (test as any)._id;
                                        setViewingQuestionEditor(test);
                                        navigate(`/admin/tests/${testId}/review`);
                                        setActiveActionMenuId(null);
                                      },
                                    },
                                    {
                                      id: "edit",
                                      label: "Edit",
                                      icon: "edit",
                                      onClick: (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        const testId = test.id || (test as any)._id;
                                        setEditingTest(test);
                                        setShowAddSingleTestDrawer(true);
                                        navigate(`/admin/tests/${testId}/edit`);
                                        setActiveActionMenuId(null);
                                      },
                                    },
                                    {
                                      id: "results",
                                      label: "View Results",
                                      icon: "analytics",
                                      onClick: (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        const testId = test.id || (test as any)._id;
                                        handleViewResults(test);
                                        navigate(`/admin/tests/${testId}/results`);
                                        setActiveActionMenuId(null);
                                      },
                                    },
                                    {
                                      id: "duplicate",
                                      label: "Duplicate",
                                      icon: "content_copy",
                                      onClick: (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        handleDuplicateTest(test);
                                        setActiveActionMenuId(null);
                                      },
                                    },
                                    {
                                      id: "publish",
                                      label: "Publish Changes",
                                      icon: "sync",
                                      subItems: [
                                        {
                                          id: "publish_yes",
                                          label: "Publish",
                                          icon: "public",
                                          onClick: (e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            handlePublish(test.id || (test as any)._id);
                                            setActiveActionMenuId(null);
                                          },
                                        },
                                        {
                                          id: "publish_no",
                                          label: "Unpublish",
                                          icon: "public_off",
                                          onClick: (e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            handlePublish(test.id || (test as any)._id);
                                            setActiveActionMenuId(null);
                                          },
                                        },
                                      ]
                                    },
                                    {
                                      id: "review",
                                      label: "Review Questions",
                                      icon: "checklist",
                                      onClick: (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        const testId = test.id || (test as any)._id;
                                        setViewingQuestionEditor(test);
                                        navigate(`/admin/tests/${testId}/review`);
                                        setActiveActionMenuId(null);
                                      },
                                    },
                                    {
                                      id: "pdf",
                                      label: "Export to PDF",
                                      icon: "picture_as_pdf",
                                      subItems: [
                                        {
                                          id: "pdf_sol",
                                          label: "Export with Solution",
                                          icon: "task",
                                          onClick: (e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            handleExportPDF(test, true);
                                            setActiveActionMenuId(null);
                                          },
                                        },
                                        {
                                          id: "pdf_nosol",
                                          label: "Export without Solution",
                                          icon: "assignment",
                                          onClick: (e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            handleExportPDF(test, false);
                                            setActiveActionMenuId(null);
                                          },
                                        },
                                      ]
                                    },
                                    {
                                      id: "reevaluate",
                                      label: "Re-evaluate Attempts",
                                      icon: "rule",
                                      onClick: (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setViewingReevaluateTest(test);
                                        setActiveActionMenuId(null);
                                      },
                                    },
                                    {
                                      id: "delete",
                                      label: "Delete",
                                      icon: "delete",
                                      color: "text-red-500",
                                      onClick: (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to delete this test?")) {
                                          handleDelete(test.id || (test as any)._id);
                                        }
                                        setActiveActionMenuId(null);
                                      },
                                    },
                                  ].map((item) => (
                                    <React.Fragment key={item.id}>
                                      <button
                                        onClick={(e) => {
                                          if (item.subItems) {
                                            e.stopPropagation();
                                            setExpandedDropdownItem(expandedDropdownItem === item.id ? null : item.id);
                                          } else if (item.onClick) {
                                            item.onClick(e);
                                          }
                                        }}
                                        className="w-full px-5 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors group text-left"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className={`material-symbols-outlined text-[20px] ${item.color || "text-gray-400 group-hover:text-black"}`}>
                                            {item.icon}
                                          </span>
                                          <span className={`text-[13px] font-bold ${item.color || "text-gray-600 group-hover:text-black"}`}>
                                            {item.label}
                                          </span>
                                        </div>
                                        {item.subItems && (
                                          <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-black">
                                            {expandedDropdownItem === item.id ? 'expand_less' : 'expand_more'}
                                          </span>
                                        )}
                                      </button>
                                      {item.subItems && expandedDropdownItem === item.id && (
                                        <div className="bg-gray-50 border-y border-gray-100 py-1">
                                          {item.subItems.map(subItem => (
                                            <button
                                              key={subItem.id}
                                              onClick={(e) => {
                                                if (subItem.onClick) subItem.onClick(e);
                                              }}
                                              className="w-full px-5 py-2 pl-10 flex items-center gap-3 hover:bg-gray-100 transition-colors group text-left"
                                            >
                                              <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-black">
                                                {subItem.icon}
                                              </span>
                                              <span className="text-[12.5px] font-bold text-gray-600 group-hover:text-black">
                                                {subItem.label}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}              </div>
            </div>
          )}

          {viewingTestSeriesTab === "Test PDFs" && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-[#1a202c]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA]">
                  <tr>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      File Name
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      Size
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center text-[#1a202c]">
                      Added On
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-right text-[#1a202c]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockPDFs.length > 0 ? (
                    mockPDFs.map((pdf, idx) => (
                      <tr
                        key={pdf.id || idx}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                              <span className="material-symbols-outlined">
                                picture_as_pdf
                              </span>
                            </div>
                            <span className="text-[14px] font-bold text-gray-700">
                              {pdf.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-[14px] font-medium text-gray-500">
                          {pdf.size}
                        </td>
                        <td className="px-8 py-5 text-center text-[14px] font-medium text-gray-500">
                          {pdf.addedOn}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="relative inline-block action-menu-container">
                            <button
                              onClick={() => setActiveActionMenuId(activeActionMenuId === (pdf.id || idx) + 30000 ? null : (pdf.id || idx) + 30000)}
                              className={`flex items-center justify-between gap-2 px-4 h-9 border rounded-lg text-[13px] font-bold transition-all shadow-sm w-[110px] ${activeActionMenuId === (pdf.id || idx) + 30000 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                            >
                              Actions
                              <span className={`material-symbols-outlined text-[18px] transition-all duration-200 ${activeActionMenuId === (pdf.id || idx) + 30000 ? "rotate-180 text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                                expand_more
                              </span>
                            </button>
                            {activeActionMenuId === (pdf.id || idx) + 30000 && (
                              <div className={`absolute right-0 top-full mt-1 w-[160px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[101] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right`}>
                                {[
                                  { id: "download", label: "Download", icon: "download", onClick: () => { setActiveActionMenuId(null); showToast("Downloading..."); } },
                                  { id: "delete", label: "Delete", icon: "delete", color: "text-red-500", onClick: () => { setActiveActionMenuId(null); showToast("Delete functionality pending..."); } },
                                ].map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => item.onClick()}
                                    className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                                  >
                                    <span className={`material-symbols-outlined text-[20px] ${item.color || "text-gray-400 group-hover:text-black"}`}>
                                      {item.icon}
                                    </span>
                                    <span className={`text-[13px] font-bold ${item.color || "text-gray-600 group-hover:text-black"}`}>
                                      {item.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-20 text-center text-gray-400 font-medium"
                      >
                        No PDFs added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {viewingTestSeriesTab === "Subjective Tests" && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-[#1a202c]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA]">
                  <tr>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      S. No.
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      Title
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      Marks
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      Time
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center text-[#1a202c]">
                      Status
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-right text-[#1a202c]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockSubjectives.length > 0 ? (
                    mockSubjectives.map((test, i) => (
                      <tr
                        key={test.id || i}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-8 py-5 text-[14px] font-medium text-gray-500">
                          {i + 1}
                        </td>
                        <td className="px-8 py-5 text-[14px] font-bold text-gray-700">
                          {test.name}
                        </td>
                        <td className="px-8 py-5 text-[14px] font-medium text-gray-500">
                          {test.marks}
                        </td>
                        <td className="px-8 py-5 text-[14px] font-medium text-gray-500">
                          {test.time} Min
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-[11px] font-black border border-green-100 uppercase tracking-wider whitespace-nowrap">
                            {test.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="relative inline-block action-menu-container">
                            <button
                              onClick={() => setActiveActionMenuId(activeActionMenuId === (test.id || i) + 40000 ? null : (test.id || i) + 40000)}
                              className={`flex items-center justify-between gap-2 px-4 h-9 border rounded-lg text-[13px] font-bold transition-all shadow-sm w-[110px] ${activeActionMenuId === (test.id || i) + 40000 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                            >
                              Actions
                              <span className={`material-symbols-outlined text-[18px] transition-all duration-200 ${activeActionMenuId === (test.id || i) + 40000 ? "rotate-180 text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                                expand_more
                              </span>
                            </button>
                            {activeActionMenuId === (test.id || i) + 40000 && (
                              <div className={`absolute right-0 top-full mt-1 w-[160px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[101] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right`}>
                                {[
                                  { id: "edit", label: "Edit Test", icon: "edit", onClick: () => { setActiveActionMenuId(null); showToast("Edit subjective..."); } },
                                  { id: "delete", label: "Delete", icon: "delete", color: "text-red-500", onClick: () => { setActiveActionMenuId(null); showToast("Delete subjective..."); } },
                                ].map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => item.onClick()}
                                    className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                                  >
                                    <span className={`material-symbols-outlined text-[20px] ${item.color || "text-gray-400 group-hover:text-black"}`}>
                                      {item.icon}
                                    </span>
                                    <span className={`text-[13px] font-bold ${item.color || "text-gray-600 group-hover:text-black"}`}>
                                      {item.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-20 text-center text-gray-400 font-medium"
                      >
                        No subjective tests added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {viewingTestSeriesTab === "Users" && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-[#1a202c]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA]">
                  <tr>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      User Details
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
                      Transaction ID
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center text-[#1a202c]">
                      Date & Time
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center text-[#1a202c]">
                      Expiry Date
                    </th>
                    <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-right text-[#1a202c]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockUsers.length > 0 ? (
                    mockUsers.map((user, idx) => (
                      <tr
                        key={user.id || idx}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-gray-700">
                              {user.name}
                            </span>
                            <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                              {user.phone}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[14px] font-mono font-medium text-gray-600">
                            {user.transactionId}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center text-[13px] font-medium text-gray-500 whitespace-nowrap">
                          {user.dateTime}
                        </td>
                        <td className="px-8 py-5 text-center text-[13px] font-medium text-gray-500 whitespace-nowrap">
                          {user.expiryDate}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="relative inline-block action-menu-container">
                            <button
                              onClick={() => setActiveActionMenuId(activeActionMenuId === (user.id || idx) + 50000 ? null : (user.id || idx) + 50000)}
                              className={`flex items-center justify-between gap-2 px-4 h-9 border rounded-lg text-[13px] font-bold transition-all shadow-sm w-[110px] ${activeActionMenuId === (user.id || idx) + 50000 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                            >
                              Actions
                              <span className={`material-symbols-outlined text-[18px] transition-all duration-200 ${activeActionMenuId === (user.id || idx) + 50000 ? "rotate-180 text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                                expand_more
                              </span>
                            </button>
                            {activeActionMenuId === (user.id || idx) + 50000 && (
                              <div className={`absolute right-0 top-full mt-1 w-[160px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[101] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right`}>
                                {[
                                  { id: "view", label: "View Details", icon: "visibility", onClick: () => { setActiveActionMenuId(null); } },
                                  { id: "remove", label: "Remove", icon: "person_remove", color: "text-red-500", onClick: () => { setActiveActionMenuId(null); } },
                                ].map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => item.onClick()}
                                    className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                                  >
                                    <span className={`material-symbols-outlined text-[20px] ${item.color || "text-gray-400 group-hover:text-black"}`}>
                                      {item.icon}
                                    </span>
                                    <span className={`text-[13px] font-bold ${item.color || "text-gray-600 group-hover:text-black"}`}>
                                      {item.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-20 text-center text-gray-400 font-medium"
                      >
                        No users enrolled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="px-8 py-4 bg-[#FAFAFA] border-t border-gray-100 flex items-center justify-between">
                <span className="text-[12px] font-bold text-gray-400 italic">
                  Showing {mockUsers.length} users
                </span>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-30">
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_left
                    </span>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-black text-white text-[13px] font-bold shadow-sm">
                    1
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-30">
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };






  return (
    <div className="w-full bg-[#fafafa]">
      {/* Top Tabs Navigation as a Card - Hidden when viewing Test Series Details */}
      {!viewingTestSeries && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 h-[52px] flex items-center px-2">
            <div className="flex items-center h-full">
              {tabs.map((tab, idx) => (
                <div key={tab} className="flex items-center h-full">
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`h-full px-6 text-[13px] transition-all relative flex items-center whitespace-nowrap ${activeTab === tab ? "text-[#1a202c] font-bold" : "text-[#718096] font-medium hover:text-gray-800"}`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#1a202c] rounded-full"></div>
                    )}
                  </button>
                  {idx < tabs.length - 1 && (
                    <div className="w-[1px] h-4 bg-gray-100 opacity-60"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Results" ? (
        <TestsResultsTab
          filteredResults={results.filter((res) => {
            const matchSeries = !resultFilters.series || res.batchSeries.includes(resultFilters.series);
            const matchTest = !resultFilters.test || res.testName.includes(resultFilters.test);
            return matchSeries && matchTest;
          })}
          courses={courses}
          resultFilters={resultFilters}
          setResultFilters={setResultFilters}
          loading={loading}
          totalResults={results.filter((res) => {
            const matchSeries = !resultFilters.series || res.batchSeries.includes(resultFilters.series);
            const matchTest = !resultFilters.test || res.testName.includes(resultFilters.test);
            return matchSeries && matchTest;
          }).length}
          resultsPageSize={resultsPageSize}
          setResultsPageSize={setResultsPageSize}
          resultsCurrentPage={resultsCurrentPage}
          setResultsCurrentPage={setResultsCurrentPage}
          totalResultsPages={Math.ceil(results.filter((res) => {
            const matchSeries = !resultFilters.series || res.batchSeries.includes(resultFilters.series);
            const matchTest = !resultFilters.test || res.testName.includes(resultFilters.test);
            return matchSeries && matchTest;
          }).length / resultsPageSize)}
          resultsShowingStart={results.filter((res) => {
            const matchSeries = !resultFilters.series || res.batchSeries.includes(resultFilters.series);
            const matchTest = !resultFilters.test || res.testName.includes(resultFilters.test);
            return matchSeries && matchTest;
          }).length === 0 ? 0 : (resultsCurrentPage - 1) * resultsPageSize + 1}
          resultsEndIndex={Math.min(resultsCurrentPage * resultsPageSize, results.filter((res) => {
            const matchSeries = !resultFilters.series || res.batchSeries.includes(resultFilters.series);
            const matchTest = !resultFilters.test || res.testName.includes(resultFilters.test);
            return matchSeries && matchTest;
          }).length)}
          setViewingStudentAnalysis={setViewingStudentAnalysis}
        />
      ) : activeTab === "Bulk Uploader" ? (
        <TestsBulkUploaderTab
          bulkUploadData={bulkUploadData}
          setBulkUploadData={setBulkUploadData}
          courses={courses}
          tests={tests}
          isParsing={isParsing}
          previewQuestions={
            bulkUploadData.parsedQuestions &&
            bulkUploadData.parsedQuestions.length > 0
              ? bulkUploadData.parsedQuestions
              : []
          }
          onFileUpload={handleBulkUploadFileUpload}
          onProceedToUpload={handleBulkUploadProceed}
          onDownloadDOCX={() =>
            generateDOCX(
              bulkUploadData.parsedQuestions || [],
              bulkUploadData.format,
              `Paper_${bulkUploadData.file?.name}.docx`,
            )
          }
          setViewingPaperQuestions={setViewingPaperQuestions}
          renderQuestionText={renderQuestionText}
          renderDiagram={renderDiagram}
        />
      ) : activeTab === "Reported Questions" ? (
        <ReportedQuestionsTab
          paginatedReported={reportedQuestions.filter((rq) => {
            const query = reportedSearchQuery.toLowerCase();
            const matchSearch =
              (rq.studentName || "").toLowerCase().includes(query) ||
              (rq.testTitle || "").toLowerCase().includes(query) ||
              (rq.questionEn || "").toLowerCase().includes(query) ||
              (rq.questionHi || "").toLowerCase().includes(query);
            const matchIssue = !reportedFilters.issue || rq.issue === reportedFilters.issue;
            return matchSearch && matchIssue;
          }).slice((reportedCurrentPage - 1) * reportedPageSize, reportedCurrentPage * reportedPageSize)}
          reportedSearchQuery={reportedSearchQuery}
          setReportedSearchQuery={setReportedSearchQuery}
          reportedFilters={reportedFilters}
          setReportedFilters={setReportedFilters}
          isReportedFilterOpen={isReportedFilterOpen}
          setIsReportedFilterOpen={setIsReportedFilterOpen}
          reportedQuestions={reportedQuestions}
          reportedPageSize={reportedPageSize}
          setReportedPageSize={setReportedPageSize}
          reportedShowingStart={reportedQuestions.filter((rq) => {
            const query = reportedSearchQuery.toLowerCase();
            const matchSearch =
              (rq.studentName || "").toLowerCase().includes(query) ||
              (rq.testTitle || "").toLowerCase().includes(query) ||
              (rq.questionEn || "").toLowerCase().includes(query) ||
              (rq.questionHi || "").toLowerCase().includes(query);
            const matchIssue = !reportedFilters.issue || rq.issue === reportedFilters.issue;
            return matchSearch && matchIssue;
          }).length === 0 ? 0 : (reportedCurrentPage - 1) * reportedPageSize + 1}
          reportedEndIndex={Math.min(reportedCurrentPage * reportedPageSize, reportedQuestions.filter((rq) => {
            const query = reportedSearchQuery.toLowerCase();
            const matchSearch =
              (rq.studentName || "").toLowerCase().includes(query) ||
              (rq.testTitle || "").toLowerCase().includes(query) ||
              (rq.questionEn || "").toLowerCase().includes(query) ||
              (rq.questionHi || "").toLowerCase().includes(query);
            const matchIssue = !reportedFilters.issue || rq.issue === reportedFilters.issue;
            return matchSearch && matchIssue;
          }).length)}
          totalReported={reportedQuestions.filter((rq) => {
            const query = reportedSearchQuery.toLowerCase();
            const matchSearch =
              (rq.studentName || "").toLowerCase().includes(query) ||
              (rq.testTitle || "").toLowerCase().includes(query) ||
              (rq.questionEn || "").toLowerCase().includes(query) ||
              (rq.questionHi || "").toLowerCase().includes(query);
            const matchIssue = !reportedFilters.issue || rq.issue === reportedFilters.issue;
            return matchSearch && matchIssue;
          }).length}
          reportedCurrentPage={reportedCurrentPage}
          setReportedCurrentPage={setReportedCurrentPage}
          totalReportedPages={Math.ceil(reportedQuestions.filter((rq) => {
            const query = reportedSearchQuery.toLowerCase();
            const matchSearch =
              (rq.studentName || "").toLowerCase().includes(query) ||
              (rq.testTitle || "").toLowerCase().includes(query) ||
              (rq.questionEn || "").toLowerCase().includes(query) ||
              (rq.questionHi || "").toLowerCase().includes(query);
            const matchIssue = !reportedFilters.issue || rq.issue === reportedFilters.issue;
            return matchSearch && matchIssue;
          }).length / reportedPageSize)}
          updateReportStatus={updateReportStatus}
          loading={loading}
        />
      ) : viewingTestSeries ? (
        renderTestSeriesDetail()
      ) : (
        <TestsListTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          handleOpenModal={handleOpenModal}
          paginatedTests={paginatedTests}
          currentPage={currentPage}
          totalPages={totalPages}
          filteredTests={filteredTests}
          loading={loading}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          handleSetViewingTestSeries={handleSetViewingTestSeries}
          toggleStatus={toggleStatus}
          handleDelete={handleDelete}
          handleDuplicateTest={handleDuplicateTest}
          handlePublish={handlePublish}
        />
      )}

      <AddTestDrawer
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editingTest={editingTest}
        courses={courses.map((c) => ({ ...c, id: c.id || c._id }))}
        defaultCourseId={
          viewingTestSeries?.id || (viewingTestSeries as any)?._id
        }
      />

      <AddSingleTestDrawer
        isOpen={showAddSingleTestDrawer}
        onClose={() => setShowAddSingleTestDrawer(false)}
        onSubmit={async (testData) => {
          try {
            // Auto-fill courseId from context if adding within a series
            const effectiveCourseId =
              Array.isArray(testData.testSeries) &&
                testData.testSeries.length > 0
                ? testData.testSeries[0]
                : viewingTestSeries?.id || (viewingTestSeries as any)._id;

            // Map drawer fields to the schema used by the list and server
            const payload = {
              ...testData,
              name: testData.title || testData.name,
              courseId: effectiveCourseId,
              isSeries: false, // Explicitly mark as a test, not a series
              status: "active", // Must be 'active' to show in the course tests list (server-side filter)
              questions: 0, // Initial actual count
              noOfQuestions: parseInt(testData.noOfQuestions) || 0, // This is the limit/expected count
              time:
                parseInt(testData.totalDuration) ||
                parseInt(testData.duration) ||
                0,
              marks: parseInt(testData.totalMarks) || 0,
              duration:
                parseInt(testData.totalDuration) ||
                parseInt(testData.duration) ||
                0,
              openDate: testData.startDate || "",
              closeDate: testData.endDate || "",
              sortBy: testData.sortingOrder || "0.00",
            };

            let result;
            if (editingTest) {
              result = await testsAPI.update(editingTest.id, payload);
              showToast("Test updated successfully", "success");
            } else {
              result = await testsAPI.create(payload);
              showToast("Test added successfully", "success");
            }

            // Refresh the specific list inside the series view
            if (viewingTestSeries) {
              const seriesId =
                viewingTestSeries.id || (viewingTestSeries as any)._id;
              const res = await fetch(`/api/courses/${seriesId}/tests`);
              if (res.ok) {
                const data = await res.json();
                setDetailTests(Array.isArray(data) ? data : []);
              }
            }

            loadData(); // Refresh global list
            setShowAddSingleTestDrawer(false);
            setEditingTest(null);
          } catch (err: any) {
            showToast(err.message || "Failed to save test", "error");
          }
        }}
        testSeriesOptions={tests
          .filter((t: any) => t.isSeries === true)
          .map((t: any) => ({
            value: t.id || (t as any)._id,
            label: t.name || t.title || "",
          }))}
        defaultTestSeries={
          viewingTestSeries
            ? [viewingTestSeries.id || (viewingTestSeries as any)._id]
            : []
        }
      />

      <AddTestPDFDrawer
        isOpen={showAddTestPDFDrawer}
        onClose={() => setShowAddTestPDFDrawer(false)}
        onSubmit={async (data) => {
          try {
            // Simulate API call for PDF test
            showToast("Test PDF uploaded and processed", "success");
            await testsAPI.create({
              ...data,
              courseId: viewingTestSeries.id,
              type: "PDF",
            });
            setShowAddTestPDFDrawer(false);
            showToast("Test PDF added successfully", "success");
          } catch (err: any) {
            showToast(err.message, "error");
          }
        }}
        testSeriesOptions={courses.map((c) => ({
          value: c.id,
          label: c.name || c.title || "",
        }))}
      />

      <SubjectiveTestDrawer
        isOpen={showSubjectiveTestDrawer}
        onClose={() => setShowSubjectiveTestDrawer(false)}
        onAddTests={(data) => {
          console.log("Subjective Test Added:", data);
          setShowSubjectiveTestDrawer(false);
          showToast("Subjective Test added successfully", "success");
        }}
        testSeriesOptions={courses.map((c) => ({
          value: c.id,
          label: c.name || c.title || "",
        }))}
      />

      <AddTestPDFBulkDrawer
        isOpen={showAddTestPDFBulkDrawer}
        onClose={() => setShowAddTestPDFBulkDrawer(false)}
        onSubmit={(files) => {
          console.log("Bulk PDFs Added:", files);
          setShowAddTestPDFBulkDrawer(false);
          showToast(`${files.length} PDFs added successfully`, "success");
        }}
      />

      {viewingQuestionDetail && (
        <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[1rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFFFF]">
              <h3 className="text-[14px] font-bold text-gray-800 tracking-wide">
                {viewingQuestionDetail.badge || "Question Detail"}
              </h3>
              <button
                onClick={() => setViewingQuestionDetail(null)}
                className="text-gray-400 hover:text-black transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">
                  close
                </span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
              {/* Question */}
              <div className="flex gap-4">
                <span className="text-[13px] font-bold text-gray-800 min-w-[70px]">
                  Question <span className="float-right">:</span>
                </span>
                <div className="space-y-4">
                  <p className="text-[13px] font-medium text-gray-700 leading-relaxed max-w-[900px]">
                    {renderQuestionText(viewingQuestionDetail.textEn)}
                  </p>
                  {viewingQuestionDetail.textHi && (
                    <p className="text-[15px] font-medium text-gray-800 leading-relaxed font-hindi max-w-[900px]">
                      {renderQuestionText(viewingQuestionDetail.textHi)}
                    </p>
                  )}
                  {viewingQuestionDetail.image && (
                    <div className="mt-2 text-center">
                      <img
                        src={viewingQuestionDetail.image}
                        alt="Question figure"
                        className="max-w-[150px] border border-gray-200 p-2 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="h-[1px] w-full bg-gray-100"></div>

              {/* Options */}
              <div className="flex gap-4">
                <span className="text-[13px] font-bold text-gray-800 min-w-[70px]">
                  Options
                </span>
              </div>

              {/* Dynamic Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8 ml-[86px] max-w-[800px]">
                {viewingQuestionDetail.options?.map(
                  (opt: string, i: number) => {
                    const isCorrect =
                      viewingQuestionDetail.correctAnswer ===
                      String.fromCharCode(65 + i);
                    return (
                      <div key={i}>
                        <div className="mb-2 text-[13px] font-bold text-gray-800">
                          Option {i + 1} :
                        </div>
                        <div
                          className={`${isCorrect ? "bg-[#D5E8D4]/40 border-[2px] border-[#82B366] text-[#2E7D32]" : "text-gray-600"} px-3 py-2 rounded-xl text-[12px] font-bold flex flex-col items-center justify-center min-h-[50px] shadow-sm`}
                        >
                          {opt}
                          {isCorrect && (
                            <span className="material-symbols-outlined text-[16px] mt-1 font-black">
                              check
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="h-[1px] w-full bg-gray-100"></div>

              {/* Solution */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <span className="text-[13px] font-bold text-gray-800 min-w-[120px]">
                    Solution Heading <span className="float-right">:</span>
                  </span>
                  <span className="text-[13px] text-gray-700">
                    Full Solution
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[13px] font-bold text-gray-800 min-w-[120px]">
                    Text <span className="float-right">:</span>
                  </span>
                  <span className="text-[13px] text-gray-700">
                    {viewingQuestionDetail.solution || ""}
                  </span>
                </div>
              </div>

              <div className="h-[1px] w-full bg-gray-100"></div>

              {/* Bottom Properties */}
              <div className="flex items-center justify-center gap-6 border border-gray-200 rounded-2xl px-8 py-4 bg-white shadow-sm w-fit mx-auto mt-2 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-gray-500">
                    Section :
                  </span>
                  <span className="text-[13px] font-medium text-gray-800">
                    {viewingQuestionDetail.section || "N/A"}
                  </span>
                </div>
                <div className="w-[1px] h-6 bg-gray-200"></div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-gray-500">
                    Positive Marks :
                  </span>
                  <span className="text-[13px] font-medium text-gray-800">
                    {viewingQuestionDetail.positiveMarks || "0.00"}
                  </span>
                </div>
                <div className="w-[1px] h-6 bg-gray-200"></div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-gray-500">
                    Negative Marks :
                  </span>
                  <span className="text-[13px] font-medium text-gray-800">
                    {viewingQuestionDetail.negativeMarks || "0.00"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingStudentAnalysis && (
        <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[1.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Analysis Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500 text-[28px]">
                    account_circle
                  </span>
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-gray-800 tracking-tight">
                    {viewingStudentAnalysis.studentName}
                  </h3>
                  <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                    {viewingStudentAnalysis.studentId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudentAnalysis(null)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all"
              >
                <span className="material-symbols-outlined text-[24px] font-bold">
                  close
                </span>
              </button>
            </div>

            {/* Analysis Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#FAFBFF]/30">
              {/* Test Info Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Test Taken
                  </p>
                  <p className="text-[15px] font-bold text-gray-800 leading-snug">
                    {viewingStudentAnalysis.testName || "HSSC TEST-159"}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Completion Time
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">
                      timer
                    </span>
                    <p className="text-[18px] font-black text-gray-800">
                      {viewingStudentAnalysis.timeTaken}s
                    </p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Submission Date
                  </p>
                  <p className="text-[15px] font-bold text-gray-700">
                    {new Date(
                      viewingStudentAnalysis.submittedAt,
                    ).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Progress & Scores */}
              <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                  <h4 className="text-[16px] font-black text-gray-800">
                    Test Performance Analysis
                  </h4>
                  <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[13px] font-black border border-blue-100">
                    Rank : N/A
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {/* Score */}
                  <div className="space-y-4">
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full border-[6px] border-[#E9F7EF] flex flex-col items-center justify-center bg-white shadow-inner">
                        <span className="text-[20px] font-black text-[#155724] leading-tight">
                          {viewingStudentAnalysis.obtainedMarks}
                        </span>
                        <div className="h-[1px] w-8 bg-gray-200 my-1"></div>
                        <span className="text-[12px] font-bold text-gray-400 uppercase">
                          {viewingStudentAnalysis.totalMarks}
                        </span>
                      </div>
                      <p className="text-[13px] font-black text-gray-700 mt-4">
                        Total Score
                      </p>
                    </div>
                  </div>

                  {/* Positive Marks */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Positive Marks
                    </p>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2E7D32] rounded-full"
                        style={{
                          width: `${(viewingStudentAnalysis.obtainedMarks / viewingStudentAnalysis.totalMarks) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-[18px] font-black text-[#2E7D32]">
                      +{viewingStudentAnalysis.obtainedMarks}.00
                    </p>
                  </div>

                  {/* Negative Marks */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Negative Marks
                    </p>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D32F2F] rounded-full"
                        style={{ width: "0%" }}
                      ></div>
                    </div>
                    <p className="text-[18px] font-black text-[#D32F2F]">
                      -0.00
                    </p>
                  </div>

                  {/* Accuracy */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Accuracy
                    </p>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(viewingStudentAnalysis.obtainedMarks / viewingStudentAnalysis.totalMarks) * 100 || 0}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-[18px] font-black text-blue-600">
                      {(
                        (viewingStudentAnalysis.obtainedMarks /
                          viewingStudentAnalysis.totalMarks) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Detail */}
              <div className="bg-[#4361EE]/5 rounded-[1.5rem] p-6 border border-[#4361EE]/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-[#4361EE] text-[20px] font-bold">
                    trending_up
                  </span>
                  <p className="text-[14px] font-black text-[#4361EE] tracking-tight italic uppercase">
                    User Progress Tracker
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                    <p className="text-[20px] font-black text-gray-800 italic">
                      {Math.floor(viewingStudentAnalysis.obtainedMarks)}
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                      Attempted
                    </p>
                  </div>
                  <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                    <p className="text-[20px] font-black text-gray-800 italic">
                      {viewingStudentAnalysis.totalMarks -
                        Math.floor(viewingStudentAnalysis.obtainedMarks)}
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                      Unattempted
                    </p>
                  </div>
                  <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                    <p className="text-[20px] font-black text-gray-800 italic">
                      {viewingStudentAnalysis.obtainedMarks}
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                      Correct
                    </p>
                  </div>
                  <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                    <p className="text-[20px] font-black text-gray-800 italic">
                      0
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                      Incorrect
                    </p>
                  </div>
                </div>
              </div>

              {/* User Test History Section */}
              <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                  <span className="material-symbols-outlined text-gray-400 text-[22px]">
                    history
                  </span>
                  <h4 className="text-[16px] font-black text-gray-800 tracking-tight">
                    User Test History
                  </h4>
                </div>

                <div className="overflow-hidden border border-gray-50 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#FAFBFF]">
                      <tr>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                          Test Title
                        </th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                          Score
                        </th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                          Time
                        </th>
                        <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {results
                        .filter(
                          (r) =>
                            r.studentId === viewingStudentAnalysis.studentId,
                        )
                        .map((test, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50/30 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="text-[14px] font-bold text-gray-700">
                                {test.testName || "HSSC TEST-159"}
                              </p>
                              <p className="text-[11px] text-gray-400 font-medium">
                                Attempted on{" "}
                                {new Date(
                                  test.submittedAt,
                                ).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[12px] font-black border border-green-100">
                                {test.obtainedMarks} / {test.totalMarks}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-[13px] font-bold text-gray-500">
                              {test.timeTaken}s
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-[12px] font-black text-[#2E7D32] bg-[#E9F7EF] px-1 py-0.5 rounded-full uppercase tracking-tighter">
                                Completed
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Bulk Delete Modal/Drawer */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/40 z-[100000] flex justify-end backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="w-full max-w-[650px] bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 relative bg-white">
              <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">
                Delete Selected Question
              </h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all z-10"
              >
                <span className="material-symbols-outlined font-bold">
                  close
                </span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-white">
              {/* Select All */}
              <div className="flex items-center gap-4 px-4 py-2">
                <input
                  type="checkbox"
                  id="selectAll"
                  className="w-[18px] h-[18px] rounded border-gray-300 accent-blue-600 cursor-pointer"
                  checked={
                    selectedBulkDeleteQuestions.length ===
                    editorQuestions.length && editorQuestions.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBulkDeleteQuestions(
                        editorQuestions.map((_, i) => i),
                      );
                    } else {
                      setSelectedBulkDeleteQuestions([]);
                    }
                  }}
                />
                <label
                  htmlFor="selectAll"
                  className="text-[14px] font-bold text-gray-600 cursor-pointer"
                >
                  Select All
                </label>
              </div>

              {/* Question List */}
              <div className="space-y-4">
                {editorQuestions.map((q, idx) => {
                  const isSelected = selectedBulkDeleteQuestions.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedBulkDeleteQuestions(
                            selectedBulkDeleteQuestions.filter(
                              (i) => i !== idx,
                            ),
                          );
                        } else {
                          setSelectedBulkDeleteQuestions([
                            ...selectedBulkDeleteQuestions,
                            idx,
                          ]);
                        }
                      }}
                      className={`flex items-center gap-5 p-5 border rounded-2xl cursor-pointer transition-all ${isSelected ? "border-blue-200 bg-blue-50/10" : "border-gray-100 bg-white hover:border-gray-200 shadow-sm"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-[18px] h-[18px] rounded border-gray-300 accent-blue-600 pointer-events-none"
                      />
                      <div className="flex-1 min-w-0 px-2">
                        <p className="text-[14px] font-bold text-gray-700 truncate">
                          {idx + 1}. {q.questionEn || "No question text"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Footer Matching Screenshot */}
            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between bg-white shadow-inner">
              <span className="text-[13px] font-bold text-gray-400 italic px-2">
                {selectedBulkDeleteQuestions.length} Selected
              </span>
              <button
                onClick={async () => {
                  try {
                    const idsToDelete = selectedBulkDeleteQuestions
                      .map((idx) => {
                        const q = editorQuestions[idx];
                        return q.id || q._id;
                      })
                      .filter((id) => !!id);

                    if (idsToDelete.length === 0) return;

                    const deletedCount = idsToDelete.length;
                    await questionsAPI.bulkDelete(
                      idsToDelete.map((id) => String(id)),
                    );
                    invalidateCache("tests");

                    // Refresh questions list for the editor
                    const testId =
                      viewingQuestionEditor?.id || viewingQuestionEditor?._id;
                    if (testId) {
                      const qs = await testsAPI.getQuestions(testId);
                      setEditorQuestions(qs);
                    }

                    showToast(
                      `${deletedCount} questions deleted successfully`,
                      "success",
                    );
                    setShowBulkDeleteModal(false);
                    setSelectedBulkDeleteQuestions([]);
                    loadData();
                  } catch (err: any) {
                    showToast(
                      err.message || "Failed to delete questions",
                      "error",
                    );
                  }
                }}
                disabled={selectedBulkDeleteQuestions.length === 0}
                className="px-10 py-3 bg-black text-white text-[13px] font-black rounded-xl hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort Question Order Modal */}
      <QuestionSortModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        questions={editorQuestions}
        setQuestions={setEditorQuestions}
        onSave={async () => {
          try {
            const updates = editorQuestions.map((q, idx) => ({
              id: q.id,
              _id: q._id,
              orderIndex: idx + 1,
            }));

            await questionsAPI.updateAll(updates);
            showToast("Question order saved successfully", "success");
            setShowSortModal(false);
            loadData();
          } catch (err: any) {
            showToast(
              err.message || "Failed to save question order",
              "error",
            );
          }
        }}
      />
      {/* Add Question Drawer */}
      <AddQuestionEditorDrawer
        isOpen={!!viewingAddQuestionForm}
        onClose={() => setViewingAddQuestionForm(null)}
        onSubmit={handleSaveQuestion}
        viewingQuestion={viewingAddQuestionForm}
        setViewingQuestion={setViewingAddQuestionForm}
        questions={editorQuestions}
        sections={[
          { id: "default", name: viewingQuestionEditor?.name || "Default" },
        ]}
        testId={viewingQuestionEditor?.id || viewingQuestionEditor?._id || ""}
        showToast={showToast}
      />



      {/* Re-evaluate Test Modal */}
      {viewingReevaluateTest && (
        <div className="fixed inset-0 bg-black/40 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFFFF]">
              <h3 className="text-[14px] font-bold text-gray-800 tracking-wide">Re-evaluate Attempts</h3>
              <button
                onClick={() => setViewingReevaluateTest(null)}
                className="text-gray-400 hover:text-black transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                You are about to re-evaluate all attempts for <strong>{viewingReevaluateTest.name || viewingReevaluateTest.title || 'the selected test'}</strong>.
                This action will recalculate marks based on the latest answer keys.
              </p>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500">info</span>
                <p className="text-[12px] font-semibold text-blue-800">12 attempts will be re-evaluated.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setViewingReevaluateTest(null)}
                className="px-5 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleReevaluate(viewingReevaluateTest);
                  setViewingReevaluateTest(null);
                }}
                className="px-6 py-2 bg-black text-white rounded-xl text-[13px] font-bold shadow-md hover:bg-gray-800 transition-colors active:scale-95"
              >
                Confirm Re-evaluation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to PDF Modal */}
      {viewingExportPDFTest && (
        <div className="fixed inset-0 bg-black/40 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFFFF]">
              <h3 className="text-[14px] font-bold text-gray-800 tracking-wide">
                {viewingExportPDFTest.exportMode === 'with_solution' ? 'Export PDF with Solutions' : 'Export PDF without Solutions'}
              </h3>
              <button
                onClick={() => setViewingExportPDFTest(null)}
                className="text-gray-400 hover:text-black transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                Generating a PDF formatted file for <strong>{viewingExportPDFTest.name || viewingExportPDFTest.title || 'the selected test'}</strong>.
                <br /><br />
                This file {viewingExportPDFTest.exportMode === 'with_solution' ? 'will include detailed solutions for all questions.' : 'will only contain the questions and multiple choices.'}
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setViewingExportPDFTest(null)}
                className="px-5 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast("PDF generation started successfully!");
                  setViewingExportPDFTest(null);
                }}
                className="px-6 py-2 bg-black text-white rounded-xl text-[13px] font-bold shadow-md hover:bg-gray-800 transition-colors active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

class TestsErrorBoundary extends React.Component<
  { children: React.ReactNode; showToast?: any },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Tests component crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
            <span className="material-symbols-outlined text-red-400 text-4xl mb-3">
              error
            </span>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("viewingTestSeries");
                localStorage.removeItem("viewingTestSeriesTab");
                this.setState({ hasError: false, error: null });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Reset & Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const TestsWithErrorBoundary: React.FC<Props> = (props) => (
  <TestsErrorBoundary showToast={props.showToast}>
    <Tests {...props} />
  </TestsErrorBoundary>
);

export default TestsWithErrorBoundary;
