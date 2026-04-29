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
import TestsResultsView from "./tests/TestsResultsView";
import TestsReportedView from "./tests/TestsReportedView";
import TestsBulkUploaderView from "./tests/TestsBulkUploaderView";
import TestsQuestionEditorView from "./tests/TestsQuestionEditorView";
import TestsSeriesDetailView from "./tests/TestsSeriesDetailView";
import { parseFile, extractQuestionsFromText } from "@/utils/testParser";
import { useTestsQuestionActions } from "@/hooks/useTestsQuestionActions";
import { useTestsCrudActions } from "@/hooks/useTestsCrudActions";
import { useTestsEffects } from "@/hooks/useTestsEffects";
import { generateDOCX } from "./DOCXGenerator";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
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
import TestsQuestionDetailModal from "./tests/TestsQuestionDetailModal";
import TestsStudentAnalysisModal from "./tests/TestsStudentAnalysisModal";
import TestsBulkDeleteModal from "./tests/TestsBulkDeleteModal";
import TestsReevaluateModal from "./tests/TestsReevaluateModal";
import TestsExportPdfModal from "./tests/TestsExportPdfModal";
import TestsDrawers from "./tests/TestsDrawers";
import TestsTopTabs from "./tests/TestsTopTabs";
import TestsPaginationFooter from "./tests/TestsPaginationFooter";

// Configure PDF.js worker (moved to testParser.ts)

const tabs = ["Tests", "Results", "Bulk Uploader", "Reported Questions"];
const detailSubTabs = ["Tests", "Users"] as const;

type DetailSubTab = (typeof detailSubTabs)[number];

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
  const { "*": routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  const [activeTab, setActiveTab] = useState("Tests");

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



  // Sync viewingTestSeries with route
  const handleSetViewingTestSeries = useCallback((val: any) => {
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
    } catch (error) {
      console.error("Error in handleSetViewingTestSeries:", error);
    }
  }, [location.pathname, navigate]);

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
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-black hover:text-black cursor-pointer transition-all bg-white">
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Upload Image</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setTimeout(() => handleImageSelect(ev.target?.result as string, { questionId: q.id, field }), 0);
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
              <label className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors cursor-pointer bg-white px-2 py-1 rounded">
                <span className="material-symbols-outlined text-[14px]">upload_file</span> Change Image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setTimeout(() => handleImageSelect(ev.target?.result as string, { questionId: q.id, field }), 0);
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



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  const renderResultsTab = () => (
    <TestsResultsView
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
  );

  const renderReportedQuestionsTab = () => (
    <TestsReportedView
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
  );

  const renderBulkUploaderTab = () => (
    <TestsBulkUploaderView
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
  );

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
          renderDiagram={renderDiagram}
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
        renderResultsTab()
      ) : activeTab === "Bulk Uploader" ? (
        renderBulkUploaderTab()
      ) : activeTab === "Reported Questions" ? (
        renderReportedQuestionsTab()
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


      <TestsQuestionDetailModal
        viewingQuestionDetail={viewingQuestionDetail}
        setViewingQuestionDetail={setViewingQuestionDetail}
        renderQuestionText={renderQuestionText}
      />

      <TestsStudentAnalysisModal
        viewingStudentAnalysis={viewingStudentAnalysis}
        setViewingStudentAnalysis={setViewingStudentAnalysis}
        results={results}
      />

      <TestsBulkDeleteModal
        showBulkDeleteModal={showBulkDeleteModal}
        setShowBulkDeleteModal={setShowBulkDeleteModal}
        selectedBulkDeleteQuestions={selectedBulkDeleteQuestions}
        setSelectedBulkDeleteQuestions={setSelectedBulkDeleteQuestions}
        editorQuestions={editorQuestions}
        setEditorQuestions={setEditorQuestions}
        viewingQuestionEditor={viewingQuestionEditor}
        showToast={showToast}
        loadData={loadData}
      />

      <TestsReevaluateModal
        viewingReevaluateTest={viewingReevaluateTest}
        setViewingReevaluateTest={setViewingReevaluateTest}
        handleReevaluate={handleReevaluate}
      />

      <TestsExportPdfModal
        viewingExportPDFTest={viewingExportPDFTest}
        setViewingExportPDFTest={setViewingExportPDFTest}
        showToast={showToast}
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
