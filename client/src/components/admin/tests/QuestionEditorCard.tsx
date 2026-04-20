import React from "react";

interface QuestionEditorCardProps {
  question: any;
  index: number;
  renderQuestionText: (text: any) => React.ReactNode;
  onEdit: (q: any) => void;
  onDelete: (id: string | number) => void;
}

const QuestionEditorCard: React.FC<QuestionEditorCardProps> = ({
  question: q,
  index,
  renderQuestionText,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 relative group">
      {/* Top Right Buttons inside card */}
      <div className="absolute top-8 right-8 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-sm uppercase text-[10px] font-black tracking-wider border border-[#C8E6C9]">
            +{Number(q?.marks || 1).toFixed(2)}
          </span>
          <span className="px-2.5 py-1 bg-[#FFEBEE] text-[#C62828] rounded-sm uppercase text-[10px] font-black tracking-wider border border-[#FFCDD2]">
            -{Number(q?.negative || 0).toFixed(2)}
          </span>
        </div>
        <button
          onClick={() => onEdit(q)}
          className="flex items-center gap-2 px-4 py-1.5 border border-gray-100 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            edit_note
          </span>
          Edit
        </button>
        <button
          onClick={() => onDelete(q.id || (q as any)._id)}
          className="w-9 h-9 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>

      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <span className="text-[16px] font-black text-gray-800 shrink-0 leading-[1.6]">
            {index + 1}.
          </span>
          <div className="flex-1">
            <div className="text-[16px] font-bold text-gray-800 leading-[1.6] pr-64">
              {renderQuestionText(q?.questionEn || "No question text")}
            </div>
            {q?.questionHi && (
              <div className="text-[16px] font-medium text-gray-500 mt-2 leading-[1.6]">
                {renderQuestionText(q.questionHi)}
              </div>
            )}
          </div>
        </div>

        {/* Options Grid */}
        <div className="pl-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {(q?.displayOptions || []).map((opt: any, oidx: number) => {
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
          })}
        </div>
      </div>
    </div>
  );
};

export default QuestionEditorCard;
