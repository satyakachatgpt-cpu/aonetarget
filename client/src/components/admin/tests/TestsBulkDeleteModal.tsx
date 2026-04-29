import React from "react";
import { questionsAPI, testsAPI, invalidateCache } from "../../../services/apiClient";

interface Props {
  showBulkDeleteModal: boolean;
  setShowBulkDeleteModal: (val: boolean) => void;
  selectedBulkDeleteQuestions: number[];
  setSelectedBulkDeleteQuestions: (val: number[]) => void;
  editorQuestions: any[];
  setEditorQuestions: (val: any[]) => void;
  viewingQuestionEditor: any;
  showToast: (m: string, type?: "success" | "error") => void;
  loadData: () => void;
}

const TestsBulkDeleteModal: React.FC<Props> = ({
  showBulkDeleteModal,
  setShowBulkDeleteModal,
  selectedBulkDeleteQuestions,
  setSelectedBulkDeleteQuestions,
  editorQuestions,
  setEditorQuestions,
  viewingQuestionEditor,
  showToast,
  loadData,
}) => {
  if (!showBulkDeleteModal) return null;

  return (
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
            <span className="material-symbols-outlined font-bold">close</span>
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
                selectedBulkDeleteQuestions.length === editorQuestions.length &&
                editorQuestions.length > 0
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
                        selectedBulkDeleteQuestions.filter((i) => i !== idx),
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

        {/* Footer */}
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
  );
};

export default React.memo(TestsBulkDeleteModal);
