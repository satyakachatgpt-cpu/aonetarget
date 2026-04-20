import React from "react";

interface QuestionEditorHeaderProps {
  testName: string;
  seriesName: string;
  onBack: () => void;
  onPublish: () => Promise<void>;
}

const QuestionEditorHeader: React.FC<QuestionEditorHeaderProps> = ({
  testName,
  seriesName,
  onBack,
  onPublish,
}) => {
  return (
    <div className="bg-white px-8 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-gray-900 flex items-center justify-center p-1 hover:bg-gray-50 rounded-full transition-all"
        >
          <span className="material-symbols-outlined font-black text-[22px]">
            arrow_back_ios_new
          </span>
        </button>
        <div>
          <h2 className="text-[18px] font-black text-gray-900 leading-tight">
            {testName}
          </h2>
          <p className="text-[12px] font-medium text-gray-400">
            {seriesName} Series
          </p>
        </div>
      </div>
      <button
        onClick={onPublish}
        className="flex items-center gap-2 px-6 py-2.5 bg-[#4361EE] text-white rounded-xl text-[13px] font-bold shadow-[0_4px_14px_0_rgba(67,97,238,0.39)] hover:bg-[#3451DE] transition-all active:scale-95"
      >
        <span className="material-symbols-outlined text-[19px]">sync</span>
        Publish Changes
      </button>
    </div>
  );
};

export default QuestionEditorHeader;
