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
