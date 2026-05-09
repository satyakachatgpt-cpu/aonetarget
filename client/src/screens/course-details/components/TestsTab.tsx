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
      ) : !isEnrolled ? (
        <div className="card-premium p-10 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-rounded text-3xl text-gray-300">lock</span>
          </div>
          <p className="text-gray-500 font-medium text-sm">Enroll to access tests</p>
          {isPaidCourse ? (
            <button onClick={onBuyNow} className="mt-4 btn-accent px-6 py-2.5 text-sm">
              Buy Now - ₹{coursePrice}
            </button>
          ) : (
            <button 
              onClick={onEnroll} 
              disabled={enrolling} 
              className="mt-4 btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {enrolling ? 'Enrolling...' : 'Enroll Free'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tests.length === 0 ? (
            <div className="card-premium p-10 text-center animate-fade-in-up">
              <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-rounded text-3xl text-gray-300">quiz</span>
              </div>
              <p className="text-gray-400 font-medium text-sm">No tests available here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test, i) => {
                try {
                  const testId = test?.id || test?._id || `test-err-${i}`;
                  const isAttempted = completedTests.includes(testId as string);
                  const canAccess = isEnrolled || test?.isFree || false;
                  const isLocked = !canAccess;
                  const qCount = Array.isArray(test?.numberOfQuestions) ? test.numberOfQuestions.length : 
                                (Array.isArray(test?.questions) ? test.questions.length : 
                                (test?.numberOfQuestions || test?.questions || 0));
                  const duration = test?.duration || 60;
                  const testName = test?.name || test?.title || 'Unnamed Test';

                  return (
                    <div
                      key={testId}
                      className={`card-premium p-4 animate-fade-in-up ${isLocked ? 'opacity-70' : ''}`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLocked ? 'bg-surface-200' : 'bg-gradient-to-br from-purple-100 to-purple-50'}`}>
                            <span className={`material-symbols-rounded text-xl ${isLocked ? 'text-gray-400' : 'text-purple-500'}`}>
                              {isLocked ? 'lock' : 'quiz'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-800">{testName}</h4>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                              {qCount} Questions • {duration} mins
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {test?.isFree && !isEnrolled && (
                            <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                              FREE
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
                            <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                              LOCKED
                            </span>
                          )}
                        </div>
                      </div>
                      {canAccess ? (
                        <button
                          onClick={() => !test.isExpired && onStartTest(testId)}
                          disabled={test.isExpired}
                          className={`w-full py-3 text-sm rounded-2xl font-semibold transition-all duration-200 ${test.isExpired ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'btn-primary active:scale-[0.97]'}`}
                        >
                          {test.isExpired ? 'Test Expired' : isAttempted ? 'View Result / Retake' : 'Start Test'}
                        </button>
                      ) : (
                        <button
                          onClick={onBuyNow}
                          className="w-full bg-surface-200 text-gray-500 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-200"
                        >
                          <span className="material-symbols-rounded text-sm">lock</span>
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
          )}
        </div>
      )}
    </div>
  );
};

export default TestsTab;
