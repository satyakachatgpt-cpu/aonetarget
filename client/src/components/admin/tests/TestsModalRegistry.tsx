import React from "react";
import TestsQuestionDetailModal from "./TestsQuestionDetailModal";
import TestsStudentAnalysisModal from "./TestsStudentAnalysisModal";
import TestsBulkDeleteModal from "./TestsBulkDeleteModal";
import TestsReevaluateModal from "./TestsReevaluateModal";
import TestsExportPdfModal from "./TestsExportPdfModal";

interface TestsModalRegistryProps {
  viewingQuestionDetail: any;
  setViewingQuestionDetail: (val: any) => void;
  renderQuestionText: (text: any) => any;
  
  viewingStudentAnalysis: any;
  setViewingStudentAnalysis: (val: any) => void;
  results: any[];
  
  showBulkDeleteModal: boolean;
  setShowBulkDeleteModal: (val: boolean) => void;
  selectedBulkDeleteQuestions: number[];
  setSelectedBulkDeleteQuestions: (val: number[]) => void;
  editorQuestions: any[];
  setEditorQuestions: (val: any) => void;
  viewingQuestionEditor: any;
  showToast: (m: string, type?: "success" | "error") => void;
  loadData: () => void;
  
  viewingReevaluateTest: any;
  setViewingReevaluateTest: (val: any) => void;
  handleReevaluate: (test: any) => void;
  
  viewingExportPDFTest: any;
  setViewingExportPDFTest: (val: any) => void;
}

const TestsModalRegistry: React.FC<TestsModalRegistryProps> = ({
  viewingQuestionDetail,
  setViewingQuestionDetail,
  renderQuestionText,
  viewingStudentAnalysis,
  setViewingStudentAnalysis,
  results,
  showBulkDeleteModal,
  setShowBulkDeleteModal,
  selectedBulkDeleteQuestions,
  setSelectedBulkDeleteQuestions,
  editorQuestions,
  setEditorQuestions,
  viewingQuestionEditor,
  showToast,
  loadData,
  viewingReevaluateTest,
  setViewingReevaluateTest,
  handleReevaluate,
  viewingExportPDFTest,
  setViewingExportPDFTest
}) => {
  return (
    <>
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
    </>
  );
};

export default TestsModalRegistry;
