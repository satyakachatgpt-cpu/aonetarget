import React from "react";
import CustomDropdown from "./shared/CustomDropdown";
import { renderQuestionText, renderDiagram } from "./shared/TestUtils";

interface TestsBulkUploaderTabProps {
  bulkUploadData: any;
  setBulkUploadData: (data: any) => void;
  isParsing: boolean;
  setIsParsing: (val: boolean) => void;
  uploadProgress: number;
  handleFinalBulkUpload: () => void;
  tests: any[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  parseFile: (file: File) => Promise<{ questions: any[]; extractedImages: string[] }>;
  showToast: (msg: string, type?: "success" | "error") => void;
  activeImageAssignment: any;
  setActiveImageAssignment: (val: any) => void;
  handleImageSelect: (dataUrl: string, assignment: { questionId: any; field: string }) => void;
  handleRemoveImage: (qId: any, field: string) => void;
  generateDOCX: (questions: any[], format: string, filename: string) => void;
  viewingTestSeries: any;
  viewingQuestionEditor: any;
  setActiveTab: (tab: string) => void;
}

const TestsBulkUploaderTab: React.FC<TestsBulkUploaderTabProps> = ({
  bulkUploadData,
  setBulkUploadData,
  isParsing,
  setIsParsing,
  uploadProgress,
  handleFinalBulkUpload,
  tests,
  fileInputRef,
  parseFile,
  showToast,
  activeImageAssignment,
  setActiveImageAssignment,
  handleImageSelect,
  handleRemoveImage,
  generateDOCX,
  viewingTestSeries,
  viewingQuestionEditor,
  setActiveTab,
}) => {
  const previewQuestions =
    bulkUploadData.parsedQuestions && bulkUploadData.parsedQuestions.length > 0
      ? bulkUploadData.parsedQuestions
      : [];

  const extractedImages = bulkUploadData.extractedImages || [];

  const formats = [
    {
      key: "default",
      label: "Default",
      image: "/attach-assist/default.jpg",
      download: "/attach-assist/format-default.docx",
    },
    {
      key: "format1",
      label: "Format 1",
      image: "/attach-assist/format1.jpg",
      download: "/attach-assist/format-1.docx",
    },
    {
      key: "format2",
      label: "Format 2",
      image: "/attach-assist/format2.jpg",
      download: "/attach-assist/format-2.docx",
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Back Button for Contextual Access */}
      {(viewingTestSeries || viewingQuestionEditor) && (
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setActiveTab("Tests")}
            className="flex items-center gap-2 px-4 h-9 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 hover:border-black hover:text-black transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back to{" "}
            {viewingQuestionEditor
              ? "Question Editor"
              : viewingTestSeries?.name || "Series"}
          </button>
          <div className="h-4 w-[1px] bg-gray-200"></div>
          <p className="text-[12px] font-medium text-gray-400">
            Bulk uploading questions to{" "}
            <span className="text-black font-bold">
              {viewingQuestionEditor?.name || viewingTestSeries?.name}
            </span>
          </p>
        </div>
      )}

      {/* Extracted Image Gallery */}
      {extractedImages.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-black">
                collections
              </span>
              <h3 className="text-[16px] font-bold text-gray-800">
                Extracted Image Gallery
              </h3>
              <span className="px-2.5 py-0.5 bg-gray-100 rounded-full text-[11px] font-bold text-gray-500">
                {extractedImages.length} Images Found
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium italic">
              Click an image to view full size
            </p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {extractedImages.map((img: string, idx: number) => (
              <div
                key={idx}
                className="flex-shrink-0 w-32 h-32 rounded-xl border-2 border-gray-100 overflow-hidden bg-gray-50 hover:border-black transition-all cursor-pointer relative group"
                onClick={() => {
                  if (activeImageAssignment) {
                    handleImageSelect(img, activeImageAssignment);
                  }
                }}
              >
                <img
                  src={img}
                  alt={`Extracted ${idx}`}
                  className="w-full h-full object-contain p-2"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">
                    Select
                  </span>
                </div>
              </div>
            ))}
          </div>
          {activeImageAssignment && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">
                  info
                </span>
                <span className="text-[12px] font-bold text-amber-700 uppercase tracking-tight">
                  Select an image from gallery for Question{" "}
                  {activeImageAssignment.questionId} -{" "}
                  {activeImageAssignment.field === "question"
                    ? "Main Diagram"
                    : `Option ${activeImageAssignment.field}`}
                </span>
              </div>
              <button
                onClick={() => setActiveImageAssignment(null)}
                className="text-[11px] font-black text-amber-600 hover:text-amber-800 underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`flex gap-5 items-start`}>
        {/* LEFT: Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 space-y-5 flex-1 min-w-0">
          {/* Select Test Series */}
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-[#1a7a5e]">
              Select Test Series *
            </label>
            <CustomDropdown
              options={tests
                .filter((t: any) => t.isSeries === true)
                .map((t: any) => ({
                  value: t.id || (t as any)._id,
                  label: t.name || t.title || "",
                }))}
              value={bulkUploadData.testSeries}
              onChange={(val: any) =>
                setBulkUploadData({
                  ...bulkUploadData,
                  testSeries: val,
                  testTitle: "",
                })
              }
              placeholder="Select Test Series"
              searchPlaceholder="Search"
            />
          </div>

          {/* Select Test Title */}
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-[#1a7a5e]">
              Select Test Title *
            </label>
            <CustomDropdown
              options={tests
                .filter((t) => {
                  const testSeriesId =
                    t.courseId ||
                    (t as any).testSeriesId ||
                    (t.course &&
                      (typeof t.course === "object"
                        ? (t.course as any)._id || (t.course as any).id
                        : t.course));
                  return (
                    (!bulkUploadData.testSeries ||
                      testSeriesId === bulkUploadData.testSeries) &&
                    t.isSeries !== true
                  );
                })
                .map((t) => ({
                  value: t.id || (t as any)._id,
                  label: t.name || t.title || "Unnamed Test",
                }))}
              value={bulkUploadData.testTitle}
              onChange={(val: any) =>
                setBulkUploadData({ ...bulkUploadData, testTitle: val })
              }
              placeholder=""
              searchPlaceholder="Search"
            />
          </div>

          {/* Format Selection Cards */}
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-semibold text-[#1a7a5e]">
                Select Format *
              </label>
              <a
                href={
                  formats.find(
                    (f) => f.key === (bulkUploadData.format || "default")
                  )?.download
                }
                download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-bold uppercase rounded-lg hover:bg-gray-800 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">
                  download
                </span>
                Download Format
              </a>
            </div>
            <div className="flex gap-4 pt-1">
              {formats.map((fmt) => {
                const isSelected =
                  (bulkUploadData.format || "default") === fmt.key;
                return (
                  <div
                    key={fmt.key}
                    onClick={() =>
                      setBulkUploadData({ ...bulkUploadData, format: fmt.key })
                    }
                    className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 overflow-hidden select-none flex-shrink-0 flex flex-col ${
                      isSelected
                        ? "border-black shadow-md"
                        : "border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100 bg-gray-50"
                    }`}
                    style={{ width: "145px", height: "180px" }}
                  >
                    <div className="flex-1 bg-white flex items-center justify-center p-2 relative">
                      <img
                        src={fmt.image}
                        alt={fmt.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div
                      className={`py-2 px-2 text-center border-t border-gray-200 ${
                        isSelected ? "bg-black text-white" : "bg-white text-gray-700"
                      }`}
                    >
                      <p className={`text-[12px] font-bold`}>{fmt.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* modern file uploader */}
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center px-1">
              <span className="text-[12px] font-semibold text-[#1a7a5e]">
                Select File *
              </span>
            </div>
            <div className="flex flex-col gap-2 -mt-2">
              <label className="group h-12 border border-gray-200 rounded-lg flex items-center overflow-hidden bg-white hover:border-gray-300 transition-all cursor-pointer">
                <div
                  className={`px-4 text-[13px] flex-1 flex items-center gap-2 ${
                    bulkUploadData.file
                      ? "text-gray-700 font-medium"
                      : "text-gray-500"
                  }`}
                >
                  <span className="truncate">
                    {bulkUploadData.file
                      ? bulkUploadData.file.name
                      : "Upload file"}
                  </span>
                </div>
                <div className="h-full px-6 flex items-center bg-[#f5f5f5] text-gray-600 border-l border-gray-200 hover:bg-gray-200 transition-all">
                  <span className="text-[13px] font-medium">Browse</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      setBulkUploadData({
                        ...bulkUploadData,
                        file,
                        parsedQuestions: [],
                      });
                      setIsParsing(true);
                      showToast(`Preparing to parse ${file.name}...`, "success");
                      try {
                        const { questions, extractedImages } = await parseFile(
                          file
                        );
                        setBulkUploadData((prev: any) => ({
                          ...prev,
                          file,
                          parsedQuestions: questions,
                          extractedImages: extractedImages || [],
                        }));
                        if (questions.length === 0) {
                          showToast(
                            "No questions could be extracted. Please check the document format.",
                            "error"
                          );
                        } else {
                          showToast(
                            `Successfully extracted ${
                              questions.length
                            } questions and ${
                              extractedImages?.length || 0
                            } images!`,
                            "success"
                          );
                        }
                      } catch (err) {
                        console.error("File parsing error:", err);
                        showToast(
                          "Error parsing file. Ensure it is a valid document.",
                          "error"
                        );
                      } finally {
                        setIsParsing(false);
                      }
                    }
                    if (e.target) e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {/* Progress Bar */}
          {(isParsing || (uploadProgress > 0 && uploadProgress < 100)) && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <span>
                  {isParsing ? "Extracting Content..." : "Uploading Questions..."}
                </span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${uploadProgress || (isParsing ? 50 : 0)}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Mode: Append vs Replace */}
          <div className="space-y-3 mt-6">
            <label className="text-[12px] font-semibold text-[#1a7a5e]">
              Upload Mode *
            </label>
            <div className="flex gap-4">
              {[
                {
                  id: "append",
                  label: "Append to Existing",
                  icon: "playlist_add",
                  desc: "Adds new questions after existing ones",
                },
                {
                  id: "replace",
                  label: "Replace All",
                  icon: "sync_problem",
                  desc: "Deletes existing questions before uploading",
                  color: "text-red-500",
                },
              ].map((mode) => (
                <div
                  key={mode.id}
                  onClick={() =>
                    setBulkUploadData({ ...bulkUploadData, uploadMode: mode.id as any })
                  }
                  className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    bulkUploadData.uploadMode === mode.id
                      ? "border-black bg-gray-50 shadow-sm"
                      : "border-gray-100 hover:border-gray-200 opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        bulkUploadData.uploadMode === mode.id
                          ? "text-black"
                          : "text-gray-400"
                      }`}
                    >
                      {mode.icon}
                    </span>
                    <span className="text-[13px] font-bold">{mode.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    {mode.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex items-center gap-4">
            <button
              onClick={handleFinalBulkUpload}
              className="px-8 h-10 bg-[#12A5B8] hover:bg-[#0E8A9A] text-white rounded-lg font-medium text-[14px] transition-all active:scale-95 flex items-center justify-center w-[120px]"
            >
              Upload
            </button>
          </div>
        </div>

        {/* RIGHT: Preview Panel — appears when file is selected */}
        {bulkUploadData.file && (
          <div className="w-[420px] flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden animate-in slide-in-from-right-4 duration-400 sticky top-4">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-[#f8fffe]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1a7a5e] text-[20px]">
                  table_view
                </span>
                <div>
                  <h3 className="text-[13px] font-bold text-gray-800">
                    File Preview
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {previewQuestions.length} questions ·{" "}
                    {bulkUploadData.file.name.slice(0, 20)}
                    {bulkUploadData.file.name.length > 20 ? "…" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100">
                  ✓ Valid
                </span>
                <button
                  onClick={() =>
                    setBulkUploadData({ ...bulkUploadData, file: null })
                  }
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Questions list */}
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto relative">
              {isParsing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#1a7a5e] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[13px] font-bold text-[#1a7a5e]">
                    Extracting Questions...
                  </p>
                </div>
              )}
              {previewQuestions.length > 0
                ? previewQuestions.map((q: any, idx: number) => {
                    const format = bulkUploadData.format;

                    // Format 1 & 2 Style (More like a document)
                    if (format === "format1") {
                      return (
                        <div
                          key={idx}
                          className={`px-5 py-6 transition-colors border-l-4 space-y-3 font-serif ${
                            q.needsReview
                              ? "bg-orange-50/30 border-orange-400 hover:bg-orange-50/50"
                              : "hover:bg-gray-50/50 border-transparent hover:border-black"
                          }`}
                        >
                          {q.needsReview && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg shrink-0 w-max">
                              <span className="material-symbols-outlined text-yellow-600 text-[18px]">
                                warning
                              </span>
                              <span className="text-[12px] font-bold text-yellow-700">
                                Needs Review: Diagram uncertain or missing
                              </span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="font-bold text-[13px] text-gray-900 shrink-0">
                              Question:
                            </span>
                            <p className="text-[12px] font-medium text-gray-800 leading-relaxed flex-1">
                              {renderQuestionText(q.questionEn)}
                            </p>
                          </div>
                          <div className="pl-16 space-y-1 font-sans">
                            {q.options.map((opt: string, i: number) => {
                              const label = String.fromCharCode(65 + i);
                              return (
                                <div key={i} className="space-y-2 mb-3">
                                  <div className="flex gap-2 text-[11px] text-gray-500">
                                    <span className="font-bold">
                                      ({label.toLowerCase()})
                                    </span>
                                    <span>{renderQuestionText(opt)}</span>
                                  </div>
                                  {renderDiagram({ q, field: label, isEditable: true, handleImageSelect, handleRemoveImage })}
                                </div>
                              );
                            })}
                          </div>
                          <div className="pl-16 space-y-1 text-[11px] text-gray-700 pt-2 font-sans">
                            <p>
                              <span className="font-bold">Answer:</span>{" "}
                              {q.correctAnswer.toLowerCase()}
                            </p>
                            {q.solution && (
                              <p>
                                <span className="font-bold">Solution:</span>{" "}
                                <span className="text-gray-400 italic line-clamp-1">
                                  {renderQuestionText(q.solution)}
                                </span>
                              </p>
                            )}
                          </div>
                          {renderDiagram({ q, field: "question", isEditable: true, handleImageSelect, handleRemoveImage })}
                        </div>
                      );
                    }

                    if (format === "format2") {
                      return (
                        <div
                          key={idx}
                          className={`px-5 py-6 transition-colors border-l-4 space-y-3 font-serif ${
                            q.needsReview
                              ? "bg-orange-50/30 border-orange-400 hover:bg-orange-50/50"
                              : "hover:bg-gray-50/50 border-transparent hover:border-black"
                          }`}
                        >
                          {q.needsReview && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg shrink-0 w-max">
                              <span className="material-symbols-outlined text-yellow-600 text-[18px]">
                                warning
                              </span>
                              <span className="text-[12px] font-bold text-yellow-700">
                                Needs Review: Diagram uncertain or missing
                              </span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="font-bold text-[13px] text-gray-900 shrink-0">
                              {idx + 1}.
                            </span>
                            <div className="space-y-1 flex-1">
                              <p className="text-[12px] font-medium text-gray-800 leading-relaxed">
                                {renderQuestionText(q.questionEn)}
                              </p>
                              <p className="text-[12px] font-medium text-gray-600 leading-relaxed">
                                {renderQuestionText(q.questionHi)}
                              </p>
                            </div>
                          </div>
                          <div className="pl-8 space-y-1 font-sans">
                            {q.options.map((opt: string, i: number) => {
                              const label = String.fromCharCode(65 + i);
                              return (
                                <div key={i} className="mb-4">
                                  <div className="flex gap-2 text-[11px] text-gray-500">
                                    <span className="font-bold">{label}.</span>
                                    <span>{renderQuestionText(opt)}</span>
                                  </div>
                                  <div className="pl-4">
                                    {renderDiagram({ q, field: label, isEditable: true, handleImageSelect, handleRemoveImage })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="pl-8 space-y-2 text-[11px] text-gray-700 pt-2 font-sans">
                            <p>
                              <span className="font-bold">Answer</span>{" "}
                              {q.correctAnswer}
                            </p>
                            <p className="font-bold">Solution.</p>
                            <div className="text-[11px] text-gray-500 space-y-1">
                              {q.solution
                                ?.split("\n")
                                .map((line: string, li: number) => (
                                  <p key={li} className="line-clamp-1 opacity-70">
                                    • {line}
                                  </p>
                                ))}
                            </div>
                          </div>
                          {renderDiagram({ q, field: "question", isEditable: true, handleImageSelect, handleRemoveImage })}
                        </div>
                      );
                    }

                    if (format === "format3") {
                      return (
                        <div
                          key={idx}
                          className={`px-5 py-4 transition-colors border-b border-gray-100 ${
                            q.needsReview
                              ? "bg-orange-50/30 hover:bg-orange-50/50"
                              : "hover:bg-blue-50/30"
                          }`}
                        >
                          <div className="bg-gray-50 px-3 py-1.5 rounded-md flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                              <span className="text-gray-400">
                                Question {idx + 1}
                              </span>
                              {q.needsReview && (
                                <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                                  ⚠️ Needs Review
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                              GRID STYLE
                            </span>
                          </div>
                          <p className="text-[13px] font-bold text-gray-800 mb-4">
                            {renderQuestionText(q.questionEn)}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {q.options.map((o: string, i: number) => {
                              const label = String.fromCharCode(65 + i);
                              return (
                                <div
                                  key={i}
                                  className="flex flex-col gap-2 p-2 border border-gray-100 rounded-lg bg-white shadow-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] font-bold text-gray-500 shrink-0">
                                      {label}
                                    </span>
                                    <span className="text-[11px] text-gray-600 font-medium truncate">
                                      {renderQuestionText(o)}
                                    </span>
                                  </div>
                                  {renderDiagram({ q, field: label, isEditable: true, handleImageSelect, handleRemoveImage })}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex items-center gap-4 text-[10px]">
                            <span className="font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded">
                              ANS: {q.correctAnswer}
                            </span>
                            <span className="text-gray-400 italic shrink-0">
                              Solution: {renderQuestionText(q.solution).slice(0, 30)}
                              ...
                            </span>
                          </div>
                          {renderDiagram({ q, field: "question", isEditable: true, handleImageSelect, handleRemoveImage })}
                        </div>
                      );
                    }

                    if (format === "format4") {
                      return (
                        <div
                          key={idx}
                          className="px-5 py-6 hover:bg-gray-50 transition-colors border-l-4 border-blue-500 bg-white"
                        >
                          <div className="flex gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 border border-gray-200 shadow-inner">
                              <span className="material-symbols-outlined text-gray-300">
                                image
                              </span>
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-[13px] font-black text-gray-900 leading-tight line-clamp-2">
                                {renderQuestionText(q.questionEn)}
                              </p>
                              <div className="space-y-1">
                                {q.options.map((o: string, i: number) => {
                                  const label = String.fromCharCode(65 + i);
                                  return (
                                    <div
                                      key={i}
                                      className="flex flex-col gap-2 text-[11px] text-gray-500 font-medium mb-2"
                                    >
                                      <div className="flex gap-2">
                                        <span className="text-blue-500 shrink-0">
                                          {String.fromCharCode(97 + i)}.
                                        </span>
                                        <span>{renderQuestionText(o)}</span>
                                      </div>
                                      <div>
                                        {renderDiagram({ q, field: label, isEditable: true, handleImageSelect, handleRemoveImage })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-gray-800 uppercase tracking-widest">
                              Answer Key: {q.correctAnswer}
                            </span>
                            <span className="text-[#1a7a5e] font-black">
                              +{q.positiveMarks} Marks
                            </span>
                          </div>
                          {renderDiagram({ q, field: "question", isEditable: true, handleImageSelect, handleRemoveImage })}
                        </div>
                      );
                    }

                    if (format === "format5") {
                      return (
                        <div
                          key={idx}
                          className="m-3 bg-[#ecfdf5]/30 border border-emerald-100 rounded-2xl overflow-hidden hover:shadow-md transition-all"
                        >
                          <div className="bg-emerald-600 px-4 py-2 flex justify-between items-center text-white">
                            <span className="text-[11px] font-black uppercase tracking-tighter">
                              EXPERT SOLUTION #{idx + 1}
                            </span>
                            <span className="text-[10px] font-bold opacity-80">
                              {q.type || "MCQ"}
                            </span>
                          </div>
                          <div className="p-4 space-y-4">
                            <div className="space-y-1">
                              <p className="text-[12px] font-bold text-emerald-950">
                                {renderQuestionText(q.questionEn)}
                              </p>
                              <p className="text-[10px] text-emerald-600/70 font-medium italic">
                                {renderQuestionText(q.questionHi)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              {q.options.map((o: string, i: number) => {
                                const label = String.fromCharCode(65 + i);
                                return (
                                  <div
                                    key={i}
                                    className="flex flex-col gap-2 py-1.5 px-3 bg-white/50 rounded-lg text-[11px] text-emerald-800 font-bold border border-emerald-50"
                                  >
                                    <div className="flex gap-3 items-center">
                                      <span className="w-4 text-emerald-300 shrink-0">
                                        {label}
                                      </span>
                                      <span>{renderQuestionText(o)}</span>
                                    </div>
                                    {renderDiagram({ q, field: label, isEditable: true, handleImageSelect, handleRemoveImage })}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-2">
                              <p className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  psychology
                                </span>
                                DETAILED EXPLANATION
                              </p>
                              <p className="text-[11px] text-gray-500 leading-relaxed italic">
                                {renderQuestionText(q.solution)}
                              </p>
                              {renderDiagram({ q, field: "solution", isEditable: true, handleImageSelect, handleRemoveImage })}
                              {!(
                                viewingQuestionEditor?.marksPerQuestion ||
                                viewingQuestionEditor?.totalMarks
                              ) && (
                                <div className="pt-2 flex gap-4 text-[10px] font-black text-emerald-600">
                                  <span>CORRECT: {q.correctAnswer}</span>
                                  <span>WEIGHTAGE: {q.positiveMarks}M</span>
                                </div>
                              )}
                            </div>
                            {renderDiagram({ q, field: "question", isEditable: true, handleImageSelect, handleRemoveImage })}
                          </div>
                        </div>
                      );
                    }

                    // Default (Table Style)
                    return (
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
                                  {renderDiagram({ q, field: label, isEditable: true, handleImageSelect, handleRemoveImage })}
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
                            <div className="p-2.5 text-[11px] text-gray-500 italic flex-1 flex flex-col gap-2">
                              {renderQuestionText(q.solution)}
                              {renderDiagram({ q, field: "solution", isEditable: true, handleImageSelect, handleRemoveImage })}
                            </div>
                          </div>

                          {renderDiagram({ q, field: "question", isEditable: true, handleImageSelect, handleRemoveImage })}
                        </div>
                      </div>
                    );
                  })
                : !isParsing && (
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
                  )}
            </div>

            {/* Footer action */}
            <div className="px-4 py-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
              <button
                onClick={handleFinalBulkUpload}
                className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold text-[12px] uppercase tracking-tighter transition-all active:scale-[0.98]"
              >
                PROCEED TO UPLOAD ({previewQuestions.length} Questions)
              </button>

              <button
                onClick={() =>
                  generateDOCX(
                    previewQuestions,
                    bulkUploadData.format,
                    `Paper_${bulkUploadData.file?.name}.docx`
                  )
                }
                className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-gray-100 text-[#1a7a5e] hover:bg-[#1a7a5e]/5 transition-all duration-300 font-bold text-[12px] rounded-xl uppercase tracking-tighter active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">
                  file_download
                </span>
                DOWNLOAD
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestsBulkUploaderTab;
