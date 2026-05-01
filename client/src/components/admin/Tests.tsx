import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  testsAPI,
  coursesAPI,
  testSeriesAPI,
  questionsAPI,
  invalidateCache,
  reportedQuestionsAPI,
  getAdminHeaders,
  resultsAPI,
} from "../../services/apiClient";
import { useTestsListLogic } from "../../hooks/useTestsListLogic";
import { useTestsAnalyticsLogic } from "../../hooks/useTestsAnalyticsLogic";
import { useTestsBulkUploadState } from "../../hooks/useTestsBulkUploadState";
import { useTestsBulkUploadUploadLogic } from "../../hooks/useTestsBulkUploadUploadLogic";
import TestsResultsWrapper from "./tests/views/TestsResultsWrapper";
import TestsReportedWrapper from "./tests/views/TestsReportedWrapper";
import TestsBulkUploaderWrapper from "./tests/views/TestsBulkUploaderWrapper";
import TestsQuestionEditorView from "./tests/TestsQuestionEditorView";
import TestsSeriesDetailView from "./tests/TestsSeriesDetailView";
import { parseFile, extractQuestionsFromText } from "@/utils/testParser";
import { useTestsQuestionActions } from "@/hooks/useTestsQuestionActions";
import { useTestsCrudActions } from "@/hooks/useTestsCrudActions";
import { useTestsEffects } from "@/hooks/useTestsEffects";
import { generateDOCX } from "./DOCXGenerator";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { renderQuestionText, renderDiagram } from "./tests/TestRenderUtils";
import { tabs, detailSubTabs } from "./tests/testConstants";
import TestsErrorBoundary from "./tests/TestsErrorBoundary";
import { useTestsViewManager } from "./tests/hooks/useTestsViewManager";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import TestsDrawers from "./tests/TestsDrawers";
import TestsModalRegistry from "./tests/TestsModalRegistry";
import TestsTopTabs from "./tests/TestsTopTabs";
import TestsPaginationFooter from "./tests/TestsPaginationFooter";

// Configure PDF.js worker (moved to testParser.ts)



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

import TestsHeader from './tests/TestsHeader';
import TestsEmptyState from './tests/TestsEmptyState';
import TestsListWrapper from './tests/TestsListWrapper';
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



