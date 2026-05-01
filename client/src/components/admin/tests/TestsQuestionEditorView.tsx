import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import QuestionEditorToolbar from './QuestionEditorToolbar';
import QuestionEditorListWrapper from './QuestionEditorListWrapper';
import QuestionSortableRow from './QuestionSortableRow';

const SortableRow = (props: any) => <QuestionSortableRow {...props} />;

interface Props {
  viewingQuestionEditor: any;
  viewingTestSeries: any;
  editorQuestions: any[];
  setEditorQuestions: (qs: any[]) => void;
  handleDeleteQuestion: (id: string | number) => Promise<void>;
  setViewingAddQuestionForm: (form: any) => void;
  handleDragEnd: (event: any) => Promise<void>;
  sensors: any;
  isBulkEditQuestionsOn: boolean;
  setIsBulkEditQuestionsOn: (val: boolean) => void;
  setActiveTab: (tab: string) => void;
  showToast: (m: string, type?: "success" | "error") => void;
  testsAPI: any;
  renderQuestionText: (text: any) => any;
  renderDiagram: (q: any, field?: string, isEditable?: boolean) => any;
  // Additional props needed by QuestionEditorToolbar
  showFloatingAddMenu: boolean;
  setShowFloatingAddMenu: (val: boolean) => void;
  showFloatingMoreMenu: boolean;
  setShowFloatingMoreMenu: (val: boolean) => void;
  setShowBulkEditDrawer: (val: boolean) => void;
  setShowBulkDeleteModal: (val: boolean) => void;
  setSelectedBulkDeleteQuestions: (val: any) => void;
  setActiveActionMenuId: (val: any) => void;
  setViewingQuestionEditor: (val: any) => void;
}

const TestsQuestionEditorView: React.FC<Props> = ({
  viewingQuestionEditor,
  viewingTestSeries,
  editorQuestions,
  setEditorQuestions,
  handleDeleteQuestion,
  setViewingAddQuestionForm,
  handleDragEnd,
  sensors,
  isBulkEditQuestionsOn,
  setIsBulkEditQuestionsOn,
  setActiveTab,
  showToast,
  testsAPI,
  renderQuestionText,
  renderDiagram,
  showFloatingAddMenu,
  setShowFloatingAddMenu,
  showFloatingMoreMenu,
  setShowFloatingMoreMenu,
  setShowBulkEditDrawer,
  setShowBulkDeleteModal,
  setSelectedBulkDeleteQuestions,
  setActiveActionMenuId,
  setViewingQuestionEditor,
}) => {
  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen pb-20 animate-in fade-in duration-500">
      <QuestionEditorToolbar
        viewingQuestionEditor={viewingQuestionEditor}
        viewingTestSeries={viewingTestSeries}
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
        editorQuestionsCount={editorQuestions.length}
        showFloatingAddMenu={showFloatingAddMenu}
        setShowFloatingAddMenu={setShowFloatingAddMenu}
        showFloatingMoreMenu={showFloatingMoreMenu}
        setShowFloatingMoreMenu={setShowFloatingMoreMenu}
        setViewingAddQuestionForm={setViewingAddQuestionForm}
        setActiveTab={setActiveTab}
        setShowBulkEditDrawer={setShowBulkEditDrawer}
        setShowBulkDeleteModal={setShowBulkDeleteModal}
        setSelectedBulkDeleteQuestions={setSelectedBulkDeleteQuestions}
        isBulkEditQuestionsOn={isBulkEditQuestionsOn}
        setIsBulkEditQuestionsOn={setIsBulkEditQuestionsOn}
        setActiveActionMenuId={setActiveActionMenuId}
      />

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
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
          <QuestionEditorListWrapper
            questions={editorQuestions}
            renderQuestionText={renderQuestionText}
            renderDiagram={renderDiagram}
            setViewingAddQuestionForm={setViewingAddQuestionForm}
            handleDeleteQuestion={handleDeleteQuestion}
          />
        )}
      </div>
    </div>
  );
};

export default TestsQuestionEditorView;
