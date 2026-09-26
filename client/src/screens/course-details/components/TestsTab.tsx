import React from 'react';

interface TestsTabProps {
  tests: any[];
  isEnrolled: boolean;
  isExpired?: boolean;
  coursePrice: number | undefined;
  enrolling: boolean;
  completedTests: string[];
  onStartTest: (testId: string) => void;
  onEnroll: () => void;
  onBuyNow: () => void;
}

const TestsTab: React.FC<TestsTabProps> = ({
  tests,
  isEnrolled,
  isExpired = false,
  coursePrice,
  enrolling,
  completedTests,
  onStartTest,
  onEnroll,
  onBuyNow,
}) => {
  const isPaidCourse = coursePrice !== undefined && coursePrice > 0;

  return (
    <div className="space-y-4">
      {isExpired ? (
        <div className="card-premium p-10 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-rounded text-3xl text-orange-500">history</span>
          </div>
          <h4 className="font-bold text-gray-800">Your access has expired</h4>
          <p className="text-gray-500 font-medium text-sm mt-1">This course validity period has ended</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="card-premium p-10 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-rounded text-3xl text-gray-300">quiz</span>
          </div>
          <p className="text-gray-400 font-medium text-sm">No tests included in this course yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Banner for Unenrolled Students */}
          {!isEnrolled && (
            <div className="bg-gradient-to-r from-[#1A237E] to-[#283593] rounded-3xl p-5 text-white shadow-lg mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-rounded text-2xl text-blue-200">quiz</span>
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">{tests.length} Tests Included with this Course</h4>
                  <p className="text-xs text-blue-200/80 mt-0.5">Enroll now to unlock all tests and test series</p>
                </div>
              </div>
              {isPaidCourse ? (
                <button
                  onClick={onBuyNow}
                  className="bg-white text-[#1A237E] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md hover:bg-blue-50 transition-all active:scale-95 shrink-0"
                >
                  Buy Course - ₹{coursePrice}
                </button>
              ) : (
                <button
                  onClick={onEnroll}
                  disabled={enrolling}
                  className="bg-white text-[#1A237E] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md hover:bg-blue-50 transition-all active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Free'}
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            {tests.map((test, i) => {
              try {
                const testId = test?.id || test?._id || `test-err-${i}`;
                const isAttempted = completedTests.includes(testId as string);
                const canAccess = isEnrolled || test?.isFree || false;
                const isLocked = !canAccess;
                const qCount = Array.isArray(test?.numberOfQuestions)
                  ? test.numberOfQuestions.length
                  : Array.isArray(test?.questions)
                  ? test.questions.length
                  : test?.numberOfQuestions || test?.questions || 0;
                const duration = test?.duration || 60;
                const testName = test?.name || test?.title || 'Unnamed Test';
                const seriesTitle = test?.seriesName || test?.testSeriesTitle || '';

                return (
                  <div
                    key={testId}
                    className={`card-premium p-4 animate-fade-in-up ${isLocked ? 'opacity-85' : ''}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isLocked ? 'bg-surface-200' : 'bg-gradient-to-br from-purple-100 to-purple-50'
                          }`}
                        >
                          <span
                            className={`material-symbols-rounded text-xl ${
                              isLocked ? 'text-gray-400' : 'text-purple-500'
                            }`}
                          >
                            {isLocked ? 'lock' : 'quiz'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-800">{testName}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-400 font-medium">
                              {qCount} Questions • {duration} mins
                            </span>
                            {seriesTitle && (
                              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="material-symbols-rounded text-[11px]">style</span>
                                {seriesTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {test?.isFree && !isEnrolled && (
                          <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                            FREE DEMO
                          </span>
                        )}
                        {isAttempted && (
                          <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5">
                            <span className="material-symbols-rounded text-[10px]">check_circle</span>
                            Done
                          </span>
                        )}
                        {test.isExpired && (
                          <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5">
                            <span className="material-symbols-rounded text-[10px]">lock_clock</span>
                            EXPIRED
                          </span>
                        )}
                        {isLocked && !test.isExpired && (
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5">
                            <span className="material-symbols-rounded text-[10px]">lock</span>
                            INCLUDED
                          </span>
                        )}
                      </div>
                    </div>
                    {canAccess ? (
                      <button
                        onClick={() => !test.isExpired && onStartTest(testId)}
                        disabled={test.isExpired}
                        className={`w-full py-3 text-sm rounded-2xl font-semibold transition-all duration-200 ${
                          test.isExpired
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            : 'btn-primary active:scale-[0.97]'
                        }`}
                      >
                        {test.isExpired
                          ? 'Test Expired'
                          : 'Start Test'}
                      </button>
                    ) : (
                      <button
                        onClick={onBuyNow}
                        className="w-full bg-surface-200 text-gray-700 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-200 hover:bg-surface-300"
                      >
                        <span className="material-symbols-rounded text-sm text-amber-600">lock</span>
                        Buy Course to Unlock
                      </button>
                    )}
                  </div>
                );
              } catch (err) {
                return (
                  <div key={i} className="card-premium p-4 border-red-200 bg-red-50">
                    <p className="text-red-500 text-xs font-bold">Error loading test data</p>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestsTab;
