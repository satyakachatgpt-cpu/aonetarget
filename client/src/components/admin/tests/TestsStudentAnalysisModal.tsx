import React from "react";

interface Props {
  viewingStudentAnalysis: any;
  setViewingStudentAnalysis: (val: any) => void;
  results: any[];
}

const TestsStudentAnalysisModal: React.FC<Props> = ({
  viewingStudentAnalysis,
  setViewingStudentAnalysis,
  results,
}) => {
  if (!viewingStudentAnalysis) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[1.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Analysis Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-500 text-[28px]">
                account_circle
              </span>
            </div>
            <div>
              <h3 className="text-[18px] font-black text-gray-800 tracking-tight">
                {viewingStudentAnalysis.studentName}
              </h3>
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                {viewingStudentAnalysis.studentId}
              </p>
            </div>
          </div>
          <button
            onClick={() => setViewingStudentAnalysis(null)}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[24px] font-bold">
              close
            </span>
          </button>
        </div>

        {/* Analysis Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#FAFBFF]/30">
          {/* Test Info Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Test Taken
              </p>
              <p className="text-[15px] font-bold text-gray-800 leading-snug">
                {viewingStudentAnalysis.testName || "HSSC TEST-159"}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Completion Time
              </p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-[20px]">
                  timer
                </span>
                <p className="text-[18px] font-black text-gray-800">
                  {viewingStudentAnalysis.timeTaken}s
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Submission Date
              </p>
              <p className="text-[15px] font-bold text-gray-700">
                {new Date(viewingStudentAnalysis.submittedAt).toLocaleDateString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
          </div>

          {/* Progress & Scores */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-gray-50 pb-6">
              <h4 className="text-[16px] font-black text-gray-800">
                Test Performance Analysis
              </h4>
              <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[13px] font-black border border-blue-100">
                Rank : N/A
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Score */}
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-[6px] border-[#E9F7EF] flex flex-col items-center justify-center bg-white shadow-inner">
                    <span className="text-[20px] font-black text-[#155724] leading-tight">
                      {viewingStudentAnalysis.obtainedMarks}
                    </span>
                    <div className="h-[1px] w-8 bg-gray-200 my-1"></div>
                    <span className="text-[12px] font-bold text-gray-400 uppercase">
                      {viewingStudentAnalysis.totalMarks}
                    </span>
                  </div>
                  <p className="text-[13px] font-black text-gray-700 mt-4">
                    Total Score
                  </p>
                </div>
              </div>

              {/* Positive Marks */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Positive Marks
                </p>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2E7D32] rounded-full"
                    style={{
                      width: `${(viewingStudentAnalysis.obtainedMarks / viewingStudentAnalysis.totalMarks) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[18px] font-black text-[#2E7D32]">
                  +{viewingStudentAnalysis.obtainedMarks}.00
                </p>
              </div>

              {/* Negative Marks */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Negative Marks
                </p>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D32F2F] rounded-full"
                    style={{
                      width: `${(viewingStudentAnalysis.negativeMarksTotal / viewingStudentAnalysis.totalMarks) * 100 || 0}%`,
                    }}
                  ></div>
                </div>
                <p className="text-[18px] font-black text-[#D32F2F]">
                  -{viewingStudentAnalysis.negativeMarksTotal?.toFixed(2) || "0.00"}
                </p>
              </div>

              {/* Accuracy */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Accuracy
                </p>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${
                        ((viewingStudentAnalysis.correctAnswers || 0) /
                          ((viewingStudentAnalysis.correctAnswers || 0) +
                            (viewingStudentAnalysis.wrongAnswers || 0) || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
                <p className="text-[18px] font-black text-blue-600">
                  {(
                    ((viewingStudentAnalysis.correctAnswers || 0) /
                      ((viewingStudentAnalysis.correctAnswers || 0) +
                        (viewingStudentAnalysis.wrongAnswers || 0) || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </div>

          {/* Progress Detail */}
          <div className="bg-[#4361EE]/5 rounded-[1.5rem] p-6 border border-[#4361EE]/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#4361EE] text-[20px] font-bold">
                trending_up
              </span>
              <p className="text-[14px] font-black text-[#4361EE] tracking-tight italic uppercase">
                User Progress Tracker
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                <p className="text-[20px] font-black text-gray-800 italic">
                  {(viewingStudentAnalysis.correctAnswers || 0) +
                    (viewingStudentAnalysis.wrongAnswers || 0)}
                </p>
                <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                  Attempted
                </p>
              </div>
              <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                <p className="text-[20px] font-black text-gray-800 italic">
                  {viewingStudentAnalysis.unanswered || 0}
                </p>
                <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                  Unattempted
                </p>
              </div>
              <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                <p className="text-[20px] font-black text-gray-800 italic">
                  {viewingStudentAnalysis.correctAnswers || 0}
                </p>
                <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                  Correct
                </p>
              </div>
              <div className="text-center bg-white/60 p-4 rounded-xl shadow-sm">
                <p className="text-[20px] font-black text-gray-800 italic">
                  {viewingStudentAnalysis.wrongAnswers || 0}
                </p>
                <p className="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                  Wrong
                </p>
              </div>
            </div>
          </div>

          {/* User Test History Section */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <span className="material-symbols-outlined text-gray-400 text-[22px]">
                history
              </span>
              <h4 className="text-[16px] font-black text-gray-800 tracking-tight">
                User Test History
              </h4>
            </div>

            <div className="overflow-hidden border border-gray-50 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFBFF]">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Test Title
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Score
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Time
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results
                    .filter(
                      (r) => r.studentId === viewingStudentAnalysis.studentId,
                    )
                    .map((test, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-bold text-gray-700">
                            {test.testName || "HSSC TEST-159"}
                          </p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            Attempted on{" "}
                            {new Date(test.submittedAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[12px] font-black border border-green-100">
                            {test.obtainedMarks} / {test.totalMarks}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-[13px] font-bold text-gray-500">
                          {test.timeTaken}s
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[12px] font-black text-[#2E7D32] bg-[#E9F7EF] px-1 py-0.5 rounded-full uppercase tracking-tighter">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestsStudentAnalysisModal);
