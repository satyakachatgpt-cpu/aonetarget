import React from "react";
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

// Internal Sortable Item Component
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
      className={`flex items-center gap-6 p-4 border rounded-xl bg-white transition-all group ${isDragging ? "border-blue-400 shadow-xl scale-[1.02] cursor-grabbing" : "border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-move"}`}
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
          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
            {question.subject}
          </span>
        )}
      </div>
    </div>
  );
};

interface QuestionSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: any[];
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  onSave: () => Promise<void>;
}

const QuestionSortModal: React.FC<QuestionSortModalProps> = ({
  isOpen,
  onClose,
  questions,
  setQuestions,
  onSave,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((i) => (i.id || i._id) === active.id);
        const newIndex = items.findIndex((i) => (i.id || i._id) === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100000] flex items-center justify-center backdrop-blur-[2px] animate-in fade-in duration-300 p-6">
      <div className="w-full max-w-[750px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">
            Sort Question Order
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all"
          >
            <span className="material-symbols-outlined font-bold">close</span>
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
              items={questions.map((q) => q.id || q._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {questions.map((q, idx) => (
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
          {questions.length === 0 && (
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
            onClick={onClose}
            className="px-8 py-2.5 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={questions.length === 0}
            className="px-10 py-2.5 bg-[#4F46E5] text-white text-[13px] font-bold rounded-lg hover:bg-[#4338CA] transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionSortModal;
