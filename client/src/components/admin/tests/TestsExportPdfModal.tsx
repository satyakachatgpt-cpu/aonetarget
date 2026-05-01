import React from "react";

interface Props {
  viewingExportPDFTest: any;
  setViewingExportPDFTest: (val: any) => void;
  showToast: (m: string, type?: "success" | "error") => void;
}

const TestsExportPdfModal: React.FC<Props> = ({
  viewingExportPDFTest,
  setViewingExportPDFTest,
  showToast,
}) => {
  if (!viewingExportPDFTest) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FFFFFF]">
          <h3 className="text-[14px] font-bold text-gray-800 tracking-wide">
            {viewingExportPDFTest.exportMode === "with_solution"
              ? "Export PDF with Solutions"
              : "Export PDF without Solutions"}
          </h3>
          <button
            onClick={() => setViewingExportPDFTest(null)}
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
            Generating a PDF formatted file for{" "}
            <strong>
              {viewingExportPDFTest.name ||
                viewingExportPDFTest.title ||
                "the selected test"}
            </strong>
            .<br />
            <br />
            This file{" "}
            {viewingExportPDFTest.exportMode === "with_solution"
              ? "will include detailed solutions for all questions."
              : "will only contain the questions and multiple choices."}
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
          <button
            onClick={() => setViewingExportPDFTest(null)}
            className="px-5 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              showToast("PDF generation started successfully!");
              setViewingExportPDFTest(null);
            }}
            className="px-6 py-2 bg-black text-white rounded-xl text-[13px] font-bold shadow-md hover:bg-gray-800 transition-colors active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestsExportPdfModal);
