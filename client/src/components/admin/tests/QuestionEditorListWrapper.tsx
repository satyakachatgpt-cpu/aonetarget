import React from 'react';

interface QuestionEditorListWrapperProps {
  questions: any[];
  renderQuestionText: (text: any) => React.ReactNode;
  renderDiagram: (q: any, type?: string) => React.ReactNode;
  setViewingAddQuestionForm: (q: any) => void;
  handleDeleteQuestion: (id: string) => void;
}

const QuestionEditorListWrapper: React.FC<QuestionEditorListWrapperProps> = ({
  questions,
  renderQuestionText,
  renderDiagram,
  setViewingAddQuestionForm,
  handleDeleteQuestion
}) => {
  return (
    <div className="space-y-6">
      {(questions || []).map((q, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 relative"
        >
          {/* Top Right Buttons inside card */}
          <div className="absolute top-8 right-8 flex items-center gap-4">
            <button
              onClick={() => setViewingAddQuestionForm(q)}
              className="flex items-center gap-2 px-4 py-1.5 border border-gray-100 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                edit_note
              </span>
              Edit
            </button>
            <button
              onClick={() =>
                handleDeleteQuestion(q.id || (q as any)._id)
              }
              className="w-9 h-9 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">
                delete
              </span>
            </button>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <span className="text-[16px] font-black text-gray-800 shrink-0 leading-[1.6]">
                {idx + 1}.
              </span>
              <div className="flex-1">
                <div className="text-[16px] font-bold text-gray-800 leading-[1.6] pr-64">
                  {renderQuestionText(
                    q?.questionEn || "No question text",
                  )}
                </div>
                {q?.questionHi && (
                  <div className="text-[16px] font-medium text-gray-500 mt-2 leading-[1.6]">
                    {renderQuestionText(q.questionHi)}
                  </div>
                )}
                <div className="max-w-[400px]">
                  {renderDiagram(q)}
                </div>
              </div>
            </div>

            {/* Options Grid */}
            <div className="pl-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {(q?.displayOptions || []).map(
                (opt: any, oidx: number) => {
                  const optionLabel = String.fromCharCode(65 + oidx);
                  const isCorrect = q?.correctAnswer
                    ? q.correctAnswer.toUpperCase() === optionLabel
                    : !!opt?.isCorrect;
                  return (
                    <div
                      key={oidx}
                      className={`rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col ${isCorrect ? "border-[#82B366] ring-1 ring-[#82B366]/20" : "border-gray-100"}`}
                    >
                      <div
                        className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${isCorrect ? "bg-[#D5E8D4]/40 border-[#82B366] text-[#2E7D32]" : "bg-[#fcfcfc] border-gray-100 text-gray-500"}`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest">
                          Option {optionLabel}
                        </span>
                        {isCorrect && (
                          <span className="material-symbols-outlined text-[18px] font-black">
                            check_circle
                          </span>
                        )}
                      </div>
                      <div className="p-8 flex-1 flex flex-col items-center justify-center min-h-[100px] gap-3 text-[15px] font-bold text-gray-700 text-center leading-relaxed">
                        {renderQuestionText(opt?.text || "")}
                        {(opt?.image || q[`option${optionLabel}Image`]) && (
                          <img
                            src={opt?.image || q[`option${optionLabel}Image`]}
                            alt={`Option ${optionLabel}`}
                            className="max-w-full max-h-[160px] object-contain rounded-lg border border-gray-100 mt-1"
                          />
                        )}
                        {!opt?.text && !(opt?.image || q[`option${optionLabel}Image`]) && (
                          <span className="text-gray-300">Option Text</span>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {/* Answer Key & Solution */}
            <div className="mt-8 pt-8 border-t border-gray-50 bg-[#F9FAFB]/50 rounded-b-xl p-8 ml-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                   <span className="material-symbols-outlined text-[20px] font-black">task_alt</span>
                </div>
                <span className="text-[14px] font-black text-emerald-800 uppercase tracking-widest">
                  Correct Answer: {q.correctAnswer}
                </span>
              </div>
              
              {(q.solution || q.solutionEn) && (
                <div className="space-y-4">
                  <div className="text-[14px] text-gray-600 leading-relaxed font-medium">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2">Detailed Explanation</span>
                    <div className="bg-white/80 p-4 rounded-xl border border-gray-100 italic">
                        {renderQuestionText(q.solutionEn || (typeof q.solution === 'string' ? q.solution : q.solution?.text) || "No explanation provided.")}
                    </div>
                  </div>
                  <div className="max-w-[400px]">
                    {renderDiagram(q, 'solution')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(QuestionEditorListWrapper);
