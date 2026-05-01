import React from "react";

interface Props {
  viewingReevaluateTest: any;
  setViewingReevaluateTest: (val: any) => void;
  handleReevaluate: (test: any) => void;
}

const TestsReevaluateModal: React.FC<Props> = ({
  viewingReevaluateTest,
  setViewingReevaluateTest,
  handleReevaluate,
}) => {
  if (!viewingReevaluateTest) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFFFF]">
          <h3 className="text-[14px] font-bold text-gray-800 tracking-wide">
            Re-evaluate Attempts
          </h3>
          <button
            onClick={() => setViewingReevaluateTest(null)}
            className="text-gray-400 hover:text-black transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">
              close
            </span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
            You are about to re-evaluate all attempts for{" "}
            <strong>
              {viewingReevaluateTest.name ||
                viewingReevaluateTest.title ||
                "the selected test"}
            </strong>
            . This action will recalculate marks based on the latest answer keys.
          </p>
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500">info</span>
            <p className="text-[12px] font-semibold text-blue-800">
              12 attempts will be re-evaluated.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
          <button
            onClick={() => setViewingReevaluateTest(null)}
            className="px-5 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleReevaluate(viewingReevaluateTest);
              setViewingReevaluateTest(null);
            }}
            className="px-6 py-2 bg-black text-white rounded-xl text-[13px] font-bold shadow-md hover:bg-gray-800 transition-colors active:scale-95"
          >
            Confirm Re-evaluation
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestsReevaluateModal);
