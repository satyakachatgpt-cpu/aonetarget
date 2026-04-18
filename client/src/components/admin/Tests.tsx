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

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import AddTestDrawer from "./AddTestDrawer";
import AddSingleTestDrawer from "./AddSingleTestDrawer";
import AddTestPDFDrawer from "./AddTestPDFDrawer";
import SubjectiveTestDrawer from "./SubjectiveTestDrawer";
import BulkEditQuestionsDrawer from "./BulkEditQuestionsDrawer";
import AddTestPDFBulkDrawer from "./AddTestPDFBulkDrawer";
import ViewFormatModal from "./ViewFormatModal";
import AddQuestionDrawer from "./AddQuestionDrawer";

import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { generateDOCX } from "./DOCXGenerator";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "5.5.207"}/build/pdf.worker.min.mjs`;

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



const SortableRow = ({ q, idx, setViewingAddQuestionForm, handleDeleteQuestion, viewingQuestionEditor }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: q.id || q._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`${isDragging ? 'bg-blue-50' : 'bg-white'} border-b border-gray-50 hover:bg-gray-50/80 transition-all group`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
           <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-black transition-colors focus:outline-none">
             <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
           </div>
           <span className="text-[13px] font-bold text-gray-400">{idx + 1}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-[14px] font-bold text-gray-700 max-w-2xl line-clamp-2">
          {q.questionEn || "No question text"}
        </div>
      </td>
    </tr>
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
  const [uploadProgress, setUploadProgress] = useState(0); // Added for progress visibility
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = editorQuestions.findIndex((q: any) => (q.id || q._id) === active.id);
      const newIndex = editorQuestions.findIndex((q: any) => (q.id || q._id) === over.id);

      const updatedQuestions = arrayMove(editorQuestions, oldIndex, newIndex);
      
      try {
        setEditorQuestions(updatedQuestions);
        // Save the reordered list to Test document
        const testId = viewingQuestionEditor?.id || viewingQuestionEditor?._id;
        if (testId) {
          await testsAPI.update(testId, {
            ...viewingQuestionEditor,
            questions: updatedQuestions
          });
          showToast("Order updated successfully", "success");
        }
      } catch (err) {
        showToast("Failed to save new order", "error");
        // Revert on failure
        const originalQs = await testsAPI.getQuestions(viewingQuestionEditor?.id || viewingQuestionEditor?._id);
        setEditorQuestions(originalQs);
      }
    }
  };

  const [bulkUploadData, setBulkUploadData] = useState<{
    testSeries: string;
    testTitle: string;
    format: string;
    file: File | null;
    parsedQuestions: any[];
    extractedImages: string[];
    uploadMode: 'append' | 'replace';
  }>({
    testSeries: "",
    testTitle: "",
    format: "default",
    file: null,
    parsedQuestions: [],
    extractedImages: [],
    uploadMode: 'append',
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

  async function parseFile(file: File): Promise<{ questions: any[], extractedImages: string[] }> {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (extension === "docx") {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return { questions: extractQuestionsFromText(result.value), extractedImages: [] };
      } catch (err) {
        console.error("DOCX parsing error:", err);
        return { questions: [], extractedImages: [] };
      }
    } else if (extension === "xlsx" || extension === "xls") {
      try {
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const parsedQuestions = jsonData.map((row: any, idx) => ({
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
          ].filter(Boolean),
          correctAnswer:
            row.CorrectAnswer || row.correct || row.Answer || row.answer,
          solution: row.Solution || row.solution || row.Explanation || "",
          positiveMarks: Number(row.Marks || row.marks || 4),
          negativeMarks: Number(row.Negative || row.negative || 1),
        }));
        
        return { questions: parsedQuestions, extractedImages: [] };
      } catch (err) {
        console.error("Excel parsing error:", err);
        return { questions: [], extractedImages: [] };
      }
    } else if (extension === "pdf") {
      try {
        console.log("Starting PDF parsing for:", file.name);
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        // pageMap: stores start char index per page for question-to-page mapping
        const pageMap: { startIndex: number; pageNumber: number; embeddedImages: { dataUrl: string; y: number }[]; pageDataUrl: string }[] = [];
        const allExtractedImages: string[] = [];

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

          // Extract embedded images (XObjects) from PDF page using operator list
          const embeddedImages: { dataUrl: string; y: number }[] = [];
          try {
            const opList = await (page as any).getOperatorList();
            const commonObjs = (page as any).commonObjs;
            const objs = (page as any).objs;

            // Track current transform matrix to get image Y position
            const fnArray = opList.fnArray as number[];
            const argsArray = opList.argsArray as any[][];
            let currentY = 0;

            for (let opIdx = 0; opIdx < fnArray.length; opIdx++) {
              const fn = fnArray[opIdx];
              const args = argsArray[opIdx];

              // OPS.transform = 12, captures current matrix [a,b,c,d,e,f] → f is Y
              if (fn === 12 && args && args.length >= 6) {
                currentY = args[5];
              }

              // OPS.paintImageXObject = 85 or paintImageMaskXObject = 84
              if ((fn === 85 || fn === 84) && args && args[0]) {
                const imgName = args[0];
                // Try to get image from page objects
                const imgObj = objs.has && objs.has(imgName) ? objs.get(imgName) :
                               (commonObjs.has && commonObjs.has(imgName) ? commonObjs.get(imgName) : null);

                if (imgObj && imgObj.data && imgObj.width && imgObj.height) {
                  try {
                    // Render this image to a small canvas
                    const imgCanvas = document.createElement('canvas');
                    imgCanvas.width = imgObj.width;
                    imgCanvas.height = imgObj.height;
                    const imgCtx = imgCanvas.getContext('2d');
                    if (imgCtx) {
                      const imageData = imgCtx.createImageData(imgObj.width, imgObj.height);
                      // pdfjs image data is RGBA or grayscale — handle both
                      if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                        imageData.data.set(imgObj.data);
                      } else if (imgObj.data.length === imgObj.width * imgObj.height) {
                        // Grayscale → RGBA
                        for (let px = 0; px < imgObj.width * imgObj.height; px++) {
                          const v = imgObj.data[px];
                          imageData.data[px * 4] = v;
                          imageData.data[px * 4 + 1] = v;
                          imageData.data[px * 4 + 2] = v;
                          imageData.data[px * 4 + 3] = 255;
                        }
                      } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                        // RGB → RGBA
                        for (let px = 0; px < imgObj.width * imgObj.height; px++) {
                          imageData.data[px * 4] = imgObj.data[px * 3];
                          imageData.data[px * 4 + 1] = imgObj.data[px * 3 + 1];
                          imageData.data[px * 4 + 2] = imgObj.data[px * 3 + 2];
                          imageData.data[px * 4 + 3] = 255;
                        }
                      }
                      imgCtx.putImageData(imageData, 0, 0);
                      // Only keep images large enough to be a real diagram (skip tiny icons/bullets)
                      if (imgObj.width > 60 && imgObj.height > 60) {
                        const dataUrl = imgCanvas.toDataURL('image/jpeg', 0.75);
                        embeddedImages.push({
                          dataUrl,
                          y: currentY
                        });
                        if (!allExtractedImages.includes(dataUrl)) {
                          allExtractedImages.push(dataUrl);
                        }
                      }
                    }
                  } catch (imgErr) {
                    // skip this image silently
                  }
                }
              }
            }
          } catch (opErr) {
            console.warn(`Could not extract images from page ${i}:`, opErr);
          }

          // Normalize page text to ensure indexing consistency with extractQuestionsFromText
          const normalizedPageText = pageText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

          // Render page to a small compressed JPEG for diagram-option questions
          // (scale 1.0, JPEG 50% quality → ~100-200KB per page)
          let pageDataUrl = "";
          try {
            const viewport = page.getViewport({ scale: 1.0 });
            const renderCanvas = document.createElement('canvas');
            renderCanvas.width = viewport.width;
            renderCanvas.height = viewport.height;
            const renderCtx = renderCanvas.getContext('2d');
            if (renderCtx) {
              await (page as any).render({ canvasContext: renderCtx, viewport, canvas: renderCanvas }).promise;
              pageDataUrl = renderCanvas.toDataURL('image/jpeg', 0.50);
            }
          } catch (renderErr) {
            console.warn(`Could not render page ${i} for diagram detection:`, renderErr);
          }
          
          pageMap.push({
            startIndex: fullText.length,
            pageNumber: i,
            embeddedImages,
            pageDataUrl
          });
          fullText += normalizedPageText + "\n\n";
        }

        const totalImgs = pageMap.reduce((acc, p) => acc + p.embeddedImages.length, 0);
        console.log(`Extracted PDF text length: ${fullText.length}, Embedded images found: ${totalImgs}`);
        const questions = extractQuestionsFromText(fullText, pageMap);
        console.log("Extracted questions count:", questions.length);
        return { questions, extractedImages: allExtractedImages };
      } catch (err) {
        console.error("PDF parsing error:", err);
        return { questions: [], extractedImages: [] };
      }
    }
    return { questions: [], extractedImages: [] };
  }

  function extractQuestionsFromText(text: string, pageMap: any[] = []): any[] {
    const questions: any[] = [];

    // Normalize text: handle various newline formats and multi-spaces
    // NOTE: This normalization matches the one used in parseFile for index consistency
    const normalizedText = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

    // Split into question blocks strictly by "1. ", "2. " etc at start of line
    const qSplitRegex = /^\s*(\d+)[\.|\)]\s+/gm;
    let match;
    const blockInfos: { start: number; text: string }[] = [];

    while ((match = qSplitRegex.exec(normalizedText)) !== null) {
      const start = match.index;
      if (blockInfos.length > 0) {
        blockInfos[blockInfos.length - 1].text = normalizedText.substring(blockInfos[blockInfos.length - 1].start, start);
      }
      blockInfos.push({ start, text: "" });
    }

    if (blockInfos.length > 0) {
      blockInfos[blockInfos.length - 1].text = normalizedText.substring(blockInfos[blockInfos.length - 1].start);
    }

    const validBlockInfos = blockInfos.filter(b => b.text.trim().length > 0);
    const blocks = validBlockInfos.map(b => b.text);
    const blockStarts = validBlockInfos.map(b => b.start);

    console.log(`Split text into ${blocks.length} potential question blocks.`);

    for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
      const block = blocks[bIdx];

      // Filtering per Problem 1
      const firstLine = block.split('\n')[0];
      if (/Unit-|Assignment-|ELECTRONIC DEVICES|CHAPTER/i.test(firstLine)) continue;
      
      const hasOptions = /\([a-dA-D]\)|[A-D][\.|\)]\s/i.test(block);
      if (!hasOptions) continue;

      // Find options: (A), A., A), [A], Option A:
      const optionMarkerRegex =
        /(?:\n|[ \t])(?:\(?([A-Da-d])[\s\).\]:]|Option\s*([A-Da-d])[\s.:])(?!\w)/gi;

      let matchOpt;
      const optionMatches = [];
      const tempGlobalRegex = new RegExp(optionMarkerRegex);
      while ((matchOpt = tempGlobalRegex.exec(block)) !== null) {
        optionMatches.push({
          index: matchOpt.index,
          marker: matchOpt[0],
          label: (matchOpt[1] || matchOpt[2]).toUpperCase(),
        });
      }

      let questionPart = "";
      let optionsArray: string[] = [];
      let answer = "A";
      let solution = "";

      if (optionMatches.length > 0) {
        questionPart = block.substring(0, optionMatches[0].index).trim();
        for (let i = 0; i < optionMatches.length; i++) {
          const start = optionMatches[i].index + optionMatches[i].marker.length;
          const end = i + 1 < optionMatches.length ? optionMatches[i + 1].index : block.length;
          let optText = block.substring(start, end).trim();

          const ansMatch = optText.match(/(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D])/i);
          if (ansMatch) {
            answer = ansMatch[1].toUpperCase();
            optText = optText.substring(0, ansMatch.index).trim();
          }

          const solMatch = optText.match(/(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]*([\s\S]*)/i);
          if (solMatch) {
            solution = solMatch[1].trim();
            optText = optText.substring(0, solMatch.index).trim();
          }
          if (optText) optionsArray.push(optText);
        }
      } else {
        questionPart = block.trim();
      }

      let questionEn = questionPart.replace(/^\s*\d+[\.|\)]\s*/i, "").trim();
      let questionHi = "";

      const hindiRegex = /[\u0900-\u097F]/;
      if (hindiRegex.test(questionEn)) {
        const lines = questionEn.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
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
            questionHi = questionEn;
            questionEn = "";
          }
        } else if (hindiRegex.test(questionEn)) {
          questionHi = questionEn;
          questionEn = "";
        }
      }

      if (answer === "A") {
        const globalAns = block.match(/(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D])\b/i);
        if (globalAns) answer = globalAns[1].toUpperCase();
      }

      const globalSol = block.match(/(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]*([\s\S]{5,})/i);
      if (globalSol) solution = globalSol[1].trim();

      // ==== Diagram-Option Detection ====
      const realTextOptions = optionsArray.filter(o => o.trim().replace(/^[a-d][\s\)\.:]/i, '').trim().length > 5);
      const hasDiagramOptions = realTextOptions.length < 2;

      let qPageNum = 1;
      let questionImage = "";
      let hasDiagramOptionsFlag = false;
      let needsReview = false;

      if (pageMap && pageMap.length > 0) {
        const startIdx = blockStarts[bIdx];
        let matchedPage: any = null;
        for (const p of pageMap) {
          if (startIdx >= p.startIndex) {
            qPageNum = p.pageNumber;
            matchedPage = p;
          } else {
            break;
          }
        }

        if (matchedPage) {
          const questionText = (questionEn + questionHi + block).toLowerCase();
          const hasFigureRef = /fig(ure)?[\s.]*\d|diagram|circuit|graph|wave|shown below|given below|following figure|refer to|arrangement/i.test(questionText);

          if (hasDiagramOptions) {
            hasDiagramOptionsFlag = true;
            questionImage = ""; // Do NOT attach whole page as question image
            needsReview = true;
          } else if (matchedPage.embeddedImages && matchedPage.embeddedImages.length > 0) {
            if (hasFigureRef) {
              questionImage = matchedPage.embeddedImages[0].dataUrl;
              needsReview = matchedPage.embeddedImages.length > 1; 
            } else if (matchedPage.embeddedImages.length === 1) {
              questionImage = matchedPage.embeddedImages[0].dataUrl;
              needsReview = false;
            } else {
              questionImage = matchedPage.embeddedImages[0].dataUrl;
              needsReview = true;
            }
          }
        }
      }

      if (!hasDiagramOptionsFlag && optionsArray.length < 2) {
          needsReview = true;
      }

      const finalOptions = hasDiagramOptionsFlag
        ? ["A", "B", "C", "D"]
        : (optionsArray.length >= 2 ? optionsArray.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"]);

      if (questionEn || questionHi) {
        questions.push({
          id: questions.length + 1,
          questionEn: questionEn || questionHi,
          questionHi: questionEn ? questionHi : "",
          type: "Multiple Choice",
          options: finalOptions,
          correctAnswer: answer,
          positiveMarks: 4,
          negativeMarks: -1,
          solution: solution || "Extracted from document",
          pageNumber: qPageNum,
          hasDiagramOptions: hasDiagramOptionsFlag,
          questionImage,
          needsReview
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
  const [showBulkEditDrawer, setShowBulkEditDrawer] = useState(false);
  const [bulkEditRange, setBulkEditRange] = useState({ from: 1, to: 10 });
  const [viewingAddQuestionForm, setViewingAddQuestionForm] = useState<
    any | null
  >(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedBulkDeleteQuestions, setSelectedBulkDeleteQuestions] =
    useState<number[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);


  const [isBulkEditQuestionsOn, setIsBulkEditQuestionsOn] = useState(false);
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

  const renderDiagram = (q: any, field: string = "question", isEditable: boolean = false) => {
    let dataUrl = "";
    if (field === "question") {
      dataUrl = q.questionImage || (Array.isArray(q.questionImages) ? q.questionImages[0] : "");
    } else if (field === "solution") {
      dataUrl = q.solutionImage || (q.solution?.images && Array.isArray(q.solution.images) ? q.solution.images[0] : "");
    } else {
      // Option Image (A, B, C, D)
      dataUrl = q.optionImages?.[field.charCodeAt(0) - 65] || "";
    }
    
    if (!dataUrl) {
      if (!isEditable) return null;
      return (
        <div className="mt-2 flex items-center gap-2 justify-start">
          <button 
            onClick={() => setActiveImageAssignment({ questionId: q.id, field })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed transition-all ${activeImageAssignment?.questionId === q.id && activeImageAssignment?.field === field ? 'border-amber-400 bg-amber-50 text-amber-700 animate-pulse' : 'border-gray-200 text-gray-400 hover:border-amber-500 hover:text-amber-600'}`}
          >
            <span className="material-symbols-outlined text-[16px]">collections</span>
            <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              Map from Gallery
            </span>
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-black hover:text-black cursor-pointer transition-all">
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Upload Manual</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setActiveImageAssignment({ questionId: q.id, field });
                  setTimeout(() => handleImageSelect(ev.target?.result as string), 0);
                };
                reader.readAsDataURL(file);
              }
            }} />
          </label>
        </div>
      );
    }

    const isPageLevel = field === "question" && q.hasDiagramOptions;

    return (
      <div className={`mt-3 border rounded-xl overflow-hidden relative group ${isPageLevel ? 'border-amber-200 bg-amber-50/40' : 'border-blue-100 bg-blue-50/40'} ${!isEditable ? 'max-w-[400px]' : ''}`}>
        <div className={`px-3 py-1.5 border-b flex items-center justify-between gap-1.5 ${isPageLevel ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">{isPageLevel ? 'schema' : field === 'solution' ? 'psychology' : 'image'}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isPageLevel ? 'text-amber-600' : 'text-blue-500'}`}>
              {isPageLevel ? 'Options as Diagrams' : field === 'question' ? 'Question Diagram' : field === 'solution' ? 'Solution Diagram' : `Option ${field} Image`}
            </span>
          </div>
          {isEditable && (
            <button 
              onClick={() => handleRemoveImage(q.id, field)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}
        </div>
        <div className="p-2 flex flex-col items-center">
          <img src={dataUrl} alt="Diagram" className={`w-full h-auto rounded-lg object-contain ${field === 'question' ? 'max-h-64' : 'max-h-32'}`} loading="lazy" />
          {isEditable && (
            <div className="flex items-center gap-4 mt-3">
              <button onClick={() => setActiveImageAssignment({ questionId: q.id, field })} className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-[14px]">collections</span> Change (Gallery)
              </button>
              <label className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[14px]">upload_file</span> Change (Upload)
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setActiveImageAssignment({ questionId: q.id, field });
                      setTimeout(() => handleImageSelect(ev.target?.result as string), 0);
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            </div>
          )}
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
  }).sort((a, b) => {
    const sortA = parseFloat(String(a.sortBy || "0")) || 0;
    const sortB = parseFloat(String(b.sortBy || "0")) || 0;
    return sortB - sortA;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  const renderResultsTab = () => {
    const filteredResults = results.filter((res) => {
      const matchSeries =
        !resultFilters.series || res.testName.includes(resultFilters.series);
      const matchTest =
        !resultFilters.test || res.testName.includes(resultFilters.test);
      return matchSeries && matchTest;
    });

    const totalResults = filteredResults.length;
    const totalResultsPages = Math.ceil(totalResults / resultsPageSize);
    const resultsStartIndex = (resultsCurrentPage - 1) * resultsPageSize;
    const resultsEndIndex = Math.min(resultsStartIndex + resultsPageSize, totalResults);
    const paginatedResults = filteredResults.slice(resultsStartIndex, resultsEndIndex);
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

        {/* Standardized Pagination Footer for Results */}
        {!loading && filteredResults.length > 0 && (
          <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center group">
                <select
                  value={resultsPageSize}
                  onChange={(e) => setResultsPageSize(Number(e.target.value))}
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
                Showing {resultsShowingStart} to {resultsEndIndex} of {totalResults} entries
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
              <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                {resultsCurrentPage}
              </button>
              <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
              <button
                onClick={() => setResultsCurrentPage((p) => Math.min(totalResultsPages, p + 1))}
                disabled={resultsCurrentPage === totalResultsPages || totalResultsPages === 0}
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
              {reportedStartIndex + idx + 1}
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
                {tableRows}
              </tbody>
            </table>
          </div>
        </div>

        {/* Standardized Pagination Footer for Reported Questions */}
        {!loading && filteredReported.length > 0 && (
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
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-wrap items-center justify-between shadow-sm gap-4">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total Format</span>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="px-3 py-1 bg-gray-50 text-[13px] font-bold text-gray-700 rounded-lg">
                      {viewingQuestionEditor.marks || 0} Marks
                    </span>
                    <span className="px-3 py-1 bg-gray-50 text-[13px] font-bold text-gray-700 rounded-lg">
                      {viewingQuestionEditor.duration || viewingQuestionEditor.time || 0} Minutes
                    </span>
                    <span className="px-3 py-1 bg-gray-50 text-[13px] font-bold text-gray-700 rounded-lg">
                      {editorQuestions.length} Questions
                    </span>
                  </div>
                </div>

                <div className="w-[1px] h-10 bg-gray-100" />

                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Test-Level Scoring</span>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="px-3 py-1 bg-green-50 text-[#2E7D32] text-[13px] font-bold rounded-lg border border-green-100">
                      +{viewingQuestionEditor.marksPerQuestion || 0} per Right
                    </span>
                    <span className="px-3 py-1 bg-red-50 text-[#C62828] text-[13px] font-bold rounded-lg border border-red-100">
                      -{viewingQuestionEditor.negativeMarking || 0} per Wrong
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[12px] font-medium text-gray-400">
                Last Published:{" "}
                {viewingQuestionEditor.published || "Not Published"}
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
                          label: "Bulk Edit",
                          icon: "edit_calendar",
                          onClick: () => {
                            setShowBulkEditDrawer(true);
                          },
                        },
                        {
                          label: "Bulk Delete",
                          icon: "delete",
                          onClick: () => {
                            setShowBulkDeleteModal(true);
                            setSelectedBulkDeleteQuestions([]);
                          },
                        },
                        {
                          label: isBulkEditQuestionsOn ? "Exit Sorting" : "Sort Questions",
                          icon: isBulkEditQuestionsOn ? "close" : "sort",
                          onClick: () => setIsBulkEditQuestionsOn(!isBulkEditQuestionsOn),
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
            {isBulkEditQuestionsOn ? (
               <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-[#1a202c]">
                 <DndContext 
                   sensors={sensors}
                   collisionDetection={closestCenter}
                   onDragEnd={handleDragEnd}
                 >
                   <table className="w-full text-left border-collapse">
                     <thead className="bg-[#FAFAFA]">
                       <tr>
                         <th className="px-6 py-4 text-[12px] font-black text-gray-400 uppercase tracking-widest w-24">Order</th>
                         <th className="px-6 py-4 text-[12px] font-black text-gray-400 uppercase tracking-widest">Question Text</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       <SortableContext 
                         items={editorQuestions.map((q: any) => q.id || q._id)}
                         strategy={verticalListSortingStrategy}
                       >
                         {(editorQuestions || []).map((q: any, idx: number) => (
                           <SortableRow 
                             key={q.id || q._id}
                             q={q}
                             idx={idx}
                             setViewingAddQuestionForm={setViewingAddQuestionForm}
                             handleDeleteQuestion={handleDeleteQuestion}
                             viewingQuestionEditor={viewingQuestionEditor}
                           />
                         ))}
                       </SortableContext>
                     </tbody>
                   </table>
                 </DndContext>
               </div>
            ) : (
            <div className="space-y-6">
              {(qeTests || []).map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 relative"
                >
                  {/* Top Right Buttons inside card */}
                  <div className="absolute top-8 right-8 flex items-center gap-4">
                    <button
                      onClick={() => setViewingAddQuestionForm(q)}
                      className="flex items-center gap-2 px-4 py-1.5 border border-gray-100 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
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
                      className="w-9 h-9 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
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
                        <div className="max-w-[400px]">
                          {renderDiagram(q)}
                        </div>
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

                    {/* Answer Key & Solution */}
                    <div className="mt-8 pt-8 border-t border-gray-50 bg-[#F9FAFB]/50 rounded-b-xl p-8 ml-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                           <span className="material-symbols-outlined text-[20px] font-black">task_alt</span>
                        </div>
                        <span className="text-[14px] font-black text-emerald-800 uppercase tracking-widest">
                          Correct Answer: {q.correctAnswer}
                        </span>
                      </div>
                      
                      {(q.solution || q.solutionEn) && (
                        <div className="space-y-4">
                          <div className="text-[14px] text-gray-600 leading-relaxed font-medium">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2">Detailed Explanation</span>
                            <div className="bg-white/80 p-4 rounded-xl border border-gray-100 italic">
                                {renderQuestionText(q.solutionEn || (typeof q.solution === 'string' ? q.solution : q.solution?.text) || "No explanation provided.")}
                            </div>
                          </div>
                          <div className="max-w-[400px]">
                            {renderDiagram(q, 'solution')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
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
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-md active:scale-95"
              title="Add Test"
            >
              <span className="material-symbols-outlined text-[26px]">add</span>
            </button>
            {showAddMenu && (
               <div className="absolute right-0 top-full mt-2 w-[250px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[101]">
                   <button onClick={() => { setShowAddMenu(false); setEditingTest(null); setShowAddSingleTestDrawer(true); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                      <span className="material-symbols-outlined text-[20px] text-gray-500">post_add</span><span className="text-[14px] font-bold text-gray-800">Create Test</span>
                   </button>
                   <button onClick={() => { setShowAddMenu(false); setShowAddTestPDFDrawer(true); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                      <span className="material-symbols-outlined text-[20px] text-gray-500">picture_as_pdf</span><span className="text-[14px] font-bold text-gray-800">PDF Test Upload (Single/Bulk)</span>
                   </button>
                   <button onClick={() => { setShowAddMenu(false); setShowSubjectiveTestDrawer(true); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                      <span className="material-symbols-outlined text-[20px] text-gray-500">draw</span><span className="text-[14px] font-bold text-gray-800">Create Subjective Test</span>
                   </button>
               </div>
            )}
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
                          onClick={() => { setEditingTest(null); setShowAddSingleTestDrawer(true); }}
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



  const renderBulkUploaderTab = () => {
    const previewQuestions =
      bulkUploadData.parsedQuestions &&
        bulkUploadData.parsedQuestions.length > 0
        ? bulkUploadData.parsedQuestions
        : [];

    const extractedImages = bulkUploadData.extractedImages || [];



    const formats = [
      {
        key: "default",
        label: "Default",
        image: "/attach-assist/default.jpg",
        download: "/attach-assist/format-default.docx"
      },
      {
        key: "format1",
        label: "Format 1",
        image: "/attach-assist/format1.jpg",
        download: "/attach-assist/format-1.docx"
      },
      {
        key: "format2",
        label: "Format 2",
        image: "/attach-assist/format2.jpg",
        download: "/attach-assist/format-2.docx"
      }
    ];

    return (
      <div className="animate-in fade-in duration-500 pb-20">
        {/* Extracted Image Gallery */}
        {extractedImages.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-black">collections</span>
                <h3 className="text-[16px] font-bold text-gray-800">Extracted Image Gallery</h3>
                <span className="px-2.5 py-0.5 bg-gray-100 rounded-full text-[11px] font-bold text-gray-500">
                  {extractedImages.length} Images Found
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium italic">Click an image to view full size</p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {extractedImages.map((img, idx) => (
                <div 
                  key={idx} 
                  className="flex-shrink-0 w-32 h-32 rounded-xl border-2 border-gray-100 overflow-hidden bg-gray-50 hover:border-black transition-all cursor-pointer relative group"
                  onClick={() => {
                    // Logic to preview full size or use for active assignment
                    if (activeImageAssignment) {
                      handleImageSelect(img);
                    }
                  }}
                >
                  <img src={img} alt={`Extracted ${idx}`} className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Select</span>
                  </div>
                </div>
              ))}
            </div>
            {activeImageAssignment && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">info</span>
                  <span className="text-[12px] font-bold text-amber-700 uppercase tracking-tight">
                    Select an image from gallery for Question {activeImageAssignment.questionId} - {activeImageAssignment.field === 'question' ? 'Main Diagram' : `Option ${activeImageAssignment.field}`}
                  </span>
                </div>
                <button 
                  onClick={() => setActiveImageAssignment(null)}
                  className="text-[11px] font-black text-amber-600 hover:text-amber-800 underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        <div className={`flex gap-5 items-start`}>
          {/* LEFT: Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 space-y-5 flex-1 min-w-0">
            {/* Select Test Series */}
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-[#1a7a5e]">
                Select Test Series *
              </label>
              <CustomDropdown
                options={tests
                  .filter((t: any) => t.isSeries === true)
                  .map((t: any) => ({
                    value: t.id || (t as any)._id,
                    label: t.name || t.title || "",
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
                      (!bulkUploadData.testSeries ||
                        testSeriesId === bulkUploadData.testSeries) &&
                      t.isSeries !== true
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
            <div className="space-y-2 mt-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-semibold text-[#1a7a5e]">Select Format *</label>
                <a
                  href={formats.find(f => f.key === (bulkUploadData.format || "default"))?.download}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-bold uppercase rounded-lg hover:bg-gray-800 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download Format
                </a>
              </div>
              <div className="flex gap-4 pt-1">
                {formats.map((fmt) => {
                  const isSelected = (bulkUploadData.format || "default") === fmt.key;
                  return (
                    <div
                      key={fmt.key}
                      onClick={() =>
                        setBulkUploadData({ ...bulkUploadData, format: fmt.key })
                      }
                      className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 overflow-hidden select-none flex-shrink-0 flex flex-col ${isSelected
                        ? "border-black shadow-md"
                        : "border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100 bg-gray-50"
                        }`}
                      style={{ width: "145px", height: "180px" }}
                    >
                      <div className="flex-1 bg-white flex items-center justify-center p-2 relative">
                        <img src={fmt.image} alt={fmt.label} className="w-full h-full object-contain" />
                      </div>
                      <div className={`py-2 px-2 text-center border-t border-gray-200 ${isSelected ? "bg-black text-white" : "bg-white text-gray-700"}`}>
                        <p className={`text-[12px] font-bold`}>
                          {fmt.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* modern file uploader */}
            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center px-1">
                <span className="text-[12px] font-semibold text-[#1a7a5e]">Select File *</span>
              </div>
              <div className="flex flex-col gap-2 -mt-2">
                <label className="group h-12 border border-gray-200 rounded-lg flex items-center overflow-hidden bg-white hover:border-gray-300 transition-all cursor-pointer">
                  <div
                    className={`px-4 text-[13px] flex-1 flex items-center gap-2 ${bulkUploadData.file ? "text-gray-700 font-medium" : "text-gray-500"}`}
                  >
                    <span className="truncate">
                      {bulkUploadData.file
                        ? bulkUploadData.file.name
                        : "Upload file"}
                    </span>
                  </div>
                  <div className="h-full px-6 flex items-center bg-[#f5f5f5] text-gray-600 border-l border-gray-200 hover:bg-gray-200 transition-all">
                    <span className="text-[13px] font-medium">
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
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Progress Bar */}
            {(isParsing || (uploadProgress > 0 && uploadProgress < 100)) && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <span>{isParsing ? 'Extracting Content...' : 'Uploading Questions...'}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${uploadProgress || (isParsing ? 50 : 0)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Mode: Append vs Replace */}
            <div className="space-y-3 mt-6">
              <label className="text-[12px] font-semibold text-[#1a7a5e]">Upload Mode *</label>
              <div className="flex gap-4">
                {[
                  { id: 'append', label: 'Append to Existing', icon: 'playlist_add', desc: 'Adds new questions after existing ones' },
                  { id: 'replace', label: 'Replace All', icon: 'sync_problem', desc: 'Deletes existing questions before uploading', color: 'text-red-500' }
                ].map(mode => (
                  <div
                    key={mode.id}
                    onClick={() => setBulkUploadData({ ...bulkUploadData, uploadMode: mode.id as any })}
                    className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${bulkUploadData.uploadMode === mode.id ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 opacity-80'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`material-symbols-outlined text-[20px] ${bulkUploadData.uploadMode === mode.id ? 'text-black' : 'text-gray-400'}`}>{mode.icon}</span>
                      <span className="text-[13px] font-bold">{mode.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">{mode.desc}</p>
                  </div>
                ))}
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
                    const targetTestMatch =
                      tests.find((t) => (t.id || (t as any)._id) === testId) ||
                      detailTests.find(
                        (t) => (t.id || (t as any)._id) === testId,
                      );
                    
                    if (bulkUploadData.uploadMode === 'replace') {
                      const confirm = window.confirm("WARNING: 'Replace All' mode will DELETE all existing questions in this test and replace them with the current file contents. Do you want to continue?");
                      if (!confirm) return;

                      showToast("Clearing existing questions...", "success");
                      // Call clear questions API if exists, otherwise delete them
                      // Standard way: update with empty array might not work if questions are separate docs
                      // But our backend usually has a 'clear' or we delete them manually
                      await fetch(`/api/questions/test/${testId}`, { 
                        method: 'DELETE',
                        headers: getAdminHeaders()
                      });
                    }

                    // 1. Fetch current questions for duplicate check and limit enforcement
                    const existingQuestions = bulkUploadData.uploadMode === 'replace' ? [] : await testsAPI.getQuestions(testId);
                    const existingTexts = new Set(
                      existingQuestions.map((q: any) =>
                        (q.questionEn || q.question || "").trim().toLowerCase(),
                      ),
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

                    // Scoring settings from test
                    const defaultMarks = targetTestMatch?.marksPerQuestion || targetTestMatch?.marks;
                    const defaultNeg = targetTestMatch?.negativeMarking;

                    // VALIDATION: Ensure scoring is defined
                    const questionsMissingMarks = filteredList.filter(q => !q.positiveMarks && !q.marks && !defaultMarks);
                    if (questionsMissingMarks.length > 0) {
                      showToast(
                        `${questionsMissingMarks.length} questions are missing marks and no Test-level default is set. Please set a 'Marks Per Question' in Test settings first.`,
                        "error"
                      );
                      setIsParsing(false);
                      return;
                    }

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
                          marks: q.positiveMarks || q.marks || defaultMarks,
                          negative: q.negativeMarks || q.negative || defaultNeg,
                          positiveMarks: q.positiveMarks || q.marks || defaultMarks,
                          negativeMarks: q.negativeMarks || q.negative || defaultNeg,
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
                        `Only ${allowed} out of ${questionsToUpload.length} new q. will be uploaded as per limit (${limit}).`,
                        "error",
                      );
                      questionsToUpload = questionsToUpload.slice(0, allowed);
                    }

                    showToast(
                      `Uploading ${questionsToUpload.length} questions...`,
                      "success",
                    );

                    // 3. Sequential upload with progress
                    setIsParsing(true);
                    setUploadProgress(0);
                    let uploadedCount = 0;
                    const totalToUpload = questionsToUpload.length;

                    try {
                      for (const q of questionsToUpload) {
                        const res = await fetch("/api/questions", {
                          method: "POST",
                          headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
                          body: JSON.stringify(q),
                        });
                        if (!res.ok) throw new Error("Upload failed at question " + (uploadedCount + 1));
                        uploadedCount++;
                        setUploadProgress((uploadedCount / totalToUpload) * 100);
                      }

                      invalidateCache("tests");
                      showToast(
                        `${uploadedCount} questions uploaded successfully!`,
                        "success",
                      );

                      // 4. Update the test's viewFormat if needed
                      const formatVal = bulkUploadData.format || "default";
                      await fetch(`/api/tests/${testId}`, {
                        method: "PUT",
                        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
                        body: JSON.stringify({ viewFormat: formatVal }),
                      });

                      // 5. Cleanup and Sync
                      setBulkUploadData({
                        ...bulkUploadData,
                        file: null,
                        parsedQuestions: [],
                        extractedImages: [],
                        uploadMode: 'append'
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
                        showToast(err.message || "Upload failed", "error");
                      } finally {
                        setIsParsing(false);
                        setUploadProgress(0);
                      }
                    } catch (err: any) {
                      showToast(err.message || "Upload failed", "error");
                    } finally {
                      setIsParsing(false);
                      setUploadProgress(0);
                    }
                }}
                className="px-8 h-10 bg-[#12A5B8] hover:bg-[#0E8A9A] text-white rounded-lg font-medium text-[14px] transition-all active:scale-95 flex items-center justify-center w-[120px]"
              >
                Upload
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
                          className={`px-5 py-6 transition-colors border-l-4 space-y-3 font-serif ${q.needsReview ? 'bg-orange-50/30 border-orange-400 hover:bg-orange-50/50' : 'hover:bg-gray-50/50 border-transparent hover:border-black'}`}
                        >
                          {q.needsReview && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg shrink-0 w-max">
                              <span className="material-symbols-outlined text-yellow-600 text-[18px]">warning</span>
                              <span className="text-[12px] font-bold text-yellow-700">Needs Review: Diagram uncertain or missing</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="font-bold text-[13px] text-gray-900 shrink-0">
                              Question:
                            </span>
                            <p className="text-[12px] font-medium text-gray-800 leading-relaxed flex-1">
                              {renderQuestionText(q.questionEn)}
                            </p>
                          </div>
                          <div className="pl-16 space-y-1 font-sans">
                            {q.options.map((opt: string, i: number) => {
                               const label = String.fromCharCode(65 + i);
                               return (
                                <div key={i} className="space-y-2 mb-3">
                                  <div className="flex gap-2 text-[11px] text-gray-500">
                                    <span className="font-bold">({label.toLowerCase()})</span>
                                    <span>{renderQuestionText(opt)}</span>
                                  </div>
                                  {renderDiagram(q, label, true)}
                                </div>
                               );
                            })}
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
                          {renderDiagram(q, "question", true)}
                        </div>
                      );
                    }

                    if (format === "format2") {
                      return (
                        <div
                          key={idx}
                          className={`px-5 py-6 transition-colors border-l-4 space-y-3 font-serif ${q.needsReview ? 'bg-orange-50/30 border-orange-400 hover:bg-orange-50/50' : 'hover:bg-gray-50/50 border-transparent hover:border-black'}`}
                        >
                          {q.needsReview && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg shrink-0 w-max">
                              <span className="material-symbols-outlined text-yellow-600 text-[18px]">warning</span>
                              <span className="text-[12px] font-bold text-yellow-700">Needs Review: Diagram uncertain or missing</span>
                            </div>
                          )}
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
                            {q.options.map((opt: string, i: number) => {
                               const label = String.fromCharCode(65 + i);
                               return (
                                <div key={i} className="mb-4">
                                  <div className="flex gap-2 text-[11px] text-gray-500">
                                    <span className="font-bold">{label}.</span>
                                    <span>{renderQuestionText(opt)}</span>
                                  </div>
                                  <div className="pl-4">
                                    {renderDiagram(q, label, true)}
                                  </div>
                                </div>
                               );
                            })}
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
                          {renderDiagram(q, "question", true)}
                        </div>
                      );
                    }

                    if (format === "format3") {
                      return (
                        <div
                          key={idx}
                          className={`px-5 py-4 transition-colors border-b border-gray-100 ${q.needsReview ? 'bg-orange-50/30 hover:bg-orange-50/50' : 'hover:bg-blue-50/30'}`}
                        >
                          <div className="bg-gray-50 px-3 py-1.5 rounded-md flex justify-between items-center mb-3">
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <span className="text-gray-400">Question {idx + 1}</span>
                            {q.needsReview && <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">⚠️ Needs Review</span>}
                           </div>
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                              GRID STYLE
                            </span>
                          </div>
                          <p className="text-[13px] font-bold text-gray-800 mb-4">
                            {renderQuestionText(q.questionEn)}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {q.options.map((o: string, i: number) => {
                              const label = String.fromCharCode(65 + i);
                              return (
                              <div
                                key={i}
                                className="flex flex-col gap-2 p-2 border border-gray-100 rounded-lg bg-white shadow-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] font-bold text-gray-500 shrink-0">
                                    {label}
                                  </span>
                                  <span className="text-[11px] text-gray-600 font-medium truncate">
                                    {renderQuestionText(o)}
                                  </span>
                                </div>
                                {renderDiagram(q, label, true)}
                              </div>
                            )})}
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
                          {renderDiagram(q, "question", true)}
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
                                {q.options.map((o: string, i: number) => {
                                  const label = String.fromCharCode(65 + i);
                                  return (
                                  <div
                                    key={i}
                                    className="flex flex-col gap-2 text-[11px] text-gray-500 font-medium mb-2"
                                  >
                                    <div className="flex gap-2">
                                      <span className="text-blue-500 shrink-0">
                                        {String.fromCharCode(97 + i)}.
                                      </span>
                                      <span>{renderQuestionText(o)}</span>
                                    </div>
                                    <div>{renderDiagram(q, label, true)}</div>
                                  </div>
                                )})}
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
                          {renderDiagram(q, "question", true)}
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
                              {q.options.map((o: string, i: number) => {
                                const label = String.fromCharCode(65 + i);
                                return (
                                <div
                                  key={i}
                                  className="flex flex-col gap-2 py-1.5 px-3 bg-white/50 rounded-lg text-[11px] text-emerald-800 font-bold border border-emerald-50"
                                >
                                  <div className="flex gap-3 items-center">
                                    <span className="w-4 text-emerald-300 shrink-0">
                                      {label}
                                    </span>
                                    <span>{renderQuestionText(o)}</span>
                                  </div>
                                  {renderDiagram(q, label, true)}
                                </div>
                              )})}
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
                              {renderDiagram(q, "solution", true)}
                              {!(viewingQuestionEditor?.marksPerQuestion || viewingQuestionEditor?.totalMarks) && (
                                <div className="pt-2 flex gap-4 text-[10px] font-black text-emerald-600">
                                  <span>CORRECT: {q.correctAnswer}</span>
                                  <span>WEIGHTAGE: {q.positiveMarks}M</span>
                                </div>
                              )}
                            </div>
                            {renderDiagram(q, "question", true)}
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
                          {q.options.map((o: string, i: number) => {
                            const label = String.fromCharCode(65 + i);
                            return (
                            <div
                              key={i}
                              className="flex border-b border-gray-100 last:border-b-0"
                            >
                              <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                                Option {label}
                              </div>
                              <div className="p-2.5 text-[11px] text-gray-700 font-bold flex-1 flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <span className="text-gray-300 shrink-0">
                                    {label}.
                                  </span>
                                  {renderQuestionText(o)}
                                </div>
                                {renderDiagram(q, label, true)}
                              </div>
                            </div>
                          )})}
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
                            <div className="p-2.5 text-[11px] text-gray-500 italic flex-1 flex flex-col gap-2">
                              {renderQuestionText(q.solution)}
                              {renderDiagram(q, "solution", true)}
                            </div>
                          </div>
                          {!(viewingQuestionEditor?.marksPerQuestion || viewingQuestionEditor?.totalMarks) && (
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
                          )}
                          {renderDiagram(q, "question", true)}
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
      ) : activeTab === "Bulk Uploader" ? (
        renderBulkUploaderTab()
      ) : activeTab === "Reported Questions" ? (
        renderReportedQuestionsTab()
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
        onClose={() => {
          setShowAddSingleTestDrawer(false);
          setEditingTest(null);
        }}
        editingTest={editingTest}
        testSeriesOptions={courses.map((c) => ({
          value: c.id || (c as any)._id,
          label: c.name || c.title || "Unnamed Series",
        }))}
        defaultTestSeries={
          viewingTestSeries 
            ? [viewingTestSeries.id || (viewingTestSeries as any)._id] 
            : []
        }
        showToast={showToast}
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
      />

      <AddTestPDFDrawer
        isOpen={showAddTestPDFDrawer}
        onClose={() => setShowAddTestPDFDrawer(false)}
        onSubmit={async (data) => {
          try {
            if (!data.pdfFiles || data.pdfFiles.length === 0) {
              throw new Error("Please select at least one PDF file");
            }
            showToast(`Processing ${data.pdfFiles.length} PDF(s)...`, "success");
            const targetCourseId = viewingTestSeries?.id || (viewingTestSeries as any)?._id || (data.testSeries && data.testSeries.length > 0 ? data.testSeries[0] : "");

            for (let i = 0; i < data.pdfFiles.length; i++) {
              const file = data.pdfFiles[i];
              const originalTitle = data.title || "Untitled Test";
              const testTitle = data.pdfFiles.length > 1 ? file.name.replace(/\.[^/.]+$/, "") : originalTitle;
              
              await testsAPI.create({
                ...data,
                title: testTitle,
                name: testTitle,
                courseId: targetCourseId,
                type: "PDF",
                pdfFile: file // Add individual file back as pdfFile for backwards compatibility
              });
            }

            setShowAddTestPDFDrawer(false);
            showToast(`${data.pdfFiles.length} Test PDF(s) added successfully`, "success");
            loadData();
          } catch (err: any) {
            showToast(err.message, "error");
          }
        }}
        testSeriesOptions={courses.map((c) => ({
          value: c.id || (c as any)?._id,
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


      {/* Add Question Drawer */}
      <AddQuestionDrawer
        isOpen={!!viewingAddQuestionForm}
        test={viewingQuestionEditor}
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

      <BulkEditQuestionsDrawer
        isOpen={showBulkEditDrawer}
        onClose={() => setShowBulkEditDrawer(false)}
        questions={editorQuestions}
        test={viewingQuestionEditor}
        testName={viewingQuestionEditor?.name || viewingQuestionEditor?.title}
        onSave={async (updatedQuestions) => {
          try {
            // Priority 1: Update individual questions in global collection if they have IDs
            const individualUpdates = updatedQuestions.map(async (q: any) => {
              const qId = q.id || q._id;
              if (qId && typeof qId === 'string' && qId.length > 5) {
                try {
                  return await fetch(`/api/questions/${qId}`, {
                    method: 'PUT',
                    headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify(q)
                  });
                } catch (e) {
                  console.warn(`Failed to update individual question ${qId}`, e);
                }
              }
              return null;
            });
            
            await Promise.all(individualUpdates);

            // Priority 2: Update the Test document (embedded fallback)
            setEditorQuestions(updatedQuestions);
            await testsAPI.update(viewingQuestionEditor.id || viewingQuestionEditor._id, {
              ...viewingQuestionEditor,
              questions: updatedQuestions
            });
            
            showToast("Bulk edit changes saved successfully", "success");
          } catch (error: any) {
            showToast(error.message || "Failed to save bulk edits", "error");
            throw error;
          }
        }}
      />

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
