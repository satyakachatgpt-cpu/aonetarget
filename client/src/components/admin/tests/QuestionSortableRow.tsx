import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuestionSortableRowProps {
  q: any;
  idx: number;
  setViewingAddQuestionForm: (val: any) => void;
  handleDeleteQuestion: (id: any) => void;
  viewingQuestionEditor: any;
}

const QuestionSortableRow: React.FC<QuestionSortableRowProps> = ({
  q,
  idx,
  setViewingAddQuestionForm,
  handleDeleteQuestion,
  viewingQuestionEditor,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id || q._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${
        isDragging ? "bg-blue-50" : "bg-white"
      } border-b border-gray-50 hover:bg-gray-50/80 transition-all group`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-black transition-colors focus:outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">
              drag_indicator
            </span>
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

export default QuestionSortableRow;