const Tests: React.FC<Props> = ({ showToast }) => {
  const {
    routeId,
    activeTab,
    setActiveTab,
    viewingTestSeries,
    setViewingTestSeries,
    viewingTestSeriesTab,
    setViewingTestSeriesTab,
    viewingQuestionEditor,
    setViewingQuestionEditor,
    handleSetViewingTestSeries,
    navigate,
    location
  } = useTestsViewManager();

  const {
    tests,
    setTests,
    courses,
    setCourses,
    testSeries,
    setTestSeries,
    loading,
    setLoading,
    searchQuery,
    setSearchQuery,
    filterCourse,
    setFilterCourse,
    filterStatus,
    setFilterStatus,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    isFilterOpen,
    setIsFilterOpen,
    loadData,
    handleDelete,
    handleDuplicateTest,
    handlePublish,
    filteredTests,
    totalPages,
    paginatedTests
  } = useTestsListLogic(showToast);

  const {
    results,
    setResults,
    resultFilters,
    setResultFilters,
    resultsPageSize,
    setResultsPageSize,
    resultsCurrentPage,
    setResultsCurrentPage,
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
    loadResults,
    loadReportedQuestions,
    handleQuickResolve,
    handleDeleteReport,
    handleBulkDeleteReports
  } = useTestsAnalyticsLogic({ showToast, tests, activeTab });

  const {
    bulkUploadData,
    setBulkUploadData,
    uploadProgress,
    setUploadProgress,
    isParsing,
    setIsParsing,
    activeImageAssignment,
    setActiveImageAssignment,
    handleImageSelect,
    handleRemoveImage
  } = useTestsBulkUploadState();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [detailFilterOpen, setDetailFilterOpen] = useState(false);
  const [detailFilters, setDetailFilters] = useState({
    status: "all",
    type: "all",
  });


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





      return { qEn, qHi, isComplexFormula };
    };

    const rawBlocks = splitQuestionBlocks(normalizedText);
    const parsedNumbers = new Set<number>();

    // --- Hindi Detection Regexes ---
    // Unicode Devanagari: these questions must be preserved exactly.
    const unicodeHindiRegex = /[\u0900-\u097F]/;

    // Legacy encoded Hindi (Krutidev / Shusha / Chanakya non-Unicode fonts).
    // These roman-looking tokens appear when a PDF encodes Hindi using a legacy
    // font mapping that pdfjs cannot reverse-map to Unicode codepoints.
    // They are NOT meaningful English — they are font mojibake.
    // Full token set from SUPER-50 PDFs + common Krutidev glyph sequences:
    const legacyHindiRegex = /fuEufyf|fuEu\b|gfj;k\.kk|gfj;k\b|nksuks\b|dks\b|iz'u|iz\b|vk\b|;g\b|esa\b|ls\b|dk\b|dh\b|ds\b|ugha\b|fdl\b|fdlh\b|dkSu|dqN\b|D;k\b|tks\b|Hkh\b|vkSj\b|gS\b|gSa\b|gksxk\b|gksaxs\b|D;ksafd\b|blfy,\b|bldk\b|blls\b|buesa\b|rFkk\b|vFkok\b|vius\b|d`i;k\b|tkrk\b|tkrh\b|tkrs\b|djrk\b|djrh\b|djrs\b|pkfg,\b|ldrk\b|ldrh\b|ldrs\b/i;

    // NOTE — Task 5 (Future Work):
    // For PDFs where the text layer uses legacy/scanned/formula fonts, text-layer
    // parsing is fundamentally insufficient. The correct long-term fix is:
    //   1. Render each question region to an image (page crop by bounding box).
    //   2. Run OCR (e.g. Tesseract with Hindi + English model) on the crop.
    // This is NOT implemented here. Admin must manually verify questions where
    // needsReview=true and reviewReason contains "Legacy encoded Hindi".

    rawBlocks.forEach((blockObj) => {
      const { number, text: blockText, startIndex } = blockObj;
      const { options, stem, mode } = parseOptions(blockText);
      const { qEn, qHi, isComplexFormula } = normalizeLanguages(stem);

      let answer = answerKeyMap[number] || "";
      if (!answer) {
        const inlineAns = blockText.match(/(?:Ans(?:wer)?|Correct|उत्तर)[:.\s]*([A-D1-4])/i);
        if (inlineAns) {
          answer = inlineAns[1].toUpperCase();
          if (answer === '1') answer = 'A';
          else if (answer === '2') answer = 'B';
          else if (answer === '3') answer = 'C';
          else if (answer === '4') answer = 'D';
        }
      }

      const solMatch = blockText.match(/(?:Sol(?:ution)?|Expl(?:anation)?|हल)[:.\s]+([\s\S]*)/i);
      const solution = ""; // Task 6: Keep solution blank by default

      let qPageNum = 1;
      let matchedPage = null;
      if (pageMap && pageMap.length > 0) {
        for (const p of pageMap) {
          if (startIndex >= p.startIndex) {
            qPageNum = p.pageNumber;
            matchedPage = p;
          } else break;
        }
      }

      let questionImage = "";
      if (matchedPage && matchedPage.embeddedImages?.length > 0) {
        questionImage = matchedPage.embeddedImages[0].dataUrl;
      }

      const cleanQEn = qEn.replace(/^\s*\d+[\.\)]?\s*/, "").trim();
      const cleanQHi = qHi.replace(/^\s*\d+[\.\)]?\s*/, "").trim();
      
      const isLegacyHindi = legacyHindiRegex.test(cleanQEn) || legacyHindiRegex.test(cleanQHi) || legacyHindiRegex.test(options.join(" "));
      const hasUnicodeHindi = unicodeHindiRegex.test(cleanQEn) || unicodeHindiRegex.test(cleanQHi) || unicodeHindiRegex.test(options.join(" "));

      // Log Hindi type per question for admin diagnostics
      if (isLegacyHindi) {
        console.log(`[Parser-Hindi] Q${number}: LEGACY encoded Hindi (non-Unicode font). Preview: "${cleanQEn.substring(0, 60)}"`);
      } else if (hasUnicodeHindi) {
        console.log(`[Parser-Hindi] Q${number}: Unicode Devanagari preserved. qHi="${cleanQHi.substring(0, 40)}", qEn="${cleanQEn.substring(0, 40)}"`);
      }

      // For Unicode Hindi-only questions: copy Hindi text into questionEn so
      // the admin preview UI renders something meaningful.
      // questionHi retains the same value for bilingual display.
      const displayEn = cleanQEn || (hasUnicodeHindi && !isLegacyHindi ? cleanQHi : "");
      const displayHi = cleanQHi;

      // Build a specific, actionable reviewReason
      let reviewReason = "";
      if (isLegacyHindi) {
        reviewReason = "Legacy encoded Hindi detected (non-Unicode font e.g. Krutidev). Text may appear garbled. Verify against original PDF or re-export as Unicode PDF.";
      } else if (isComplexFormula) {
        reviewReason = "Complex formula/math layout detected; verify rendering against original PDF.";
      } else if (!answer) {
        reviewReason = "Missing answer key for this question.";
      } else if (options.length < 4) {
        reviewReason = `Incomplete options parsed (${options.length} of 4 found).`;
      }

      if (displayEn || displayHi) {
        if (number >= 84 && number <= 88) {
          console.log(`[Parser-Trace] Q${number} parsed successfully. displayEn length: ${displayEn.length}, options count: ${options.length}`);
        }
        parsedNumbers.add(number);
        questions.push({
          id: questions.length + 1,
          questionNumber: number,
          originalQuestionNumber: number,
          orderIndex: number,
          // questionEn: English text, or Unicode Hindi when no English is present
          questionEn: displayEn,
          // questionHi: Unicode Hindi text (empty for legacy-encoded Hindi questions)
          questionHi: displayHi,
          type: "Multiple Choice",
          options: options.length >= 4 ? options.slice(0, 4) : ["", "", "", ""],
          correctAnswer: answer,
          positiveMarks: undefined,
          negativeMarks: undefined,
          solution: "",
          explanation: "",
          detailedExplanation: "",
          answerExplanation: "",
          pageNumber: qPageNum,
          hasDiagramOptions: options.length < 2 && mode === 'none',
          questionImage,
          // needsReview flags both legacy Hindi AND other quality issues — never drops questions
          needsReview: !answer || options.length < 4 || isLegacyHindi || isComplexFormula,
          isLegacyHindi,
          hasUnicodeHindi,
          warningReason: isLegacyHindi
            ? "Legacy encoded Hindi detected (non-Unicode font). Text may appear garbled. Admin: verify against original PDF."
            : undefined,
          reviewReason: reviewReason || undefined,
        });
      }
    });

    // Task B: Handle duplicates and sort (Task 2)
    const grouped = new Map<number, any[]>();
    questions.forEach(q => {
      const num = q.originalQuestionNumber;
      if (!grouped.has(num)) grouped.set(num, []);
      grouped.get(num)!.push(q);
    });

    const uniqueQuestions: any[] = [];
    grouped.forEach((list, num) => {
      if (num >= 84 && num <= 88) {
         console.log(`[Parser-Trace] Grouped Map for Q${num} has ${list.length} entries.`);
      }
      if (list.length === 1) {
        uniqueQuestions.push(list[0]);
      } else {
        // Pick the best one: usually the one with longest English text
        const best = list.reduce((prev, curr) => {
           const prevLen = (prev.questionEn || "").length;
           const currLen = (curr.questionEn || "").length;
           return currLen > prevLen ? curr : prev;
        });
        uniqueQuestions.push(best);
      }
    });

    console.log(`[Parser] Unique questions: ${uniqueQuestions.length}. Numbers: ${uniqueQuestions.map(q => q.originalQuestionNumber).join(",")}`);

    // Sequence info — warning only, never blocks upload
    const finalNumbersArr = uniqueQuestions.map(q => q.originalQuestionNumber).sort((a,b) => a-b);
    const duplicates: number[] = [];
    const seen = new Set<number>();
    uniqueQuestions.forEach(q => {
      if (seen.has(q.originalQuestionNumber)) duplicates.push(q.originalQuestionNumber);
      seen.add(q.originalQuestionNumber);
    });

    if (limit > 0 && uniqueQuestions.length !== limit) {
      console.warn(`[Parser] PDF has ${uniqueQuestions.length} questions but this test is configured for ${limit}. Uploading exactly what was parsed.`);
    }
    if (duplicates.length > 0) {
      console.warn(`[Parser] Duplicate question numbers detected: ${duplicates.join(", ")}`);
    }
    console.log(`[Parser] Final parsed count: ${uniqueQuestions.length}. Numbers: ${finalNumbersArr.join(",")}`);
    // isInvalidSequence is intentionally NOT set — count mismatch never blocks upload.

    return uniqueQuestions;
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
  const [activeActionMenuId, setActiveActionMenuId] = useState<
    string | number | null
  >(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedBulkDeleteQuestions, setSelectedBulkDeleteQuestions] =
    useState<number[]>([]);
  const [isBulkEditQuestionsOn, setIsBulkEditQuestionsOn] = useState(false);
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
  const [viewingAddQuestionForm, setViewingAddQuestionForm] = useState<
    any | null
  >(null);

  // Question Library States

  const [detailTests, setDetailTests] = useState<any[]>([]);
  const [seriesUsers, setSeriesUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [questionFormData, setQuestionFormData] = useState<any>(null);
  const [editorQuestions, setEditorQuestions] = useState<any[]>([]);

  const handleOpenModal = useCallback((test?: Test) => {
    if (test) {
      setEditingTest(test);
    } else {
      setEditingTest(null);
    }
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingTest(null);
  }, []);

  const { handleFinalBulkUpload } = useTestsBulkUploadUploadLogic({
    bulkUploadData,
    setBulkUploadData,
    tests,
    detailTests,
    viewingQuestionEditor,
    viewingTestSeries,
    setEditorQuestions,
    setViewingQuestionEditor,
    setActiveTab,
    setIsParsing,
    setUploadProgress,
    loadData,
    showToast
  });

  const {
    handleSaveQuestion,
    handleDeleteQuestion
  } = useTestsQuestionActions({
    questionFormData,
    viewingQuestionEditor,
    showToast,
    setEditorQuestions,
    setViewingAddQuestionForm,
    setQuestionFormData
  });

  const {
    handleSubmit,
    handleBulkDelete,
    toggleStatus,
    toggleFeatured,
    handleViewResults,
    handleReevaluate,
    handleExportPDF,
    toggleSelectAll,
    toggleSelectTest
  } = useTestsCrudActions({
    editingTest,
    viewingTestSeries,
    courses,
    showToast,
    tests,
    setTests,
    loadData,
    setDetailTests,
    handleCloseModal,
    selectedTests,
    setSelectedTests,
    navigate,
    setActiveActionMenuId,
    activeTab,
    loadResults,
    paginatedTests
  });

  useTestsEffects({
    routeId,
    tests,
    courses,
    detailTests,
    location,
    setActiveTab,
    setViewingQuestionEditor,
    setEditingTest,
    setShowAddSingleTestDrawer,
    setResultFilters,
    setViewingTestSeries,
    viewingTestSeries,
    setDetailTests,
    viewingTestSeriesTab,
    setLoadingUsers,
    setSeriesUsers,
    viewingQuestionEditor,
    setBulkUploadData,
    setEditorQuestions,
    viewingAddQuestionForm,
    setQuestionFormData,
    loadData,
    showFloatingAddMenu,
    setShowFloatingAddMenu,
    showFloatingMoreMenu,
    setShowFloatingMoreMenu,
    activeActionMenuId,
    setActiveActionMenuId,
    activeMenu,
    setActiveMenu
  });











  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }





  const renderTestSeriesDetail = () => {
    if (!viewingTestSeries && !viewingQuestionEditor) return null;

    if (viewingQuestionEditor) {
      return (
        <TestsQuestionEditorView
          viewingQuestionEditor={viewingQuestionEditor}
          viewingTestSeries={viewingTestSeries}
          editorQuestions={editorQuestions}
          setEditorQuestions={setEditorQuestions}
          handleDeleteQuestion={handleDeleteQuestion}
          setViewingAddQuestionForm={setViewingAddQuestionForm}
          handleDragEnd={handleDragEnd}
          sensors={sensors}
          isBulkEditQuestionsOn={isBulkEditQuestionsOn}
          setIsBulkEditQuestionsOn={setIsBulkEditQuestionsOn}
          setActiveTab={setActiveTab}
          showToast={showToast}
          testsAPI={testsAPI}
          renderQuestionText={renderQuestionText}
          renderDiagram={(q, f, e) => renderDiagram(q, f, e, handleImageSelect, handleRemoveImage)}
          showFloatingAddMenu={showFloatingAddMenu}
          setShowFloatingAddMenu={setShowFloatingAddMenu}
          showFloatingMoreMenu={showFloatingMoreMenu}
          setShowFloatingMoreMenu={setShowFloatingMoreMenu}
          setShowBulkEditDrawer={setShowBulkEditDrawer}
          setShowBulkDeleteModal={setShowBulkDeleteModal}
          setSelectedBulkDeleteQuestions={setSelectedBulkDeleteQuestions}
          setActiveActionMenuId={setActiveActionMenuId}
          setViewingQuestionEditor={setViewingQuestionEditor}
        />
      );
    }

    return (
      <TestsSeriesDetailView
        viewingTestSeries={viewingTestSeries}
        viewingQuestionEditor={viewingQuestionEditor}
        detailSearchQuery={detailSearchQuery}
        setDetailSearchQuery={setDetailSearchQuery}
        detailFilterOpen={detailFilterOpen}
        setDetailFilterOpen={setDetailFilterOpen}
        detailFilters={detailFilters}
        setDetailFilters={setDetailFilters}
        showAddMenu={showAddMenu}
        setShowAddMenu={setShowAddMenu}
        handleSetViewingTestSeries={handleSetViewingTestSeries}
        setEditingTest={setEditingTest}
        setShowAddSingleTestDrawer={setShowAddSingleTestDrawer}
        setShowAddTestPDFDrawer={setShowAddTestPDFDrawer}
        setShowSubjectiveTestDrawer={setShowSubjectiveTestDrawer}
        detailSubTabs={detailSubTabs}
        viewingTestSeriesTab={viewingTestSeriesTab}
        setViewingTestSeriesTab={setViewingTestSeriesTab}
        detailTests={detailTests}
        activeActionMenuId={activeActionMenuId}
        setActiveActionMenuId={setActiveActionMenuId}
        setViewingQuestionEditor={setViewingQuestionEditor}
        navigate={navigate}
        handleViewResults={handleViewResults}
        handleDuplicateTest={handleDuplicateTest}
        handlePublish={handlePublish}
        handleExportPDF={handleExportPDF}
        setViewingReevaluateTest={setViewingReevaluateTest}
        handleDelete={handleDelete}
        toggleStatus={toggleStatus}
        expandedDropdownItem={expandedDropdownItem}
        setExpandedDropdownItem={setExpandedDropdownItem}
        seriesUsers={seriesUsers}
        loadingUsers={loadingUsers}
      />
    );
  };







  return (
    <div className="w-full bg-[#fafafa]">
      {/* Top Tabs Navigation as a Card - Hidden when viewing Test Series Details */}
      <TestsTopTabs
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewingTestSeries={viewingTestSeries}
      />

      {activeTab === "Results" ? (
        <TestsResultsWrapper
          results={results}
          resultFilters={resultFilters}
          setResultFilters={setResultFilters}
          resultsPageSize={resultsPageSize}
          setResultsPageSize={setResultsPageSize}
          resultsCurrentPage={resultsCurrentPage}
          setResultsCurrentPage={setResultsCurrentPage}
          tests={tests}
          showToast={showToast}
          setViewingStudentAnalysis={setViewingStudentAnalysis}
          loading={loading}
        />
      ) : activeTab === "Bulk Uploader" ? (
        <TestsBulkUploaderWrapper
          bulkUploadData={bulkUploadData}
          setBulkUploadData={setBulkUploadData}
          isParsing={isParsing}
          setIsParsing={setIsParsing}
          uploadProgress={uploadProgress}
          handleFinalBulkUpload={handleFinalBulkUpload}
          tests={tests}
          fileInputRef={fileInputRef}
          parseFile={parseFile}
          showToast={showToast}
          activeImageAssignment={activeImageAssignment}
          setActiveImageAssignment={setActiveImageAssignment}
          handleImageSelect={handleImageSelect}
          handleRemoveImage={handleRemoveImage}
          generateDOCX={generateDOCX}
          viewingTestSeries={viewingTestSeries}
          viewingQuestionEditor={viewingQuestionEditor}
          setActiveTab={setActiveTab}
        />
      ) : activeTab === "Reported Questions" ? (
        <TestsReportedWrapper
          reportedQuestions={reportedQuestions}
          reportedSearchQuery={reportedSearchQuery}
          setReportedSearchQuery={setReportedSearchQuery}
          reportedFilters={reportedFilters}
          setReportedFilters={setReportedFilters}
          reportedPageSize={reportedPageSize}
          setReportedPageSize={setReportedPageSize}
          reportedCurrentPage={reportedCurrentPage}
          setReportedCurrentPage={setReportedCurrentPage}
          selectedReportedIds={selectedReportedIds}
          setSelectedReportedIds={setSelectedReportedIds}
          handleBulkDeleteReports={handleBulkDeleteReports}
          handleQuickResolve={handleQuickResolve}
          handleDeleteReport={handleDeleteReport}
          isReportedFilterOpen={isReportedFilterOpen}
          setIsReportedFilterOpen={setIsReportedFilterOpen}
          loading={loading}
        />
      ) : viewingTestSeries ? (
        renderTestSeriesDetail()
      ) : (
        <>
          <TestsHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setCurrentPage={setCurrentPage}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={setIsFilterOpen}
            onAddClick={() => handleOpenModal()}
          />

          <div className="bg-white rounded-xl border border-gray-100 mb-6 shadow-sm">
            <div className="">
              <TestsListWrapper
                tests={paginatedTests}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                onView={(test) => handleSetViewingTestSeries(test)}
                onEdit={(test) => handleOpenModal(test)}
                onDuplicate={(test) => handleDuplicateTest(test)}
                onPublish={(id) => handlePublish(id)}
                onToggleStatus={(test) => toggleStatus(test)}
                onDelete={(id) => handleDelete(id)}
              />
            </div>

            {/* Standardized Pagination Footer */}
            <TestsPaginationFooter
              loading={loading}
              totalCount={filteredTests.length}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              totalPages={totalPages}
            />
          </div>
        </>
      )}


      <TestsModalRegistry
        viewingQuestionDetail={viewingQuestionDetail}
        setViewingQuestionDetail={setViewingQuestionDetail}
        renderQuestionText={renderQuestionText}
        viewingStudentAnalysis={viewingStudentAnalysis}
        setViewingStudentAnalysis={setViewingStudentAnalysis}
        results={results}
        showBulkDeleteModal={showBulkDeleteModal}
        setShowBulkDeleteModal={setShowBulkDeleteModal}
        selectedBulkDeleteQuestions={selectedBulkDeleteQuestions}
        setSelectedBulkDeleteQuestions={setSelectedBulkDeleteQuestions}
        editorQuestions={editorQuestions}
        setEditorQuestions={setEditorQuestions}
        viewingQuestionEditor={viewingQuestionEditor}
        showToast={showToast}
        loadData={loadData}
        viewingReevaluateTest={viewingReevaluateTest}
        setViewingReevaluateTest={setViewingReevaluateTest}
        handleReevaluate={handleReevaluate}
        viewingExportPDFTest={viewingExportPDFTest}
        setViewingExportPDFTest={setViewingExportPDFTest}
      />

      <TestsDrawers
        showModal={showModal}
        handleCloseModal={handleCloseModal}
        handleSubmit={handleSubmit}
        editingTest={editingTest}
        courses={courses}
        viewingTestSeries={viewingTestSeries}
        showAddSingleTestDrawer={showAddSingleTestDrawer}
        setShowAddSingleTestDrawer={setShowAddSingleTestDrawer}
        setEditingTest={setEditingTest}
        testSeries={testSeries}
        showToast={showToast}
        loadData={loadData}
        routeId={routeId}
        navigate={navigate}
        showAddTestPDFDrawer={showAddTestPDFDrawer}
        setShowAddTestPDFDrawer={setShowAddTestPDFDrawer}
        showSubjectiveTestDrawer={showSubjectiveTestDrawer}
        setShowSubjectiveTestDrawer={setShowSubjectiveTestDrawer}
        showAddTestPDFBulkDrawer={showAddTestPDFBulkDrawer}
        setShowAddTestPDFBulkDrawer={setShowAddTestPDFBulkDrawer}
        viewingAddQuestionForm={viewingAddQuestionForm}
        setViewingAddQuestionForm={setViewingAddQuestionForm}
        viewingQuestionEditor={viewingQuestionEditor}
        handleSaveQuestion={handleSaveQuestion}
        editorQuestions={editorQuestions}
        setEditorQuestions={setEditorQuestions}
        showBulkEditDrawer={showBulkEditDrawer}
        setShowBulkEditDrawer={setShowBulkEditDrawer}
      />
    </div>
  );
};

const TestsWithErrorBoundary: React.FC<Props> = (props) => (
  <TestsErrorBoundary showToast={props.showToast}>
    <Tests {...props} />
  </TestsErrorBoundary>
);

export default TestsWithErrorBoundary;
