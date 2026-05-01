import React from "react";
import QuestionEditorCard from "./QuestionEditorCard";

interface QuestionEditorListProps {
  questions: any[];
  renderQuestionText: (text: any) => React.ReactNode;
  onEditQuestion: (q: any) => void;
  onDeleteQuestion: (id: string | number) => void;
}

const QuestionEditorList: React.FC<QuestionEditorListProps> = ({
  questions,
  renderQuestionText,
  onEditQuestion,
  onDeleteQuestion,
}) => {
  const renderedQuestions = React.useMemo(() => {
    return (questions || []).map((q, idx) => (
      <QuestionEditorCard
        key={q._id || q.id || idx}
        index={idx}
        question={q}
        renderQuestionText={renderQuestionText}
        onEdit={onEditQuestion}
        onDelete={onDeleteQuestion}
      />
    ));
  }, [questions, renderQuestionText, onEditQuestion, onDeleteQuestion]);

  return (
    <div className="space-y-6">
      {renderedQuestions}
      {questions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-20 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px] text-gray-200">
              quiz
            </span>
          </div>
          <h3 className="text-[18px] font-bold text-gray-800 mb-2">
            No Questions Yet
          </h3>
          <p className="text-[14px] font-medium text-gray-400 max-w-xs mx-auto">
            This test doesn't have any questions. Use the "Add" button above to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(QuestionEditorList);
