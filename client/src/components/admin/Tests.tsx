import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AdminUIContext } from "../../context/AdminUIContext";
import {
  testsAPI,
  coursesAPI,
  questionsAPI,
  testSeriesAPI,
  invalidateCache,
} from "../../services/apiClient";
import QuestionPaperRenderer from "./QuestionPaperRenderer";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import Topics from "./misc/Topics";
import AddTestDrawer from "./AddTestDrawer";
import AddSingleTestDrawer from "./AddSingleTestDrawer";
import AddTestPDFDrawer from "./AddTestPDFDrawer";
import SubjectiveTestDrawer from "./SubjectiveTestDrawer";
import AddTestPDFBulkDrawer from "./AddTestPDFBulkDrawer";
import ViewFormatModal from "./ViewFormatModal";
import AddQuestionDrawer from "./AddQuestionDrawer";
import ImportGlobalLibraryDrawer from "./ImportGlobalLibraryDrawer";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { generateDOCX } from "./DOCXGenerator";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "5.5.207"}/build/pdf.worker.min.mjs`;

const tabs = [
  "Tests",
  "Results",
  "Copy Content",
  "Bulk Uploader",
  "Topics",
  "Reported Questions",
  "Question Library",
];
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

const SortableQuestionItem = ({ id, question, index }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-6 p-4 border rounded-xl bg-white transition-all group ${isDragging ? "border-primary-400 shadow-xl scale-[1.02] cursor-grabbing" : "border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-move"}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-center text-gray-300 group-hover:text-gray-400 transition-colors">
        <span className="material-symbols-outlined text-[20px]">
          drag_indicator
        </span>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[14px] font-bold text-gray-700 truncate">
          {index + 1}. {question.questionEn || "No question text available"}
        </p>
        {question.subject && (
          <span className="text-[10px] text-primary-500 font-bold uppercase tracking-wider">
            {question.subject}
          </span>
        )}
      </div>
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
  const [copyData, setCopyData] = useState<{
    sourceSeries: string;
    sourceTitle: string;
    sourceSection: string;
    sourceSearch: string[];
    targetSeries: string;
    targetTitle: string;
  }>({
    sourceSeries: "",
    sourceTitle: "",
    sourceSection: "",
    sourceSearch: [],
    targetSeries: "",
    targetTitle: "",
  });
  const [copyTestsData, setCopyTestsData] = useState<{
    sourceSeries: string;
    sourceSubject: string[];
    sourceTitleSearch: string[];
    targetSeriesSearch: string[];
    targetSubject: string;
  }>({
    sourceSeries: "",
    sourceSubject: [],
    sourceTitleSearch: [],
    targetSeriesSearch: [],
    targetSubject: "",
  });
  const [copyPdfData, setCopyPdfData] = useState<{
    sourceSeries: string;
    sourcePdf: string[];
    targetSeries: string;
  }>({
    sourceSeries: "",
    sourcePdf: [],
    targetSeries: "",
  });
  const [bulkUploadData, setBulkUploadData] = useState<{
    testSeries: string;
    testTitle: string;
    format: string;
    file: File | null;
    parsedQuestions?: any[];
  }>({
    testSeries: "",
    testTitle: "",
    format: "default",
    file: null,
    parsedQuestions: [],
  });

  async function parseFile(file: File): Promise<any[]> {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (extension === "docx") {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return extractQuestionsFromText(result.value);
      } catch (err) {
        console.error("DOCX parsing error:", err);
        return [];
      }
    } else if (extension === "xlsx" || extension === "xls") {
      try {
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        return jsonData.map((row: any, idx) => ({
          id: idx + 1,
          questionEn:
            row.Question || row.question || row.text || "No question text",
          questionHi: row.QuestionHi || row.question_hindi || "",
          type: "Multiple Choice",
          options: [
            row.OptionA || row.A || row.option1 || "",
            row.OptionB || row.B || row.option2 || "",
            row.OptionC || row.C || row.option3 || "",
            row.OptionD || row.D || row.option4 || "",
          ].filter((o) => o !== ""),
          correctAnswer: String(row.Answer || row.answer || "A").toUpperCase(),
          positiveMarks: row.Marks || row.positive_marks || 4,
          negativeMarks: row.NegativeMarks || row.negative_marks || -1,
          solution: row.Solution || row.explanation || "Extracted from Excel",
        }));
      } catch (err) {
        console.error("Excel parsing error:", err);
        return [];
      }
    } else if (extension === "pdf") {
      try {
        console.log("Starting PDF parsing for:", file.name);
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();

          let lastY = -1;
          let pageText = "";

          // Use Y coordinate to detect new lines in PDF
          for (const item of textContent.items as any[]) {
            const currentY = item.transform[5];
            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
              pageText += "\n";
            }
            pageText += item.str + " ";
            lastY = currentY;
          }
          fullText += pageText + "\n\n";
        }

        console.log("Extracted PDF text length:", fullText.length);
        const questions = extractQuestionsFromText(fullText);
        console.log("Extracted questions count:", questions.length);
        return questions;
      } catch (err) {
        console.error("PDF parsing error:", err);
        return [];
      }
    }
    return [];
  }

  function extractQuestionsFromText(text: string): any[] {
    const questions: any[] = [];

    // Normalize text: handle various newline formats and multi-spaces
    const normalizedText = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

    // Split into question blocks
    // Matches patterns like "1.", "Q1.", "Question 1:", "1)", "(1)" at start of line or after double newline
    // We use a broader regex to capture various numbering styles
    const blocks = normalizedText
      .split(/(?:\n\s*\n|\n|^)(?=\s*(?:Q(?:uestion)?\s*)?\(?\d+\)?[\s.:\)])/i)
      .filter((b) => b.trim().length > 0);

    console.log(`Split text into ${blocks.length} potential question blocks.`);

    for (const block of blocks) {
      // Find options: (A), A., A), [A], Option A:
      // We look for A, B, C, D in various brackets or followed by dot/dash
      const optionMarkerRegex =
        /(?:\n|[ \t])(?:\(?([A-Da-d])[\s\).\]:]|Option\s*([A-Da-d])[\s.:])(?!\w)/gi;

      let lastIndex = 0;
      let match;
      const optionMatches = [];

      // Use a fresh regex instance for each block
      const tempGlobalRegex = new RegExp(optionMarkerRegex);
      while ((match = tempGlobalRegex.exec(block)) !== null) {
        optionMatches.push({
          index: match.index,
          marker: match[0],
          label: (match[1] || match[2]).toUpperCase(),
        });
      }

      let questionPart = "";
      let optionsArray: string[] = [];
      let answer = "A";
      let solution = "";

      if (optionMatches.length > 0) {
        // Text before first option is the question
        questionPart = block.substring(0, optionMatches[0].index).trim();

        // Extract options
        for (let i = 0; i < optionMatches.length; i++) {
          const start = optionMatches[i].index + optionMatches[i].marker.length;
          const end =
            i + 1 < optionMatches.length
              ? optionMatches[i + 1].index
              : block.length;
          let optText = block.substring(start, end).trim();

          // Detect Ans/Solution inside option text (sometimes they are appended on the same line)
          const ansMatch = optText.match(
            /(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D])/i,
          );
          if (ansMatch) {
            answer = ansMatch[1].toUpperCase();
            optText = optText.substring(0, ansMatch.index).trim();
          }

          const solMatch = optText.match(
            /(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]*([\s\S]*)/i,
          );
          if (solMatch) {
            solution = solMatch[1].trim();
            optText = optText.substring(0, solMatch.index).trim();
          }

          if (optText) optionsArray.push(optText);
        }
      } else {
        // No options found, the whole block is just question text
        questionPart = block.trim();
      }

      // Clean up question text: remove the question number prefix (e.g., "1. ")
      let questionEn = questionPart
        .replace(/^\s*(?:Q(?:uestion)?\s*)?\(?\d+\)?[\s.:\)]+\s*/i, "")
        .trim();
      let questionHi = "";

      // Hindi detection and separation for bilingual questions
      const hindiRegex = /[\u0900-\u097F]/;
      if (hindiRegex.test(questionEn)) {
        // If it's a bilingual block, tries to split by newline
        const lines = questionEn
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length >= 2) {
          const hasHindi0 = hindiRegex.test(lines[0]);
          const hasHindi1 = hindiRegex.test(lines[1]);

          if (hasHindi0 && !hasHindi1) {
            questionHi = lines[0];
            questionEn = lines.slice(1).join(" ");
          } else if (!hasHindi0 && hasHindi1) {
            questionEn = lines[0];
            questionHi = lines.slice(1).join(" ");
          } else if (hasHindi0 && hasHindi1) {
            // Both have Hindi, maybe just a long Hindi question
            questionHi = questionEn;
            questionEn = ""; // Or we could duplicate
          }
        } else if (hindiRegex.test(questionEn)) {
          // Single line with Hindi
          questionHi = questionEn;
          questionEn = "";
        }
      }

      // Fallback: Global answer detection if not found in options
      if (answer === "A") {
        const globalAns = block.match(
          /(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D])\b/i,
        );
        if (globalAns) answer = globalAns[1].toUpperCase();
      }

      // Fallback: Global solution detection
      const globalSol = block.match(
        /(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]*([\s\S]{5,})/i,
      );
      if (globalSol) {
        solution = globalSol[1].trim();
      }

      // Final sanitization
      if (questionEn || questionHi) {
        questions.push({
          id: questions.length + 1,
          questionEn: questionEn || questionHi, // Fallback En to Hi if only Hi exists
          questionHi: questionEn ? questionHi : "",
          type: "Multiple Choice",
          options:
            optionsArray.length >= 2
              ? optionsArray.slice(0, 4)
              : ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: answer,
          positiveMarks: 4,
          negativeMarks: -1,
          solution: solution || "Extracted from document",
        });
      }
    }

    return questions;
  }
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
  const [showImportLibraryDrawer, setShowImportLibraryDrawer] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditorQuestions((items) => {
        const oldIndex = items.findIndex(
          (i) => (i.id || i._id) === active.id,
        );
        const newIndex = items.findIndex(
          (i) => (i.id || i._id) === over.id,
        );

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
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

  // Question Library States
  const [masterQuestions, setMasterQuestions] = useState<any[]>([]);
  const [masterSearchQuery, setMasterSearchQuery] = useState("");
  const [isMasterFilterOpen, setIsMasterFilterOpen] = useState(false);
  const [masterFilters, setMasterFilters] = useState({
    subject: "",
    section: "",
    topic: "",
    type: "",
  });
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
    if (activeTab === "Question Library") {
      loadMasterQuestions();
    }
  }, [activeTab]);

  const loadMasterQuestions = () => {
    // Master data for Question Library
    const mockMasters = [
      {
        id: 1,
        serialNo: "155956",
        textEn:
          "100. Price of wheat is increased by 30%. A person can purchase 6 kg less wheat in Rs. 2600. Find old and new price of wheat per kg.",
        textHi:
          "गेंहूँ की कीमत में 30 प्रतिशत बढ़ोतरी होने पर एक व्यक्ति 2600 रूपये में 6 किग्रा0 गेंहूँ कम खरीद सकता है। गेंहूँ की पुरानी व नई कीमत प्रति किग्रा0 क्या है?",
        badge: "HSSC TEST-159",
        options: [
          "Rs. 100, Rs. 130",
          "Rs. 200, Rs. 180",
          "Rs. 130, Rs. 100",
          "Rs. 150, Rs. 200",
          "",
        ],
        correctAnswer: "A",
        solution:
          "Let old price be x. New price = 1.3x. 2600/x - 2600/1.3x = 6. Solve for x.",
        section: "MATH-31",
        positiveMarks: "1.00",
        negativeMarks: "0.00",
      },
      {
        id: 2,
        serialNo: "155955",
        textEn:
          "99. The ratio of water and milk in a vessel is 1 : 2 and in other vessel is 3 : 4. 1 - 1 kg of mixture is drawn off from both vessels and poured into a third vessel. Then new ratio of milk and water is:",
        textHi:
          "एक बर्तन में पानी तथा दूध का अनुपात 1 : 2 है तथा दूसरे में यह अनुपात 3 : 4 है। दोनों बर्तनों से 1-1 किग्रा0 मिश्रण निकालकर हटा दिया जाता है और फिर दोनों को एक तीसरे बर्तन में उड़ेल दिया जाता है तो अब दूध तथा पानी का अनुपात है?",
        badge: "HSSC TEST-159",
        options: ["7 : 13", "13 : 7", "1 : 1", "3 : 5", ""],
        correctAnswer: "B",
        solution:
          "Calculate amount of milk and water in each vessel and add them.",
        section: "MATH-31",
        positiveMarks: "1.00",
        negativeMarks: "0.00",
      },
      {
        id: 3,
        serialNo: "155954",
        textEn:
          "98. If $x^2 + \\frac{1}{x^2} = 66$, then find the value of $\\frac{x^2 - 1 + 2x}{x}$",
        textHi:
          "यदि $x^2 + \\frac{1}{x^2} = 66$, तो $\\frac{x^2 - 1 + 2x}{x}$ का मान है-",
        badge: "HSSC TEST-159",
        options: ["10", "12", "8", "6", ""],
        correctAnswer: "A",
        solution:
          "$(x-1/x)^2 = x^2 + 1/x^2 - 2 = 66 - 2 = 64$. So $x-1/x = 8$. Expression is $(x-1/x) + 2 = 8 + 2 = 10$.",
        section: "MATH-31",
        positiveMarks: "1.00",
        negativeMarks: "0.00",
      },
      {
        id: 4,
        serialNo: "155953",
        textEn:
          "97. A rabbit was standing 180 meter far from a dog. The rabbit run with a speed of 9 km/h after watching the dog and after 1 minute the dog chasing the rabbit with a speed of 12 km/h. After how much time and how many meters from the place where the dog was standing will the dog caught the rabbit.",
        textHi:
          "एक कुत्ते से 180 मीटर की दूरी पर एक खरगोश खड़ा था। कुत्ते को देखकर खरगोश 9 किमी / घंटा चाल से भागा। एक मिनट बाद कुत्ते ने 12 किमी / घंटा की चाल से खरगोश का पीछा किया। ज्ञात कीजिए कितने समय बाद तथा जहाँ कुत्ता खड़ा था वहाँ से कितने मीटर की दूरी पर कुत्ता खरगोश को पकड़ लेगा?",
        badge: "HSSC TEST-159",
        options: [
          "5 min, 900 m",
          "6 min, 1080 m",
          "4 min, 800 m",
          "7 min, 1200 m",
          "",
        ],
        correctAnswer: "B",
        solution: "Relative speed and time calculation.",
        section: "MATH-31",
        positiveMarks: "1.00",
        negativeMarks: "0.00",
      },
    ];
    setMasterQuestions(mockMasters);
  };

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
    // Mock data for Reported Questions that matches pixel UI design
    const mockData = [
      {
        id: 1,
        studentName: "Vishal Yadav",
        studentPhone: "7015540188",
        studentEmail: "vishalyad300@gmail.com",
        testTitle: "SSC TEST-7 MARCH",
        batchSeries: "Nuggets Batch Test Series - 07 March",
        questionNumber: 18,
        questionEn:
          "If a mirror is placed on the line MN, then which of the answer figures is the right image of the given figure?",
        questionHi:
          "यदि एक दर्पण को MN रेखा पर रखा जाए तो दी गई उत्तर आकृतियों में से कौन-सी आकृति प्रश्न आकृति की सही प्रतिबिम्ब होगी?",
        questionFigureText: "Question Figure / प्रश्न आकृति :",
        answerFiguresText: "Answer Figures / उत्तर आकृतियाँ :",
        questionImage:
          "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=150&h=100",
        issue: "Formatting Issue",
        issueColor: "#FFEFEF",
        issueTextColor: "#E84E4E",
        comment: "",
        reportedDate: "2023-03-07 12:38:17",
      },
      {
        id: 2,
        studentName: "Shivaji",
        studentPhone: "9494402899",
        studentEmail: "saypsiva@gmail.com",
        testTitle: "Verb Test-2",
        batchSeries: "इंग्लिश शुरू से बेंच Test Series",
        questionNumber: 50,
        questionEn: "By next year, I ____ my degree.",
        issue: "Other",
        issueColor: "#FFEFEF",
        issueTextColor: "#E84E4E",
        comment: "",
        reportedDate: "2023-03-05 17:58:40",
      },
      {
        id: 3,
        studentName: "Akshar Verma",
        studentPhone: "9097945866",
        studentEmail: "rupaanand2008@gmail.com",
        testTitle: "Verb Test-2",
        batchSeries: "इंग्लिश शुरू से बेंच Test Series",
        questionNumber: 45,
        questionEn: "He ____ not agree with me.",
        issue: "Wrong Question",
        issueColor: "#FFEFEF",
        issueTextColor: "#E84E4E",
        comment: "",
        reportedDate: "2023-03-05 17:39:50",
      },
    ];
    setReportedQuestions(mockData);
  };

  const loadData = async () => {
    try {
      const [testData, courseData] = await Promise.all([
        testsAPI.getAll().catch(() => []),
        coursesAPI.getAll().catch(() => []),
      ]);
      setTests(Array.isArray(testData) ? testData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
    } catch (error) {
      console.log("Starting with empty state");
      setTests([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const getCourseName = (test: any) => {
    if (test.courseName) return test.courseName;
    if (test.courseId) {
      const course = courses.find(
        (c) => c.id === test.courseId || (c as any)._id === test.courseId,
      );
      if (course) return course.name || course.title;
      const parentSeries = tests.find(
        (t) => t.id === test.courseId || (t as any)._id === test.courseId,
      );
      if (parentSeries) return parentSeries.name || parentSeries.title;
      return test.courseId;
    }
    return test.course || "Unlinked";
  };

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
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  const renderResultsTab = () => {
    const filteredResults = results.filter((r) => {
      const matchSeries =
        !resultFilters.series ||
        r.courseName === resultFilters.series ||
        r.courseId === resultFilters.series;
      const matchTest =
        !resultFilters.test ||
        r.testName === resultFilters.test ||
        r.testId === resultFilters.test;
      return matchSeries && matchTest;
    });

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
                options={courses.map((c) => ({
                  value: c.name || c.title || "",
                  label: c.name || c.title || "",
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
                options={[
                  "General Knowledge",
                  "Mathematics",
                  "Reasoning",
                  "English",
                ].map((s) => ({ value: s, label: s }))}
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
                options={["Mock Test", "Practice Test", "Previous Year"].map(
                  (t) => ({ value: t, label: t }),
                )}
                value={resultFilters.type}
                onChange={(val: any) =>
                  setResultFilters({ ...resultFilters, type: val })
                }
                placeholder="Test Title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-gray-500">
                Test Title
              </label>
              <CustomDropdown
                options={tests
                  .filter(
                    (t) =>
                      !resultFilters.series ||
                      t.courseName === resultFilters.series ||
                      t.courseId === resultFilters.series,
                  )
                  .map((t) => ({
                    value: t.name || "Unnamed Test",
                    label: t.name || "Unnamed Test",
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
                  filteredResults.map((r, idx) => (
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
                        {idx + 1}
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
                              },
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

        <div className="px-2 pb-8">
          <p className="text-[13px] font-medium text-gray-400 italic">
            Showing {filteredResults.length} entries
          </p>
        </div>
      </div>
    );
  };

  const renderReportedQuestionsTab = () => {
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
                        ).map((issue) => (
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
                {filteredReported.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-8 py-20 text-center">
                      <p className="text-gray-400 font-medium">
                        No reported questions found
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReported.map((rq, idx) => (
                    <tr
                      key={rq.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-4 py-8 text-center align-top border-b border-gray-50/50">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 mt-1"
                        />
                      </td>
                      <td className="px-4 py-8 text-[14px] font-bold text-gray-600 align-top border-b border-gray-50/50 text-center">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
                        <div className="max-w-full">
                          <p className="text-[14px] font-bold text-gray-800 leading-tight mb-0.5 truncate">
                            {rq.studentName}
                          </p>
                          <p className="text-[12px] font-medium text-gray-500 mb-0.5 truncate">
                            {rq.studentPhone}
                          </p>
                          <p className="text-[12px] font-medium text-gray-400 truncate">
                            {rq.studentEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
                        <div className="max-w-full">
                          <p className="text-[14px] font-bold text-gray-800 uppercase tracking-tight leading-tight mb-1 line-clamp-2">
                            {rq.testTitle}
                          </p>
                          <p className="text-[12px] font-medium text-gray-400 leading-tight line-clamp-2">
                            {rq.batchSeries}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-8 align-top border-b border-gray-50/50 overflow-hidden">
                        <div className="space-y-4 pr-4">
                          <div className="space-y-1">
                            <p className="text-[14px] font-bold text-gray-800 leading-relaxed line-clamp-3">
                              {rq.questionNumber}. {rq.questionEn}
                            </p>
                            {rq.questionHi && (
                              <p className="text-[14px] font-medium text-gray-600 leading-relaxed line-clamp-3">
                                {rq.questionHi}
                              </p>
                            )}
                          </div>

                          {rq.questionImage && (
                            <div className="space-y-3 pt-2">
                              {rq.questionFigureText && (
                                <p className="text-[13px] font-bold text-gray-600">
                                  {rq.questionFigureText}
                                </p>
                              )}
                              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm inline-block bg-white p-2">
                                <img
                                  src={rq.questionImage}
                                  alt="Figure"
                                  className="max-w-[150px] h-auto block"
                                />
                              </div>
                              {rq.answerFiguresText && (
                                <div className="space-y-3">
                                  <div className="h-[1px] w-full bg-gray-100 my-2" />
                                  <p className="text-[13px] font-bold text-gray-600">
                                    {rq.answerFiguresText}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
                        <span
                          className="px-3 py-1.5 rounded-full text-[11px] font-bold inline-block shadow-sm whitespace-nowrap"
                          style={{
                            backgroundColor: rq.issueColor,
                            color: rq.issueTextColor,
                          }}
                        >
                          {rq.issue}
                        </span>
                      </td>
                      <td className="px-4 py-8 align-top text-center border-b border-gray-50/50 overflow-hidden">
                        <p className="text-[13px] text-gray-500 italic line-clamp-2">
                          {rq.comment || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-8 align-top border-b border-gray-50/50">
                        <div className="whitespace-nowrap">
                          <p className="text-[14px] font-bold text-gray-700">
                            {rq.reportedDate.split(" ")[0]}
                          </p>
                          <p className="text-[12px] font-medium text-gray-400">
                            {rq.reportedDate.split(" ")[1]}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-8 align-top text-center border-b border-gray-50/50">
                        <div className="relative inline-block action-menu-container" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setActiveActionMenuId(
                                activeActionMenuId === rq.id ? null : rq.id,
                              )
                            }
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-lg text-[13px] font-bold transition-all shadow-sm group ${activeActionMenuId === rq.id
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                          >
                            Actions
                            <span
                              className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${activeActionMenuId === rq.id
                                ? "rotate-180 text-blue-500"
                                : "text-gray-400 group-hover:text-gray-600 font-normal"
                                }`}
                            >
                              expand_more
                            </span>
                          </button>

                          {activeActionMenuId === rq.id && (
                            <div
                              className={`absolute right-0 w-[140px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${filteredReported.length > 3
                                ? idx >= filteredReported.length - 2
                                  ? "bottom-full mb-1"
                                  : "top-full mt-1"
                                : idx >= filteredReported.length - 1
                                  ? "bottom-full mb-1"
                                  : "top-full mt-1"
                                }`}
                            >
                              <button className="w-full px-4 py-1.5 flex items-center gap-3 text-left hover:bg-blue-50/50 transition-colors group">
                                <span className="material-symbols-outlined text-[18px] text-blue-400 group-hover:text-blue-500">
                                  edit
                                </span>
                                <span className="text-[13px] font-bold text-gray-700 group-hover:text-blue-700">
                                  Edit
                                </span>
                              </button>
                              <button className="w-full px-4 py-1.5 flex items-center gap-3 text-left hover:bg-blue-50/50 transition-colors group">
                                <span className="material-symbols-outlined text-[18px] text-blue-400 group-hover:text-blue-500">
                                  check_circle
                                </span>
                                <span className="text-[13px] font-bold text-gray-700 group-hover:text-blue-700">
                                  Resolve
                                </span>
                              </button>
                              <div className="h-[1px] bg-gray-50 my-1 mx-2"></div>
                              <button className="w-full px-4 py-1.5 flex items-center gap-3 text-left hover:bg-red-50/50 transition-colors group">
                                <span className="material-symbols-outlined text-[18px] text-red-400 group-hover:text-red-500">
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
        </div>

        <div className="px-2">
          <p className="text-[13px] font-medium text-gray-400 italic">
            Showing {filteredReported.length} entries
          </p>
        </div>
      </div>
    );
  };

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
          {/* Top Header */}
          <div className="bg-white px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewingQuestionEditor(null)}
                className="text-gray-900 flex items-center justify-center p-1 hover:bg-gray-50 rounded-full transition-all"
              >
                <span className="material-symbols-outlined font-black text-[22px]">
                  arrow_back_ios_new
                </span>
              </button>
              <div>
                <h2 className="text-[18px] font-black text-gray-900 leading-tight">
                  {viewingQuestionEditor?.name ||
                    viewingQuestionEditor?.title ||
                    viewingTestSeries?.name ||
                    "Unnamed Test"}
                </h2>
                <p className="text-[12px] font-medium text-gray-400">
                  {viewingTestSeries?.name || "Test"} Series
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                const testId = viewingQuestionEditor?.id || viewingQuestionEditor?._id;
                if (!testId) return;
                try {
                  // showToast is available in the component
              showToast("Publish changes...");
              await testsAPI.publish(testId);
              showToast("Test published successfully!");
            } catch (error: any) {
              showToast(error.message || "Failed to publish test", "error");
            }
          }}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#4361EE] text-white rounded-xl text-[13px] font-bold shadow-[0_4px_14px_0_rgba(67,97,238,0.39)] hover:bg-[#3451DE] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[19px]">
            sync
          </span>
          Publish Changes
        </button>
          </div>

          <div className="max-w-[1400px] mx-auto p-6 space-y-6">
            {/* Stats Bar */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                <span className="text-[13px] font-bold text-gray-600">
                  {viewingQuestionEditor.marks || 0} Marks
                </span>
                <span className="text-[13px] font-bold text-gray-600">
                  {viewingQuestionEditor.time || 0} Minutes
                </span>
                <span className="text-[13px] font-bold text-gray-600">
                  {editorQuestions.length} /{" "}
                  {viewingQuestionEditor?.noOfQuestions ||
                    viewingQuestionEditor?.questions ||
                    editorQuestions.length}{" "}
                  Questions Added
                </span>
              </div>
              <p className="text-[12px] font-medium text-gray-400">
                Last Published:{" "}
                {viewingQuestionEditor.published ||
                  "October 30, 2025, 12:43 pm"}
              </p>
            </div>

            {/* Tabs Bar & Actions */}
            <div className="bg-white rounded-xl border border-gray-100 h-14 flex items-center justify-between px-2 shadow-sm">
              <div className="flex h-full">
                <button className="px-6 h-full text-[13px] font-bold border-b-[3px] border-black">
                  {viewingQuestionEditor.name}
                </button>
                <button className="px-6 h-full text-[13px] font-bold text-gray-400 hover:text-gray-600 transition-colors">
                  All
                </button>
              </div>

              <div className="flex items-center gap-3 pr-2">
                <div className="relative add-menu-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !showFloatingAddMenu;
                      setShowFloatingAddMenu(next);
                      if (next) {
                        setShowFloatingMoreMenu(false);
                        setActiveActionMenuId(null);
                      }
                    }}
                    className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
                  >
                    <span
                      className="material-symbols-outlined text-[24px]"
                      style={{
                        transform: showFloatingAddMenu
                          ? "rotate(45deg)"
                          : "rotate(0)",
                      }}
                    >
                      add
                    </span>
                  </button>
                  {showFloatingAddMenu && (
                    <div className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[101]">
                      {[
                        {
                          id: "create",
                          label: "Create Question",
                          icon: "edit_square",
                          color: "text-blue-500",
                          bg: "bg-blue-50",
                        },
                        {
                          id: "word",
                          label: "Bulk Upload from Word Doc",
                          icon: "description",
                          color: "text-amber-500",
                          bg: "bg-amber-50",
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === "create")
                              setViewingAddQuestionForm({});
                            if (item.id === "word") {
                              setViewingTestSeries(null);
                              setActiveTab("Bulk Uploader");
                            }

                            setShowFloatingAddMenu(false);
                          }}
                          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-all group"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}
                          >
                            <span
                              className={`material-symbols-outlined text-[20px] ${item.color}`}
                            >
                              {item.icon}
                            </span>
                          </div>
                          <span className="text-[14px] font-bold text-gray-700 group-hover:text-black">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative more-menu-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !showFloatingMoreMenu;
                      setShowFloatingMoreMenu(next);
                      if (next) {
                        setShowFloatingAddMenu(false);
                        setActiveActionMenuId(null);
                      }
                    }}
                    className="w-10 h-10 bg-white border border-gray-200 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      more_horiz
                    </span>
                  </button>
                  {showFloatingMoreMenu && (
                    <div className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[101]">
                      {[
                        {
                          label: "Bulk Delete",
                          icon: "delete",
                          onClick: () => {
                            setShowBulkDeleteModal(true);
                            setSelectedBulkDeleteQuestions([]);
                          },
                        },
                        {
                          label: "Sort Questions",
                          icon: "sort",
                          onClick: () => { setShowSortModal(true); },
                        },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (item.onClick) item.onClick();
                            setShowFloatingMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="material-symbols-outlined text-[18px] text-gray-400">
                            {item.icon}
                          </span>
                          <span className="text-[13px] font-bold text-gray-700">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Question List */}
            <div className="space-y-6">
              {(qeTests || []).map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 relative"
                >
                  {/* Top Right Buttons inside card */}
                  <div className="absolute top-8 right-8 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-sm uppercase text-[10px] font-black tracking-wider border border-[#C8E6C9]">
                        +{Number(q?.marks || 1).toFixed(2)}
                      </span>
                      <span className="px-2.5 py-1 bg-[#FFEBEE] text-[#C62828] rounded-sm uppercase text-[10px] font-black tracking-wider border border-[#FFCDD2]">
                        -{Number(q?.negative || 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => setViewingAddQuestionForm(q)}
                      className="flex items-center gap-2 px-4 py-1.5 border border-gray-100 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        edit_note
                      </span>
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteQuestion(q.id || (q as any)._id)
                      }
                      className="w-9 h-9 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        delete
                      </span>
                    </button>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <span className="text-[16px] font-black text-gray-800 shrink-0 leading-[1.6]">
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="text-[16px] font-bold text-gray-800 leading-[1.6] pr-64">
                          {renderQuestionText(
                            q?.questionEn || "No question text",
                          )}
                        </div>
                        {q?.questionHi && (
                          <div className="text-[16px] font-medium text-gray-500 mt-2 leading-[1.6]">
                            {renderQuestionText(q.questionHi)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="pl-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(q?.displayOptions || []).map(
                        (opt: any, oidx: number) => {
                          const optionLabel = String.fromCharCode(65 + oidx);
                          return (
                            <div
                              key={oidx}
                              className={`rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col ${opt?.isCorrect ? "border-[#82B366] ring-1 ring-[#82B366]/20" : "border-gray-100"}`}
                            >
                              <div
                                className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${opt?.isCorrect ? "bg-[#D5E8D4]/40 border-[#82B366] text-[#2E7D32]" : "bg-[#fcfcfc] border-gray-100 text-gray-500"}`}
                              >
                                <span className="text-[11px] font-black uppercase tracking-widest">
                                  Option {optionLabel}
                                </span>
                                {opt?.isCorrect && (
                                  <span className="material-symbols-outlined text-[18px] font-black">
                                    check_circle
                                  </span>
                                )}
                              </div>
                              <div className="p-8 flex-1 flex items-center justify-center min-h-[100px] text-[15px] font-bold text-gray-700 text-center leading-relaxed">
                                {renderQuestionText(opt?.text || "Option Text")}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                {(detailTests.length > 0 ? detailTests : mockDetailTests)
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
                  })
                  .map((test, index) => (
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
                             <span className={(Array.isArray((test as any).questions) ? (test as any).questions.length : Number((test as any).questions) || 0) >= (Number((test as any).noOfQuestions) || Number((test as any).questions) || 0) ? "text-green-600 font-bold" : ""}>
                               {Array.isArray((test as any).questions)
                                 ? (test as any).questions.length
                                 : Number((test as any).questions) || 0}
                               /
                               {Number((test as any).noOfQuestions) ||
                                 Number((test as any).questions) ||
                                 0}{" "}
                               Questions Added
                             </span>
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
                  ))}
              </div>
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

  const renderQuestionLibraryTab = () => {
    const filteredMaster = masterQuestions.filter((q) => {
      const matchSearch =
        q.textEn?.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
        q.textHi?.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
        (q.serialNo &&
          q.serialNo.toLowerCase().includes(masterSearchQuery.toLowerCase()));
      const matchSubject =
        !masterFilters.subject || q.subject === masterFilters.subject;
      return matchSearch && matchSubject;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-gray-800 tracking-tight">
              Question Library
            </h2>
          </div>
          <div className="flex gap-3 items-center w-full sm:w-auto">
            <div className="relative group flex-1 sm:w-[320px]">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] transition-colors group-focus-within:text-black">
                search
              </span>
              <input
                type="text"
                placeholder="Search by text or serial..."
                value={masterSearchQuery}
                onChange={(e) => setMasterSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-[#f8f9fa] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-black focus:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setIsMasterFilterOpen(!isMasterFilterOpen)}
                className={`flex items-center gap-2 px-6 h-11 rounded-xl border text-[13px] font-bold transition-all ${isMasterFilterOpen ? "bg-black text-white border-black shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50"}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  tune
                </span>
                Filters
              </button>

              {isMasterFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-50 p-6 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Subject
                      </label>
                      <select
                        value={masterFilters.subject}
                        onChange={(e) =>
                          setMasterFilters({
                            ...masterFilters,
                            subject: e.target.value,
                          })
                        }
                        className="w-full h-9 px-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] outline-none focus:border-black"
                      >
                        <option value="">All Subjects</option>
                        {Array.from(
                          new Set(
                            masterQuestions
                              .map((q) => q.subject)
                              .filter(Boolean),
                          ),
                        ).map((s) => (
                          <option key={s} value={s}>
                            {s}
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

        <div className="bg-white rounded-[1rem] shadow-sm border border-gray-100 overflow-visible">
          <div className="">
            <table className="w-full text-left">
              <thead className="bg-[#FFFFFF] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-4 w-[120px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      S. NO.{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        unfold_more
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      QUESTION DETAILS
                    </div>
                  </th>
                  <th className="px-6 py-4 w-[160px] text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-right pr-12">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMaster.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <p className="text-gray-400 font-medium">
                        No results found in Question Library
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMaster.map((q, idx) => (
                    <tr
                      key={q.id}
                      className="hover:bg-gray-50/30 transition-colors group"
                    >
                      <td className="px-6 py-8 text-center align-top border-b border-gray-50/50">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 mt-1"
                        />
                      </td>
                      <td className="px-6 py-8 text-[14px] font-bold text-gray-600 align-top border-b border-gray-50/50">
                        {q.serialNo || idx + 1}
                      </td>
                      <td className="px-6 py-8 align-top border-b border-gray-50/50">
                        <div className="space-y-4 max-w-[900px]">
                          <div className="space-y-2">
                            <p className="text-[14px] font-medium text-gray-700 leading-relaxed">
                              {renderQuestionText(q.textEn)}
                            </p>
                            {q.textHi && (
                              <p className="text-[16px] font-medium text-gray-800 leading-relaxed font-hindi">
                                {renderQuestionText(q.textHi)}
                              </p>
                            )}
                          </div>
                          {q.badge && (
                            <div className="inline-block px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-[4px] text-[11px] font-black uppercase tracking-wider border border-[#C8E6C9]">
                              {q.badge}
                            </div>
                          )}
                          {q.image && (
                            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm inline-block bg-white p-2 mt-2">
                              <img
                                src={q.image}
                                alt="Figure"
                                className="max-w-[150px] h-auto block"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-8 align-top text-right pr-6 border-b border-gray-50/50">
                        <div className="relative inline-block action-menu-container" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = activeActionMenuId === (q.id || (q as any)._id) + 20000 ? null : (q.id || (q as any)._id) + 20000;
                              setActiveActionMenuId(next);
                            }}
                            className={`flex items-center justify-between gap-2 px-4 py-2 border rounded-lg text-[13px] font-bold transition-all shadow-sm w-[110px] ${activeActionMenuId === (q.id || (q as any)._id) + 20000 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                          >
                            Actions
                            <span className={`material-symbols-outlined text-[18px] transition-all duration-200 ${activeActionMenuId === (q.id || (q as any)._id) + 20000 ? "rotate-180 text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                              expand_more
                            </span>
                          </button>

                          {activeActionMenuId === (q.id || (q as any)._id) + 20000 && (
                            <div className={`absolute right-0 w-[140px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${idx >= filteredMaster.length - 2 ? "bottom-full mb-1" : "top-full mt-1"}`}>
                              <button
                                onClick={() => { setActiveActionMenuId(null); setViewingQuestionDetail(q); }}
                                className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                              >
                                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-black">
                                  radio_button_checked
                                </span>
                                <span className="text-[13px] font-bold text-gray-600 group-hover:text-black">
                                  View
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

          {/* Professional Footer inside the card */}
          <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4">
              <span className="text-[13px] font-medium text-gray-400 italic">
                Showing {filteredMaster.length} to {filteredMaster.length} of{" "}
                {filteredMaster.length} entries
              </span>
            </div>

            <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <button
                disabled
                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 opacity-30 cursor-not-allowed"
              >
                Previous
              </button>
              <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
              <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white shadow-lg rounded-xl">
                1
              </button>
              <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
              <button
                disabled
                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 opacity-30 cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBulkUploaderTab = () => {
    const previewQuestions =
      bulkUploadData.parsedQuestions &&
        bulkUploadData.parsedQuestions.length > 0
        ? bulkUploadData.parsedQuestions
        : [];

    const formats = [
      {
        key: "default",
        label: "Default",
        beta: false,
        preview: (
          <div className="w-full h-full bg-white p-1 flex flex-col">
            <div className="border-[0.5px] border-gray-200 flex-1 flex flex-col">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex border-b-[0.5px] border-gray-100 last:border-0 h-[16%]"
                >
                  <div className="w-[30%] bg-gray-50 border-r-[0.5px] border-gray-100" />
                  <div className="flex-1 p-[2px]">
                    <div
                      className={`h-[2px] bg-gray-100 rounded-full ${i % 2 === 0 ? "w-[60%]" : "w-[80%]"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: "format1",
        label: "Format 1",
        beta: false,
        preview: (
          <div className="w-full h-full bg-white p-1 flex flex-col gap-[2px]">
            <div className="p-1 space-y-2">
              <div className="space-y-1">
                <div className="h-[2px] bg-gray-200 w-[90%]" />
                <div className="h-[1px] bg-gray-100 w-[60%]" />
              </div>
              <div className="pl-2 space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-1">
                    <div className="w-2 h-[1px] bg-gray-200" />
                    <div className="h-[1px] bg-gray-100 w-[30%]" />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <div className="h-[2px] bg-gray-200 w-[40%]" />
              </div>
              <div className="space-y-1">
                <div className="h-[1px] bg-gray-100 w-[60%]" />
                <div className="h-[1px] bg-gray-100 w-[50%]" />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "format2",
        label: "Format 2",
        beta: true,
        preview: (
          <div className="w-full h-full bg-white p-1 flex flex-col gap-[2px]">
            <div className="p-1 space-y-2">
              <div className="flex gap-1">
                <span className="text-[6px] font-bold">1.</span>
                <div className="flex-1 space-y-1">
                  <div className="h-[2px] bg-gray-200 w-full" />
                  <div className="h-[1px] bg-gray-100 w-[80%]" />
                </div>
              </div>
              <div className="pl-2 space-y-1">
                {["A.", "B.", "C.", "D."].map((l) => (
                  <div key={l} className="flex gap-1">
                    <span className="text-[5px] font-bold">{l}</span>
                    <div className="h-[1px] bg-gray-100 w-[20%]" />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="h-[1.5px] bg-gray-200 w-[30%]" />
                <div className="h-[1.5px] bg-gray-200 w-[40%]" />
              </div>
              <div className="space-y-1">
                <div className="h-[1px] bg-gray-100 w-full" />
                <div className="h-[1px] bg-gray-100 w-[90%]" />
                <div className="h-[1px] bg-gray-100 w-[85%]" />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "format3",
        label: "Format 3",
        beta: false,
        preview: (
          <div className="w-full h-full bg-white p-1 flex flex-col gap-[2px]">
            <div className="p-1 space-y-1.5">
              <div className="flex justify-between items-center bg-gray-50 p-1 rounded">
                <div className="h-[2px] bg-gray-300 w-[50%]" />
                <div className="h-[2px] bg-gray-300 w-[20%]" />
              </div>
              <div className="space-y-1 py-1">
                <div className="h-[1px] bg-gray-200 w-full" />
                <div className="h-[1px] bg-gray-200 w-[90%]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-sm border border-gray-200" />
                    <div className="h-[1px] bg-gray-100 w-[70%]" />
                  </div>
                ))}
              </div>
              <div className="bg-blue-50/50 p-1 border-t border-blue-100 mt-1">
                <div className="h-[1px] bg-blue-200 w-[40%]" />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "format4",
        label: "Format 4",
        beta: false,
        preview: (
          <div className="w-full h-full bg-white p-1 flex flex-col">
            <div className="flex-1 border border-gray-100 rounded p-1 space-y-2">
              <div className="flex gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-[1.5px] bg-gray-300 w-full" />
                  <div className="h-[1.5px] bg-gray-300 w-[60%]" />
                </div>
              </div>
              <div className="space-y-1 pl-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[1px] bg-gray-100 w-[40%]" />
                ))}
              </div>
              <div className="border-t border-gray-50 pt-1 mt-1">
                <div className="h-[2px] bg-emerald-100 w-[30%]" />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "format5",
        label: "Format 5",
        beta: true,
        preview: (
          <div className="w-full h-full bg-white p-1">
            <div className="space-y-2">
              <div className="h-3 bg-gray-50 rounded-sm w-[70%] mb-2" />
              <div className="space-y-1 pl-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-1 h-[1px] bg-gray-300" />
                    <div className="h-[1px] bg-gray-200 w-[50%]" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <div className="w-6 h-6 border border-gray-100 rounded shadow-sm" />
                <div className="flex-1 space-y-1">
                  <div className="h-[1px] bg-gray-200 w-full" />
                  <div className="h-[1px] bg-gray-200 w-[80%]" />
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "format6",
        label: "Format 6",
        beta: false,
        preview: (
          <div className="w-full h-full bg-white p-1 flex flex-col items-center justify-center">
            <div className="w-full h-full border border-gray-100 rounded-lg p-2 flex gap-2">
              <div className="w-1 bg-gray-200 h-full rounded-full" />
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <div className="h-[2px] bg-gray-200 w-[80%]" />
                  <div className="h-[1px] bg-gray-100 w-[40%]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-5 bg-gray-50 rounded flex items-center px-1"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mr-1" />
                      <div className="h-[1px] bg-gray-100 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ];

    return (
      <div className="animate-in fade-in duration-500">
        <div className={`flex gap-5 items-start`}>
          {/* LEFT: Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 space-y-5 flex-1 min-w-0">
            {/* Select Test Series */}
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-[#1a7a5e]">
                Select Test Series *
              </label>
              <CustomDropdown
                options={courses.map((c) => ({
                  value: c.id || (c as any)._id,
                  label: c.name || c.title || "",
                }))}
                value={bulkUploadData.testSeries}
                onChange={(val: any) =>
                  setBulkUploadData({
                    ...bulkUploadData,
                    testSeries: val,
                    testTitle: "",
                  })
                }
                placeholder="Select Test Series"
                searchPlaceholder="Search"
              />
            </div>

            {/* Select Test Title */}
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-[#1a7a5e]">
                Select Test Title *
              </label>
              <CustomDropdown
                options={tests
                  .filter((t) => {
                    const testSeriesId =
                      t.courseId ||
                      (t as any).testSeriesId ||
                      (t.course &&
                        (typeof t.course === "object"
                          ? (t.course as any)._id || (t.course as any).id
                          : t.course));
                    return (
                      !bulkUploadData.testSeries ||
                      testSeriesId === bulkUploadData.testSeries
                    );
                  })
                  .map((t) => ({
                    value: t.id || (t as any)._id,
                    label: t.name || t.title || "Unnamed Test",
                  }))}
                value={bulkUploadData.testTitle}
                onChange={(val: any) =>
                  setBulkUploadData({ ...bulkUploadData, testTitle: val })
                }
                placeholder=""
                searchPlaceholder="Search"
              />
            </div>

            {/* Format Selection Cards */}
            <div className="flex flex-wrap gap-5 pt-1">
              {formats.map((fmt) => (
                <div
                  key={fmt.key}
                  onClick={() =>
                    setBulkUploadData({ ...bulkUploadData, format: fmt.key })
                  }
                  className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 overflow-hidden select-none flex-shrink-0 ${bulkUploadData.format === fmt.key
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                  style={{ width: "135px" }}
                >
                  {fmt.beta && (
                    <span className="absolute top-2 right-2 bg-[#D12E34] text-white text-[9px] font-bold px-2 py-[2px] rounded-md z-10 shadow">
                      Beta
                    </span>
                  )}
                  <div className="bg-white h-[140px] flex items-center justify-center overflow-hidden p-2">
                    {fmt.preview}
                  </div>
                  <div className="py-2 px-2 text-center bg-white border-t border-gray-100">
                    <p className={`text-[12px] font-bold text-gray-700`}>
                      {fmt.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 items-center gap-3">
              {previewQuestions.length === 0 && !isParsing && (
                <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    warning
                  </span>
                  Upload a file to preview with real data
                </span>
              )}
              <button
                onClick={() => {
                  // Save current questions to localStorage for the format view
                  localStorage.setItem(
                    "formatViewQuestions",
                    JSON.stringify(previewQuestions),
                  );
                  localStorage.setItem(
                    "formatViewFilename",
                    bulkUploadData.file?.name || "question_preview.docx",
                  );
                  const hash = `#/admin/view-format/${bulkUploadData.format || "default"}`;
                  const url =
                    window.location.origin + window.location.pathname + hash;
                  window.open(url, "_blank");
                }}
                disabled={isParsing}
                className={`flex items-center gap-2 text-[13px] font-bold transition-all group ${isParsing ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-black"}`}
              >
                <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
                  visibility
                </span>
                View Format
              </button>
            </div>

            {/* modern file uploader */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="group h-[52px] border-2 border-dashed border-gray-200 rounded-xl flex items-center overflow-hidden bg-white hover:border-[#4361EE]/50 hover:bg-blue-50/10 transition-all cursor-pointer mt-4">
                  <div
                    className={`px-5 text-[14px] flex-1 flex items-center gap-3 ${bulkUploadData.file ? "text-gray-700 font-semibold" : "text-gray-400 font-medium"}`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${bulkUploadData.file ? "text-blue-500" : "text-gray-300"}`}
                    >
                      {bulkUploadData.file ? "description" : "upload_file"}
                    </span>
                    <span className="truncate">
                      {bulkUploadData.file
                        ? bulkUploadData.file.name
                        : "Click to select or drag and drop file"}
                    </span>
                  </div>
                  <div className="h-full px-5 flex items-center bg-gray-50/80 border-l border-gray-200 group-hover:bg-[#4361EE]/5 group-hover:border-[#4361EE]/20 transition-all">
                    <span className="text-[#4361EE] text-[13px] font-bold uppercase tracking-wide">
                      Browse
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        setBulkUploadData({
                          ...bulkUploadData,
                          file,
                          parsedQuestions: [],
                        });
                        setIsParsing(true);
                        showToast(
                          `Preparing to parse ${file.name}...`,
                          "success",
                        );
                        try {
                          const questions = await parseFile(file);
                          setBulkUploadData((prev) => ({
                            ...prev,
                            file,
                            parsedQuestions: questions,
                          }));
                          if (questions.length === 0) {
                            showToast(
                              "No questions could be extracted. Please check the document format.",
                              "error",
                            );
                          } else {
                            showToast(
                              `Successfully extracted ${questions.length} questions!`,
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
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="pt-6 flex items-center gap-4">
              <button
                onClick={async () => {
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
                    let questionsToUpload = (
                      bulkUploadData.parsedQuestions || []
                    )
                      .filter(
                        (q) =>
                          !existingTexts.has(
                            (q.questionEn || "").trim().toLowerCase(),
                          ),
                      )
                      .map((q) => ({
                        testId: testId,
                        courseId:
                          bulkUploadData.testSeries ||
                          viewingTestSeries?.id ||
                          (viewingTestSeries as any)?._id,
                        questionEn: q.questionEn,
                        questionHi: q.questionHi || "",
                        type: "Multiple Choice Question",
                        marks: q.positiveMarks || 4,
                        negative: q.negativeMarks || -1,
                        displayOptions: (q.options || []).map(
                          (opt: string, i: number) => ({
                            id: i + 1,
                            text: opt,
                            isCorrect:
                              q.correctAnswer === String.fromCharCode(65 + i),
                          }),
                        ),
                        solution: {
                          heading: "Full Solution",
                          text: q.solution || "",
                        },
                      }));

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
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ questions: questionsToUpload }),
                    });

                    if (!res.ok) throw new Error("Upload failed");

                    invalidateCache("tests");
                    showToast(
                      `${questionsToUpload.length} questions uploaded successfully!`,
                      "success",
                    );

                    // 4. Update the test's viewFormat if needed
                    const formatVal = bulkUploadData.format || "format1";
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
                }}
                className="px-12 h-12 bg-gradient-to-r from-[#12A5B8] to-[#0E8A9A] hover:shadow-lg hover:shadow-cyan-500/30 text-white rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-md flex items-center gap-2"
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                Upload Questions
              </button>
            </div>
          </div>

          {/* RIGHT: Preview Panel — appears when file is selected */}
          {bulkUploadData.file && (
            <div className="w-[420px] flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden animate-in slide-in-from-right-4 duration-400 sticky top-4">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-[#f8fffe]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1a7a5e] text-[20px]">
                    table_view
                  </span>
                  <div>
                    <h3 className="text-[13px] font-bold text-gray-800">
                      File Preview
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {previewQuestions.length} questions ·{" "}
                      {bulkUploadData.file.name.slice(0, 20)}
                      {bulkUploadData.file.name.length > 20 ? "…" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100">
                    ✓ Valid
                  </span>
                  <button
                    onClick={() =>
                      setBulkUploadData({ ...bulkUploadData, file: null })
                    }
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      close
                    </span>
                  </button>
                </div>
              </div>

              {/* Questions list */}
              <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto relative">
                {isParsing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#1a7a5e] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[13px] font-bold text-[#1a7a5e]">
                      Extracting Questions...
                    </p>
                  </div>
                )}
                {previewQuestions.length > 0
                  ? previewQuestions.map((q, idx) => {
                    const format = bulkUploadData.format;

                    // Format 1 & 2 Style (More like a document)
                    if (format === "format1") {
                      return (
                        <div
                          key={idx}
                          className="px-5 py-6 hover:bg-gray-50/50 transition-colors border-l-4 border-transparent hover:border-black space-y-3 font-serif"
                        >
                          <div className="flex gap-2">
                            <span className="font-bold text-[13px] text-gray-900 shrink-0">
                              Question:
                            </span>
                            <p className="text-[12px] font-medium text-gray-800 leading-relaxed flex-1">
                              {renderQuestionText(q.questionEn)}
                            </p>
                          </div>
                          <div className="pl-16 space-y-1 font-sans">
                            {q.options.map((opt: string, i: number) => (
                              <div
                                key={i}
                                className="flex gap-2 text-[11px] text-gray-500"
                              >
                                <span className="font-bold">
                                  ({String.fromCharCode(97 + i)})
                                </span>
                                <span>{renderQuestionText(opt)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pl-16 space-y-1 text-[11px] text-gray-700 pt-2 font-sans">
                            <p>
                              <span className="font-bold">Answer:</span>{" "}
                              {q.correctAnswer.toLowerCase()}
                            </p>
                            {q.solution && (
                              <p>
                                <span className="font-bold">Solution:</span>{" "}
                                <span className="text-gray-400 italic line-clamp-1">
                                  {renderQuestionText(q.solution)}
                                </span>
                              </p>
                            )}
                            <p>
                              <span className="font-bold text-[#1a7a5e]">
                                Positive Marks:
                              </span>{" "}
                              {q.positiveMarks}
                            </p>
                            <p>
                              <span className="font-bold text-red-500">
                                Negative Marks:
                              </span>{" "}
                              {q.negativeMarks || 0}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (format === "format2") {
                      return (
                        <div
                          key={idx}
                          className="px-5 py-6 hover:bg-gray-50/50 transition-colors border-l-4 border-transparent hover:border-black space-y-3 font-serif"
                        >
                          <div className="flex gap-2">
                            <span className="font-bold text-[13px] text-gray-900 shrink-0">
                              {idx + 1}.
                            </span>
                            <div className="space-y-1 flex-1">
                              <p className="text-[12px] font-medium text-gray-800 leading-relaxed">
                                {renderQuestionText(q.questionEn)}
                              </p>
                              <p className="text-[12px] font-medium text-gray-600 leading-relaxed">
                                {renderQuestionText(q.questionHi)}
                              </p>
                            </div>
                          </div>
                          <div className="pl-8 space-y-1 font-sans">
                            {q.options.map((opt: string, i: number) => (
                              <div
                                key={i}
                                className="flex gap-2 text-[11px] text-gray-500"
                              >
                                <span className="font-bold">
                                  {String.fromCharCode(65 + i)}.
                                </span>
                                <span>{renderQuestionText(opt)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pl-8 space-y-2 text-[11px] text-gray-700 pt-2 font-sans">
                            <p>
                              <span className="font-bold">Answer</span>{" "}
                              {q.correctAnswer}
                            </p>
                            <p className="font-bold">Solution.</p>
                            <div className="text-[11px] text-gray-500 space-y-1">
                              {q.solution
                                ?.split("\n")
                                .map((line: string, li: number) => (
                                  <p
                                    key={li}
                                    className="line-clamp-1 opacity-70"
                                  >
                                    • {line}
                                  </p>
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (format === "format3") {
                      return (
                        <div
                          key={idx}
                          className="px-5 py-4 hover:bg-blue-50/30 transition-colors border-b border-gray-100"
                        >
                          <div className="bg-gray-50 px-3 py-1.5 rounded-md flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase">
                              Question {idx + 1}
                            </span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                              GRID STYLE
                            </span>
                          </div>
                          <p className="text-[13px] font-bold text-gray-800 mb-4">
                            {renderQuestionText(q.questionEn)}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {q.options.map((o: string, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg bg-white shadow-sm"
                              >
                                <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] font-bold text-gray-500">
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span className="text-[11px] text-gray-600 font-medium truncate">
                                  {renderQuestionText(o)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center gap-4 text-[10px]">
                            <span className="font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded">
                              ANS: {q.correctAnswer}
                            </span>
                            <span className="text-gray-400 italic shrink-0">
                              Solution:{" "}
                              {renderQuestionText(q.solution).slice(0, 30)}...
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (format === "format4") {
                      return (
                        <div
                          key={idx}
                          className="px-5 py-6 hover:bg-gray-50 transition-colors border-l-4 border-blue-500 bg-white"
                        >
                          <div className="flex gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 border border-gray-200 shadow-inner">
                              <span className="material-symbols-outlined text-gray-300">
                                image
                              </span>
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-[13px] font-black text-gray-900 leading-tight line-clamp-2">
                                {renderQuestionText(q.questionEn)}
                              </p>
                              <div className="space-y-1">
                                {q.options.map((o: string, i: number) => (
                                  <div
                                    key={i}
                                    className="flex gap-2 text-[11px] text-gray-500 font-medium"
                                  >
                                    <span className="text-blue-500">
                                      {String.fromCharCode(97 + i)}.
                                    </span>
                                    <span>{renderQuestionText(o)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-gray-800 uppercase tracking-widest">
                              Answer Key: {q.correctAnswer}
                            </span>
                            <span className="text-[#1a7a5e] font-black">
                              +{q.positiveMarks} Marks
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (format === "format5") {
                      return (
                        <div
                          key={idx}
                          className="m-3 bg-[#ecfdf5]/30 border border-emerald-100 rounded-2xl overflow-hidden hover:shadow-md transition-all"
                        >
                          <div className="bg-emerald-600 px-4 py-2 flex justify-between items-center text-white">
                            <span className="text-[11px] font-black uppercase tracking-tighter">
                              EXPERT SOLUTION #{idx + 1}
                            </span>
                            <span className="text-[10px] font-bold opacity-80">
                              {q.type || "MCQ"}
                            </span>
                          </div>
                          <div className="p-4 space-y-4">
                            <div className="space-y-1">
                              <p className="text-[12px] font-bold text-emerald-950">
                                {renderQuestionText(q.questionEn)}
                              </p>
                              <p className="text-[10px] text-emerald-600/70 font-medium italic">
                                {renderQuestionText(q.questionHi)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              {q.options.map((o: string, i: number) => (
                                <div
                                  key={i}
                                  className="flex gap-3 items-center py-1.5 px-3 bg-white/50 rounded-lg text-[11px] text-emerald-800 font-bold border border-emerald-50"
                                >
                                  <span className="w-4 text-emerald-300">
                                    {String.fromCharCode(65 + i)}
                                  </span>
                                  <span>{renderQuestionText(o)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-2">
                              <p className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  psychology
                                </span>
                                DETAILED EXPLANATION
                              </p>
                              <p className="text-[11px] text-gray-500 leading-relaxed italic">
                                {renderQuestionText(q.solution)}
                              </p>
                              <div className="pt-2 flex gap-4 text-[10px] font-black text-emerald-600">
                                <span>CORRECT: {q.correctAnswer}</span>
                                <span>WEIGHTAGE: {q.positiveMarks}M</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Default (Table Style)
                    return (
                      <div
                        key={idx}
                        className="px-4 py-3 hover:bg-gray-50/50 transition-colors group"
                      >
                        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
                          <div className="flex border-b border-gray-100">
                            <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                              Question
                            </div>
                            <div className="p-2.5 text-[12px] font-bold text-gray-800 flex-1 leading-relaxed">
                              {renderQuestionText(q.questionEn)}
                            </div>
                          </div>
                          <div className="flex border-b border-gray-100">
                            <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                              Type
                            </div>
                            <div className="p-2.5 text-[11px] text-gray-600 font-bold">
                              {q.type || "multiple_choice"}
                            </div>
                          </div>
                          {q.options.map((o: string, i: number) => (
                            <div
                              key={i}
                              className="flex border-b border-gray-100 last:border-b-0"
                            >
                              <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                                Option
                              </div>
                              <div className="p-2.5 text-[11px] text-gray-700 font-bold flex gap-2">
                                <span className="text-gray-300">
                                  {String.fromCharCode(65 + i)}.
                                </span>
                                {renderQuestionText(o)}
                              </div>
                            </div>
                          ))}
                          <div className="flex border-t border-gray-100 bg-[#f8fffe]">
                            <div className="w-24 bg-[#f0f9f7] p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                              Answer
                            </div>
                            <div className="p-2.5 text-[11px] text-emerald-700 font-black">
                              {q.correctAnswer}
                            </div>
                          </div>
                          <div className="flex border-t border-gray-100">
                            <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                              Solution
                            </div>
                            <div className="p-2.5 text-[11px] text-gray-500 italic flex-1">
                              {renderQuestionText(q.solution)}
                            </div>
                          </div>
                          <div className="flex border-t border-gray-100">
                            <div className="flex-1 flex border-r border-gray-100">
                              <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0 whitespace-nowrap">
                                Positive Marks
                              </div>
                              <div className="p-2.5 text-[11px] text-green-600 font-black">
                                {q.positiveMarks}
                              </div>
                            </div>
                            <div className="flex-1 flex">
                              <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0 whitespace-nowrap">
                                Negative Marks
                              </div>
                              <div className="p-2.5 text-[11px] text-red-500 font-black">
                                {q.negativeMarks}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                  : !isParsing && (
                    <div className="py-20 text-center space-y-3">
                      <span className="material-symbols-outlined text-[48px] text-gray-200">
                        find_in_page
                      </span>
                      <p className="text-[13px] font-medium text-gray-400">
                        No questions found in this file.
                        <br />
                        Try DOCX or Excel format.
                      </p>
                    </div>
                  )}
              </div>

              {/* Footer action */}
              <div className="px-4 py-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    const testId = bulkUploadData.testTitle;
                    if (!bulkUploadData.testSeries) {
                      showToast("Please select Test Series", "error");
                      return;
                    }
                    if (!testId) {
                      showToast("Please select Test Title", "error");
                      return;
                    }
                    if (!bulkUploadData.file) {
                      showToast("Please select a file to upload", "error");
                      return;
                    }

                    try {
                      // Fetch existing questions for duplicate check
                      const existingQuestions =
                        await testsAPI.getQuestions(testId);
                      const existingTexts = new Set(
                        existingQuestions.map((q: any) =>
                          (q.questionEn || q.question || "")
                            .trim()
                            .toLowerCase(),
                        ),
                      );

                      const selectedFormat = bulkUploadData.format || "default";
                      const questionsToUpload = previewQuestions
                        .filter(
                          (q) =>
                            !existingTexts.has(
                              (q.questionEn || "").trim().toLowerCase(),
                            ),
                        )
                        .map((q) => ({
                          testId: testId,
                          courseId: bulkUploadData.testSeries,
                          questionEn: q.questionEn,
                          questionHi: q.questionHi || "",
                          type: "Multiple Choice Question",
                          marks: q.positiveMarks || 4,
                          negative: q.negativeMarks || -1,
                          displayOptions: (q.options || []).map(
                            (opt: string, i: number) => ({
                              id: i + 1,
                              text: opt,
                              isCorrect:
                                q.correctAnswer === String.fromCharCode(65 + i),
                            }),
                          ),
                          solution: {
                            heading: "Full Solution",
                            text: q.solution || "",
                          },
                          format: selectedFormat,
                        }));

                      if (
                        questionsToUpload.length === 0 &&
                        previewQuestions.length > 0
                      ) {
                        showToast(
                          "All parsed questions already exist in this test.",
                          "error",
                        );
                        return;
                      }

                      const res = await fetch("/api/questions/bulk", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ questions: questionsToUpload }),
                      });

                      if (!res.ok) throw new Error("Upload failed");

                      // Update the Test document to save the selected viewFormat
                      try {
                        await fetch(`/api/tests/${testId}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ viewFormat: selectedFormat }),
                        });
                      } catch (err) {
                        console.warn("Could not update test format:", err);
                      }

                      // Invalidate local cache to force refresh
                      invalidateCache("tests");
                      showToast(
                        `Successfully uploaded ${questionsToUpload.length} new questions!`,
                      );
                      if (questionsToUpload.length < previewQuestions.length) {
                        showToast(
                          `${previewQuestions.length - questionsToUpload.length} duplicates were skipped.`,
                          "success",
                        );
                      }

                      setBulkUploadData({ ...bulkUploadData, file: null });

                      // Auto-redirect to the Test to show newly uploaded questions
                      const targetTest = tests.find(
                        (t) => (t.id || (t as any)._id) === testId,
                      );
                      if (targetTest) {
                        const targetSeries = courses.find(
                          (c) =>
                            (c.id || (c as any)._id) ===
                            bulkUploadData.testSeries,
                        );
                        if (targetSeries) setViewingTestSeries(targetSeries);
                        setViewingQuestionEditor(targetTest);
                        setActiveTab("Tests");
                      }

                      loadData();
                    } catch (e) {
                      console.error("Final upload error:", e);
                      showToast("Failed to upload questions", "error");
                    }
                  }}
                  className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold text-[12px] uppercase tracking-tighter transition-all active:scale-[0.98]"
                >
                  PROCEED TO UPLOAD ({previewQuestions.length} Questions)
                </button>

                <button
                  onClick={() =>
                    generateDOCX(
                      previewQuestions,
                      bulkUploadData.format,
                      `Paper_${bulkUploadData.file?.name}.docx`,
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-gray-100 text-[#1a7a5e] hover:bg-[#1a7a5e]/5 transition-all duration-300 font-bold text-[12px] rounded-xl uppercase tracking-tighter active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    file_download
                  </span>
                  DOWNLOAD
                </button>
              </div>
            </div>
          )}
        </div>

        {viewingPaperQuestions && (
          <div className="fixed inset-0 z-[1000] bg-white">
            <QuestionPaperRenderer
              questions={viewingPaperQuestions}
              onClose={() => setViewingPaperQuestions(null)}
              initialFormat={
                (activeTab === "Bulk Uploader"
                  ? bulkUploadData.format
                  : "default") as any
              }
            />
          </div>
        )}
      </div>
    );
  };

  const renderCopyContentTab = () => {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        {/* Selector Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6">
          <div className="flex items-center gap-6">
            <label className="text-[14px] font-medium text-gray-700">
              Content Type
            </label>
            <div className="w-[200px] relative z-[90]">
              <CustomDropdown
                options={[
                  { value: "copy_questions", label: "Copy Questions" },
                  { value: "copy_tests", label: "Copy Tests" },
                  { value: "copy_pdf_tests", label: "Copy PDF Tests" },
                ]}
                value={selectedContentType}
                onChange={(val: any) => setSelectedContentType(val)}
                placeholder="Select"
              />
            </div>
          </div>
        </div>

        {selectedContentType === "copy_tests" && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
            <div className="space-y-4">
              {/* Alert Message */}
              <div className="bg-[#FFEFEF] border border-[#FFDADA] rounded-xl px-6 py-3">
                <p className="text-[12px] font-medium text-[#E84E4E]">
                  <span className="font-bold">Note :-</span> Please be careful
                  while using this feature. Test Title & Questions added
                  accidentally using this will have to be removed individually
                  and manually.
                </p>
              </div>
            </div>

            {/* Source Section */}
            <div className="bg-[#F8F9FB] border border-gray-100 rounded-[1.5rem] p-6 space-y-6">
              <div className="bg-[#FFF8E6] rounded-xl px-6 py-4">
                <h4 className="text-[15px] font-bold text-[#856404]">Source</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Series/Quiz Series *
                  </label>
                  <CustomDropdown
                    options={courses.map((c) => ({
                      value: c.id || (c as any)._id,
                      label: c.name || c.title || "",
                    }))}
                    value={copyTestsData.sourceSeries}
                    onChange={(val: any) =>
                      setCopyTestsData({ ...copyTestsData, sourceSeries: val })
                    }
                    placeholder="Select Test Series"
                    searchPlaceholder="Search"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Subject
                  </label>
                  <CustomDropdown
                    isMulti
                    options={[
                      {
                        value: "General Knowledge",
                        label: "General Knowledge",
                      },
                      { value: "Mathematics", label: "Mathematics" },
                      { value: "Reasoning", label: "Reasoning" },
                      { value: "English", label: "English" },
                      { value: "Physics", label: "Physics" },
                    ]}
                    value={copyTestsData.sourceSubject}
                    onChange={(val: any) =>
                      setCopyTestsData({ ...copyTestsData, sourceSubject: val })
                    }
                    placeholder="--Select Subject--"
                    searchPlaceholder="Searching..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Title / Quiz Title*
                  </label>
                  <CustomDropdown
                    isMulti
                    showSelectAll
                    options={tests
                      .filter(
                        (t) =>
                          !copyTestsData.sourceSeries ||
                          t.courseId === copyTestsData.sourceSeries ||
                          (t as any)._id === copyTestsData.sourceSeries,
                      )
                      .map((t) => ({
                        value: t.id || (t as any)._id,
                        label: t.name || "Unnamed Test",
                      }))}
                    value={copyTestsData.sourceTitleSearch}
                    onChange={(val: any) =>
                      setCopyTestsData({
                        ...copyTestsData,
                        sourceTitleSearch: val,
                      })
                    }
                    placeholder="Search"
                    searchPlaceholder="Searching..."
                  />
                </div>
              </div>
            </div>

            {/* Target Section */}
            <div className="bg-[#F8F9FB] border border-gray-100 rounded-[1.5rem] p-6 space-y-6">
              <div className="bg-[#E9F7EF] rounded-xl px-6 py-4">
                <h4 className="text-[15px] font-bold text-[#155724]">Target</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Series/Quiz Series *
                  </label>
                  <CustomDropdown
                    isMulti
                    showSelectAll
                    dropup
                    options={courses.map((c) => ({
                      value: c.id || (c as any)._id,
                      label: c.name || c.title || "",
                    }))}
                    value={copyTestsData.targetSeriesSearch}
                    onChange={(val: any) =>
                      setCopyTestsData({
                        ...copyTestsData,
                        targetSeriesSearch: val,
                      })
                    }
                    placeholder="Search"
                    searchPlaceholder="Search"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Subject
                  </label>
                  <CustomDropdown
                    options={[
                      "General Knowledge",
                      "Mathematics",
                      "Reasoning",
                      "English",
                    ].map((s) => ({ value: s, label: s }))}
                    value={copyTestsData.targetSubject}
                    onChange={(val: any) =>
                      setCopyTestsData({ ...copyTestsData, targetSubject: val })
                    }
                    placeholder="--Select Subject--"
                    dropup
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                showToast("Copying tests... This may take a moment.")
              }
              className="bg-[#4361EE] text-white px-8 py-2.5 rounded-lg font-bold text-[14px] hover:bg-[#3451DE] transition-colors shadow-lg active:scale-95"
            >
              Submit
            </button>
          </div>
        )}

        {selectedContentType === "copy_questions" && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
            <div className="space-y-4">
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-[0.1em]">
                COPY PASTE TEST SERIES QUESTION
              </h3>

              {/* Alert Message */}
              <div className="bg-[#FFEFEF] border border-[#FFDADA] rounded-xl px-6 py-3">
                <p className="text-[12px] font-medium text-[#E84E4E]">
                  <span className="font-bold">Note :-</span> Please be careful
                  while using this feature. Test Title & Questions added
                  accidentally using this will have to be removed individually
                  and manually.
                </p>
              </div>
            </div>

            {/* Source Section */}
            <div className="bg-[#F8F9FB] border border-gray-100 rounded-[1.5rem] p-6 space-y-6">
              <div className="bg-[#FFF8E6] rounded-xl px-6 py-4">
                <h4 className="text-[15px] font-bold text-[#856404]">Source</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Series / Quiz Series *
                  </label>
                  <CustomDropdown
                    options={courses.map((c) => ({
                      value: c.id || (c as any)._id,
                      label: c.name || c.title || "",
                    }))}
                    value={copyData.sourceSeries}
                    onChange={(val: any) =>
                      setCopyData({
                        ...copyData,
                        sourceSeries: val,
                        sourceTitle: "",
                      })
                    }
                    placeholder="Select Test Series"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Title / Quiz Title*
                  </label>
                  <CustomDropdown
                    options={tests
                      .filter(
                        (t) =>
                          !copyData.sourceSeries ||
                          t.courseId === copyData.sourceSeries ||
                          (t as any)._id === copyData.sourceSeries ||
                          t.courseName === copyData.sourceSeries,
                      )
                      .map((t) => ({
                        value: t.id || (t as any)._id,
                        label: t.name || "Unnamed Test",
                      }))}
                    value={copyData.sourceTitle}
                    onChange={(val: any) =>
                      setCopyData({ ...copyData, sourceTitle: val })
                    }
                    placeholder="Select Test Title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Section / Quiz Section *
                  </label>
                  <CustomDropdown
                    options={[
                      { value: "section_1", label: "Section 1" },
                      { value: "section_2", label: "Section 2" },
                    ]}
                    value={copyData.sourceSection}
                    onChange={(val: any) =>
                      setCopyData({ ...copyData, sourceSection: val })
                    }
                    placeholder="Select Test Section"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Question / Quiz Question
                  </label>
                  <CustomDropdown
                    isMulti
                    showSelectAll
                    selectAllVariant="buttons"
                    options={[
                      { value: "all", label: "All Questions" },
                      { value: "q1", label: "Section 1 - Q1" },
                      { value: "q2", label: "Section 1 - Q2" },
                    ]}
                    value={copyData.sourceSearch}
                    onChange={(val: any) =>
                      setCopyData({ ...copyData, sourceSearch: val })
                    }
                    placeholder="Search"
                    searchPlaceholder="Search"
                  />
                </div>
              </div>
            </div>

            {/* Target Section */}
            <div className="bg-[#F8F9FB] border border-gray-100 rounded-[1.5rem] p-6 space-y-6">
              <div className="bg-[#E9F7EF] rounded-xl px-6 py-4">
                <h4 className="text-[15px] font-bold text-[#155724]">Target</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Series / Quiz Series *
                  </label>
                  <CustomDropdown
                    options={courses.map((c) => ({
                      value: c.id || (c as any)._id,
                      label: c.name || c.title || "",
                    }))}
                    value={copyData.targetSeries}
                    onChange={(val: any) =>
                      setCopyData({
                        ...copyData,
                        targetSeries: val,
                        targetTitle: "",
                      })
                    }
                    placeholder="Select Test Series"
                    dropup={true}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Title / Quiz Title*
                  </label>
                  <CustomDropdown
                    options={tests
                      .filter(
                        (t) =>
                          !copyData.targetSeries ||
                          t.courseId === copyData.targetSeries ||
                          (t as any)._id === copyData.targetSeries ||
                          t.courseName === copyData.targetSeries,
                      )
                      .map((t) => ({
                        value: t.id || (t as any)._id,
                        label: t.name || "Unnamed Test",
                      }))}
                    value={copyData.targetTitle}
                    onChange={(val: any) =>
                      setCopyData({ ...copyData, targetTitle: val })
                    }
                    placeholder="Select Test Title"
                    dropup={true}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => showToast("Copying questions... Please wait.")}
              className="bg-[#4361EE] text-white px-8 py-2.5 rounded-lg font-bold text-[14px] hover:bg-[#3451DE] transition-colors shadow-lg active:scale-95"
            >
              Submit
            </button>
          </div>
        )}

        {selectedContentType === "copy_pdf_tests" && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
            {/* Alert Message */}
            <div className="bg-[#FFEFEF] border border-[#FFDADA] rounded-xl px-6 py-3">
              <p className="text-[12px] font-medium text-[#E84E4E]">
                <span className="font-bold">Note :-</span> Please be careful
                while using this feature. Test PDF added accidentally using this
                will have to be removed individually and manually.
              </p>
            </div>

            {/* Source Section */}
            <div className="bg-[#F8F9FB] border border-gray-100 rounded-[1.5rem] p-6 space-y-6">
              <div className="bg-[#FFF8E6] rounded-xl px-6 py-4">
                <h4 className="text-[15px] font-bold text-[#856404]">Source</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Series/Quiz Series *
                  </label>
                  <CustomDropdown
                    options={courses.map((c) => ({
                      value: c.id || (c as any)._id,
                      label: c.name || c.title || "",
                    }))}
                    value={copyPdfData.sourceSeries}
                    onChange={(val: any) =>
                      setCopyPdfData({
                        ...copyPdfData,
                        sourceSeries: val,
                        sourcePdf: [],
                      })
                    }
                    placeholder="Select Test Series"
                    searchPlaceholder="Search"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test PDF / Quiz PDF*
                  </label>
                  <CustomDropdown
                    isMulti
                    showSelectAll
                    selectAllVariant="buttons"
                    options={courses
                      .filter(
                        (c) =>
                          !copyPdfData.sourceSeries ||
                          c.id === copyPdfData.sourceSeries ||
                          (c as any)._id === copyPdfData.sourceSeries,
                      )
                      .map((c) => ({
                        value: c.id || (c as any)._id,
                        label: c.name || c.title || "Select Test PDF",
                      }))}
                    value={copyPdfData.sourcePdf}
                    onChange={(val: any) =>
                      setCopyPdfData({ ...copyPdfData, sourcePdf: val })
                    }
                    placeholder="Search"
                    searchPlaceholder="Search"
                  />
                </div>
              </div>
            </div>

            {/* Target Section */}
            <div className="bg-[#F8F9FB] border border-gray-100 rounded-[1.5rem] p-6 space-y-6">
              <div className="bg-[#E9F7EF] rounded-xl px-6 py-4">
                <h4 className="text-[15px] font-bold text-[#155724]">Target</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500">
                    Test Series / Quiz Series*
                  </label>
                  <CustomDropdown
                    options={courses.map((c) => ({
                      value: c.id || (c as any)._id,
                      label: c.name || c.title || "",
                    }))}
                    value={copyPdfData.targetSeries}
                    onChange={(val: any) =>
                      setCopyPdfData({ ...copyPdfData, targetSeries: val })
                    }
                    placeholder="Search"
                    searchPlaceholder="Search"
                    dropup
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => showToast("Syncing PDF content...")}
              className="bg-[#4361EE] text-white px-8 py-2.5 rounded-lg font-bold text-[14px] hover:bg-[#3451DE] transition-colors shadow-lg active:scale-95"
            >
              Submit
            </button>
          </div>
        )}
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
        renderResultsTab()
      ) : activeTab === "Copy Content" ? (
        renderCopyContentTab()
      ) : activeTab === "Bulk Uploader" ? (
        renderBulkUploaderTab()
      ) : activeTab === "Reported Questions" ? (
        renderReportedQuestionsTab()
      ) : activeTab === "Question Library" ? (
        renderQuestionLibraryTab()
      ) : activeTab === "Topics" ? (
        <Topics showToast={showToast} />
      ) : viewingTestSeries ? (
        renderTestSeriesDetail()
      ) : (
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
                    <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                      <div className="flex items-center gap-1.5 cursor-pointer group uppercase">
                        Questions{" "}
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
                      <td colSpan={7} className="px-8 py-20 text-center">
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
                            className="hover:text-blue-600 transition-all text-left leading-snug"
                          >
                            {test.name || test.title}
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
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5 text-[13px] font-bold">
                            <span className="text-gray-800">
                              {Array.isArray((test as any).questions)
                                ? (test as any).questions.length
                                : Number((test as any).questions) || 0}
                            </span>
                            <span className="text-gray-300">/</span>
                            <span className="text-[12px] font-medium text-gray-500">
                              {Number((test as any).noOfQuestions) ||
                                Number((test as any).questions) ||
                                0}
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
                              <div className={`absolute right-0 ${paginatedTests.length > 3 ? (index >= paginatedTests.length - 2 ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right") : index >= paginatedTests.length - 1 ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"} w-[180px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[9999] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right`}>
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

            <div className="px-6 py-5 flex items-center justify-between bg-white border-t border-gray-50">
              <div className="text-[13px] font-semibold text-[#4a5568]">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredTests.length)} of{" "}
                {filteredTests.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    chevron_left
                  </span>
                </button>

                <div className="flex items-center justify-center w-6 h-6 bg-[#1a202c] text-white rounded-[4px] text-[12px] font-bold shadow-sm">
                  {currentPage}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <AddTestDrawer
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editingTest={editingTest}
        courses={[
          ...courses.map((c) => ({ ...c, id: c.id || c._id })),
          ...tests.filter((t) => t.isSeries).map((t) => ({ ...t, id: t.id })),
        ]}
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
        subjects={[
          { value: "Physics", label: "Physics" },
          { value: "Chemistry", label: "Chemistry" },
          { value: "Mathematics", label: "Mathematics" },
          { value: "Biology", label: "Biology" },
          { value: "English", label: "English" },
          { value: "General Knowledge", label: "General Knowledge" },
        ]}
        testSeriesOptions={[
          ...courses.map((c) => ({
            value: c.id,
            label: `Cat: ${c.name || c.title || ""}`,
          })),
          ...tests
            .filter((t) => t.isSeries)
            .map((t) => ({ value: t.id, label: `Series: ${t.name || ""}` })),
        ]}
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
      {showSortModal && (
        <div className="fixed inset-0 bg-black/40 z-[100000] flex items-center justify-center backdrop-blur-[2px] animate-in fade-in duration-300 p-6">
          <div className="w-full max-w-[750px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
              <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">
                Sort Question Order
              </h3>
              <button
                onClick={() => setShowSortModal(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all"
              >
                <span className="material-symbols-outlined font-bold">
                  close
                </span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={editorQuestions.map((q) => q.id || q._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {editorQuestions.map((q, idx) => (
                      <SortableQuestionItem
                        key={q.id || q._id || idx}
                        id={q.id || q._id}
                        question={q}
                        index={idx}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {editorQuestions.length === 0 && (
                <div className="py-20 text-center">
                  <span className="material-symbols-outlined text-gray-200 text-6xl">
                    quiz
                  </span>
                  <p className="text-gray-400 mt-4 font-medium">
                    No questions available to sort
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowSortModal(false)}
                className="px-8 py-2.5 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
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
                disabled={editorQuestions.length === 0}
                className="px-10 py-2.5 bg-[#4F46E5] text-white text-[13px] font-bold rounded-lg hover:bg-[#4338CA] transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                Save Order
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Question Drawer */}
      <AddQuestionDrawer
        isOpen={!!viewingAddQuestionForm}
        onClose={() => setViewingAddQuestionForm(null)}
        onSubmit={(data) => {
          handleSaveQuestion(data);
        }}
        editingQuestion={
          viewingAddQuestionForm &&
            typeof viewingAddQuestionForm === "object" &&
            Object.keys(viewingAddQuestionForm).length > 0
            ? viewingAddQuestionForm
            : null
        }
        sections={[
          { id: "default", name: viewingQuestionEditor?.name || "Default" },
        ]}
        testId={viewingQuestionEditor?.id || viewingQuestionEditor?._id || ""}
        onSaveAndGoToPrevious={(data) => {
          handleSaveQuestion(data).then(() => {
            // Find current question index and go to previous
            const currentId = data.id || data._id;
            const currentIdx = editorQuestions.findIndex(
              (q: any) => (q.id || q._id) === currentId,
            );
            if (currentIdx > 0) {
              setViewingAddQuestionForm(editorQuestions[currentIdx - 1]);
            } else {
              showToast("This is the first question", "error");
              setViewingAddQuestionForm(null);
            }
          });
        }}
        onSaveAndGoToNext={(data) => {
          handleSaveQuestion(data).then(() => {
            // Find current question index and go to next
            const currentId = data.id || data._id;
            const currentIdx = editorQuestions.findIndex(
              (q: any) => (q.id || q._id) === currentId,
            );
            if (currentIdx < editorQuestions.length - 1) {
              setViewingAddQuestionForm(editorQuestions[currentIdx + 1]);
            } else {
              showToast("This is the last question", "error");
              setViewingAddQuestionForm(null);
            }
          });
        }}
      />

      <ImportGlobalLibraryDrawer
        isOpen={showImportLibraryDrawer}
        onClose={() => setShowImportLibraryDrawer(false)}
        onImport={async (selectedQuestions) => {
          const testId =
            viewingQuestionEditor?.id || viewingQuestionEditor?._id;
          if (!testId) return;

          try {
            showToast(
              `Importing ${selectedQuestions.length} questions...`,
              "success",
            );

            const importPromises = selectedQuestions.map((q) => {
              const payload = {
                testId: testId,
                questionEn: q.textEn || q.questionEn,
                questionHi: q.textHi || q.questionHi || "",
                type: q.type || "Multiple Choice Question",
                marks: q.marks || 4,
                negative: q.negative || -1,
                displayOptions: q.options
                  ? q.options.map((opt: string, i: number) => ({
                    id: i + 1,
                    text: opt,
                    isCorrect:
                      q.correctAnswer === String.fromCharCode(65 + i),
                  }))
                  : q.displayOptions || [],
                solution: {
                  heading: "Full Solution",
                  text: q.solution || "",
                },
              };
              return questionsAPI.create(payload);
            });

            await Promise.all(importPromises);
            invalidateCache("tests");

            const qs = await testsAPI.getQuestions(testId);
            setEditorQuestions(qs);
            showToast("Questions imported successfully", "success");
          } catch (err: any) {
            showToast(err.message || "Failed to import questions", "error");
          }
        }}
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
