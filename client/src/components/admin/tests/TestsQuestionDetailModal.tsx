import React from "react";

interface Props {
  viewingQuestionDetail: any;
  setViewingQuestionDetail: (val: any) => void;
  renderQuestionText: (text: any) => React.ReactNode;
}

const TestsQuestionDetailModal: React.FC<Props> = ({
  viewingQuestionDetail,
  setViewingQuestionDetail,
  renderQuestionText,
}) => {
  if (!viewingQuestionDetail) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[1rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFFFF]">
          <h3 className="text-[14px] font-bold text-gray-800 tracking-wide">
            {viewingQuestionDetail.badge || "Question Detail"}
          </h3>
          <button
            onClick={() => setViewingQuestionDetail(null)}
            className="text-gray-400 hover:text-black transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
          {/* Question */}
          <div className="flex gap-4">
            <span className="text-[13px] font-bold text-gray-800 min-w-[70px]">
              Question <span className="float-right">:</span>
            </span>
            <div className="space-y-4">
              <p className="text-[13px] font-medium text-gray-700 leading-relaxed max-w-[900px]">
                {renderQuestionText(viewingQuestionDetail.textEn)}
              </p>
              {viewingQuestionDetail.textHi && (
                <p className="text-[15px] font-medium text-gray-800 leading-relaxed font-hindi max-w-[900px]">
                  {renderQuestionText(viewingQuestionDetail.textHi)}
                </p>
              )}
              {viewingQuestionDetail.image && (
                <div className="mt-2 text-center">
                  <img
                    src={viewingQuestionDetail.image}
                    alt="Question figure"
                    className="max-w-[150px] border border-gray-200 p-2 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="h-[1px] w-full bg-gray-100"></div>

          {/* Options */}
          <div className="flex gap-4">
            <span className="text-[13px] font-bold text-gray-800 min-w-[70px]">
              Options
            </span>
          </div>

          {/* Dynamic Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8 ml-[86px] max-w-[800px]">
            {viewingQuestionDetail.options?.map((opt: string, i: number) => {
              const isCorrect =
                viewingQuestionDetail.correctAnswer ===
                String.fromCharCode(65 + i);
              return (
                <div key={i}>
                  <div className="mb-2 text-[13px] font-bold text-gray-800">
                    Option {i + 1} :
                  </div>
                  <div
                    className={`${isCorrect ? "bg-[#D5E8D4]/40 border-[2px] border-[#82B366] text-[#2E7D32]" : "text-gray-600"} px-3 py-2 rounded-xl text-[12px] font-bold flex flex-col items-center justify-center min-h-[50px] shadow-sm`}
                  >
                    {opt}
                    {isCorrect && (
                      <span className="material-symbols-outlined text-[16px] mt-1 font-black">
                        check
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-[1px] w-full bg-gray-100"></div>

          {/* Solution */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="text-[13px] font-bold text-gray-800 min-w-[120px]">
                Solution Heading <span className="float-right">:</span>
              </span>
              <span className="text-[13px] text-gray-700">Full Solution</span>
            </div>
            <div className="flex gap-4">
              <span className="text-[13px] font-bold text-gray-800 min-w-[120px]">
                Text <span className="float-right">:</span>
              </span>
              <span className="text-[13px] text-gray-700">
                {viewingQuestionDetail.solution || ""}
              </span>
            </div>
          </div>

          <div className="h-[1px] w-full bg-gray-100"></div>

          {/* Bottom Properties */}
          <div className="flex items-center justify-center gap-6 border border-gray-200 rounded-2xl px-8 py-4 bg-white shadow-sm w-fit mx-auto mt-2 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-gray-500">
                Section :
              </span>
              <span className="text-[13px] font-medium text-gray-800">
                {viewingQuestionDetail.section || "N/A"}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-gray-500">
                Positive Marks :
              </span>
              <span className="text-[13px] font-medium text-gray-800">
                {viewingQuestionDetail.positiveMarks || "0.00"}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-gray-500">
                Negative Marks :
              </span>
              <span className="text-[13px] font-medium text-gray-800">
                {viewingQuestionDetail.negativeMarks || "0.00"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestsQuestionDetailModal);
