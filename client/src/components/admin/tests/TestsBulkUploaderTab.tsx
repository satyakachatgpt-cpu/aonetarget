import React from "react";

interface TestsBulkUploaderTabProps {
  bulkUploadData: {
    format: string;
    testSeries: string;
    testTitle: string;
    file: File | null;
  };
  setBulkUploadData: (data: any) => void;
  courses: any[];
  tests: any[];
  isParsing: boolean;
  previewQuestions: any[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProceedToUpload: () => Promise<void>;
  onDownloadDOCX: () => void;
  setViewingPaperQuestions: (questions: any[] | null) => void;
  renderQuestionText: (text: string) => React.ReactNode;
  renderDiagram: (q: any, optLabel?: string) => React.ReactNode;
}

const TestsBulkUploaderTab: React.FC<TestsBulkUploaderTabProps> = ({
  bulkUploadData,
  setBulkUploadData,
  courses,
  tests,
  isParsing,
  previewQuestions,
  onFileUpload,
  onProceedToUpload,
  onDownloadDOCX,
  setViewingPaperQuestions,
  renderQuestionText,
  renderDiagram,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Configuration & File Upload */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-8 space-y-6 self-start">
          <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">
                settings
              </span>
              Bulk Upload Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-gray-500">
                  Select Format
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: "default", label: "Default Format" },
                    { id: "upsc", label: "UPSC Format" },
                    { id: "railway", label: "Railway Format" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() =>
                        setBulkUploadData({ ...bulkUploadData, format: fmt.id })
                      }
                      className={`h-11 px-4 flex items-center gap-3 rounded-xl border text-[13px] font-bold transition-all ${bulkUploadData.format === fmt.id ? "bg-black text-white border-black shadow-md" : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200"}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {bulkUploadData.format === fmt.id
                          ? "radio_button_checked"
                          : "radio_button_unchecked"}
                      </span>
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-gray-500">
                    Target Test Series
                  </label>
                  <select
                    value={bulkUploadData.testSeries}
                    onChange={(e) =>
                      setBulkUploadData({
                        ...bulkUploadData,
                        testSeries: e.target.value,
                        testTitle: "",
                      })
                    }
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-medium outline-none focus:border-black appearance-none"
                  >
                    <option value="">--Select Series--</option>
                    {courses.map((c) => (
                      <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>
                        {c.name || c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-gray-500">
                    Target Test
                  </label>
                  <select
                    disabled={!bulkUploadData.testSeries}
                    value={bulkUploadData.testTitle}
                    onChange={(e) =>
                      setBulkUploadData({
                        ...bulkUploadData,
                        testTitle: e.target.value,
                      })
                    }
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-medium outline-none focus:border-black appearance-none disabled:opacity-50"
                  >
                    <option value="">--Select Test--</option>
                    {tests
                      .filter(
                        (t) =>
                          t.courseId === bulkUploadData.testSeries ||
                          (t as any).testSeriesId === bulkUploadData.testSeries,
                      )
                      .map((t) => (
                        <option key={t.id || (t as any)._id} value={t.id || (t as any)._id}>
                          {t.name || t.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-gray-800 tracking-tight flex items-center gap-2 pt-4 border-t border-gray-50">
              <span className="material-symbols-outlined text-purple-500">
                cloud_upload
              </span>
              Upload File
            </h3>
            <div className="relative group">
              <input
                type="file"
                accept=".docx,.xlsx,.xls,.pdf"
                onChange={onFileUpload}
                className="hidden"
                id="bulk-file-input"
              />
              <label
                htmlFor="bulk-file-input"
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-12 px-6 transition-all cursor-pointer ${
                  bulkUploadData.file
                    ? "bg-purple-50/50 border-purple-200"
                    : "bg-gray-50/50 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[32px] text-purple-500">
                    {bulkUploadData.file ? "description" : "upload_file"}
                  </span>
                </div>
                {bulkUploadData.file ? (
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-gray-800">
                      {bulkUploadData.file.name}
                    </p>
                    <p className="text-[12px] font-medium text-gray-400 mt-1">
                      {(bulkUploadData.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-gray-800">
                      Click to upload question file
                    </p>
                    <p className="text-[12px] font-medium text-gray-400 mt-1">
                      Supports Word (.docx), Excel (.xlsx) or PDF
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col min-h-[580px] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400">
                preview
              </span>
              <h3 className="text-[15px] font-bold text-gray-800">
                Question Preview
              </h3>
              <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] font-black text-gray-400">
                {previewQuestions.length} Questions Found
              </span>
            </div>
            {previewQuestions.length > 0 && (
              <button
                onClick={() => setViewingPaperQuestions(previewQuestions)}
                className="text-[12px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">
                  visibility
                </span>
                Full Preview
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] bg-gray-50/20">
            {isParsing ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-100 border-t-purple-500 rounded-full animate-spin"></div>
                <p className="text-[14px] font-bold text-gray-400 italic">
                  Parsing file questions...
                </p>
              </div>
            ) : previewQuestions.length > 0 ? (
              <div className="divide-y divide-gray-100 p-2">
                {previewQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 hover:bg-gray-50/50 transition-colors group"
                  >
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
                      <div className="flex border-b border-gray-100">
                        <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                          Question
                        </div>
                        <div className="p-2.5 text-[12px] font-bold text-gray-800 flex-1 leading-relaxed">
                          {renderQuestionText(q.questionEn)}
                        </div>
                      </div>
                      <div className="flex border-b border-gray-100">
                        <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                          Type
                        </div>
                        <div className="p-2.5 text-[11px] text-gray-600 font-bold">
                          {q.type || "multiple_choice"}
                        </div>
                      </div>
                      {q.options.map((o: string, i: number) => {
                        const label = String.fromCharCode(65 + i);
                        return (
                          <div
                            key={i}
                            className="flex border-b border-gray-100 last:border-b-0"
                          >
                            <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                              Option {label}
                            </div>
                            <div className="p-2.5 text-[11px] text-gray-700 font-bold flex-1 flex flex-col gap-2">
                              <div className="flex gap-2">
                                <span className="text-gray-300 shrink-0">
                                  {label}.
                                </span>
                                {renderQuestionText(o)}
                              </div>
                              {renderDiagram(q, label)}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex border-t border-gray-100 bg-[#f8fffe]">
                        <div className="w-24 bg-[#f0f9f7] p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                          Answer
                        </div>
                        <div className="p-2.5 text-[11px] text-emerald-700 font-black">
                          {q.correctAnswer}
                        </div>
                      </div>
                      <div className="flex border-t border-gray-100">
                        <div className="w-24 bg-gray-50 p-2.5 text-[10px] font-black text-gray-400 uppercase border-r border-gray-100 shrink-0">
                          Solution
                        </div>
                        <div className="p-2.5 text-[11px] text-gray-500 italic flex-1">
                          {renderQuestionText(q.solution)}
                        </div>
                      </div>

                      {renderDiagram(q)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isParsing && (
                <div className="py-20 text-center space-y-3">
                  <span className="material-symbols-outlined text-[48px] text-gray-200">
                    find_in_page
                  </span>
                  <p className="text-[13px] font-medium text-gray-400">
                    No questions found in this file.
                    <br />
                    Try DOCX or Excel format.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Footer action */}
          <div className="px-6 py-5 border-t border-gray-100 bg-white grid grid-cols-2 gap-4">
            <button
              disabled={previewQuestions.length === 0}
              onClick={onProceedToUpload}
              className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-tighter transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
            >
              PROCEED TO UPLOAD ({previewQuestions.length})
            </button>

            <button
              disabled={previewQuestions.length === 0}
              onClick={onDownloadDOCX}
              className="w-full flex items-center justify-center gap-2 py-3.5 border border-emerald-100 text-[#1a7a5e] hover:bg-[#1a7a5e]/5 transition-all duration-300 font-bold text-[13px] rounded-xl uppercase tracking-tighter disabled:opacity-30 shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">
                file_download
              </span>
              DOCX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestsBulkUploaderTab;
