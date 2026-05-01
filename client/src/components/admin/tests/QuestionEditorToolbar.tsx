import React from 'react';

interface QuestionEditorToolbarProps {
  viewingQuestionEditor: any;
  viewingTestSeries: any;
  onBack: () => void;
  onPublish: () => void;
  editorQuestionsCount: number;
  showFloatingAddMenu: boolean;
  setShowFloatingAddMenu: (v: boolean) => void;
  showFloatingMoreMenu: boolean;
  setShowFloatingMoreMenu: (v: boolean) => void;
  setViewingAddQuestionForm: (v: any) => void;
  setActiveTab: (v: string) => void;
  setShowBulkEditDrawer: (v: boolean) => void;
  setShowBulkDeleteModal: (v: boolean) => void;
  setSelectedBulkDeleteQuestions: (v: any[]) => void;
  isBulkEditQuestionsOn: boolean;
  setIsBulkEditQuestionsOn: (v: boolean) => void;
  setActiveActionMenuId: (v: string | number | null) => void;
}

const QuestionEditorToolbar: React.FC<QuestionEditorToolbarProps> = ({
  viewingQuestionEditor,
  viewingTestSeries,
  onBack,
  onPublish,
  editorQuestionsCount,
  showFloatingAddMenu,
  setShowFloatingAddMenu,
  showFloatingMoreMenu,
  setShowFloatingMoreMenu,
  setViewingAddQuestionForm,
  setActiveTab,
  setShowBulkEditDrawer,
  setShowBulkDeleteModal,
  setSelectedBulkDeleteQuestions,
  isBulkEditQuestionsOn,
  setIsBulkEditQuestionsOn,
  setActiveActionMenuId
}) => {
  return (
    <>
      {/* Top Header */}
      <div className="bg-white px-8 py-5 border-b border-gray-100 flex items-center justify-between">
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
              {viewingQuestionEditor?.name ||
                viewingQuestionEditor?.title ||
                viewingTestSeries?.name ||
                "Unnamed Test"}
            </h2>
            <p className="text-[12px] font-medium text-gray-400">
              {viewingTestSeries?.name || "Test"} Series
            </p>
          </div>
        </div>
        <button
          onClick={onPublish}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#4361EE] text-white rounded-xl text-[13px] font-bold shadow-[0_4px_14px_0_rgba(67,97,238,0.39)] hover:bg-[#3451DE] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[19px]">
            sync
          </span>
          Publish Changes
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Stats Bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-wrap items-center justify-between shadow-sm gap-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total Format</span>
              <div className="flex items-center gap-4 mt-1">
                <span className="px-3 py-1 bg-gray-50 text-[13px] font-bold text-gray-700 rounded-lg">
                  {viewingQuestionEditor.marks || 0} Marks
                </span>
                <span className="px-3 py-1 bg-gray-50 text-[13px] font-bold text-gray-700 rounded-lg">
                  {viewingQuestionEditor.duration || viewingQuestionEditor.time || 0} Minutes
                </span>
                <span className="px-3 py-1 bg-gray-50 text-[13px] font-bold text-gray-700 rounded-lg">
                  {editorQuestionsCount} Questions
                </span>
              </div>
            </div>

            <div className="w-[1px] h-10 bg-gray-100" />

            <div className="flex flex-col">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Test-Level Scoring</span>
              <div className="flex items-center gap-4 mt-1">
                <span className="px-3 py-1 bg-green-50 text-[#2E7D32] text-[13px] font-bold rounded-lg border border-green-100">
                  +{viewingQuestionEditor.marksPerQuestion || 0} per Right
                </span>
                <span className="px-3 py-1 bg-red-50 text-[#C62828] text-[13px] font-bold rounded-lg border border-red-100">
                  -{viewingQuestionEditor.negativeMarking || 0} per Wrong
                </span>
              </div>
            </div>
          </div>
          <p className="text-[12px] font-medium text-gray-400">
            Last Published:{" "}
            {viewingQuestionEditor.published || "Not Published"}
          </p>
        </div>

        {/* Tabs Bar & Actions */}
        <div className="bg-white rounded-xl border border-gray-100 h-14 flex items-center justify-between px-2 shadow-sm">
          <div className="flex h-full">
            <button className="px-6 h-full text-[13px] font-bold border-b-[3px] border-black">
              {viewingQuestionEditor.name}
            </button>
            <button className="px-6 h-full text-[13px] font-bold text-gray-400 hover:text-gray-600 transition-colors">
              All
            </button>
          </div>

          <div className="flex items-center gap-3 pr-2">
            <div className="relative add-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !showFloatingAddMenu;
                  setShowFloatingAddMenu(next);
                  if (next) {
                    setShowFloatingMoreMenu(false);
                    setActiveActionMenuId(null);
                  }
                }}
                className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{
                    transform: showFloatingAddMenu
                      ? "rotate(45deg)"
                      : "rotate(0)",
                  }}
                >
                  add
                </span>
              </button>
              {showFloatingAddMenu && (
                <div className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[101]">
                  {[
                    {
                      id: "create",
                      label: "Create Question",
                      icon: "edit_square",
                      color: "text-blue-500",
                      bg: "bg-blue-50",
                    },
                    {
                      id: "word",
                      label: "Bulk Upload from Word Doc",
                      icon: "description",
                      color: "text-amber-500",
                      bg: "bg-amber-50",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "create")
                          setViewingAddQuestionForm({});
                        if (item.id === "word") {
                          setActiveTab("Bulk Uploader");
                        }

                        setShowFloatingAddMenu(false);
                      }}
                      className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-all group"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${item.color}`}
                        >
                          {item.icon}
                        </span>
                      </div>
                      <span className="text-[14px] font-bold text-gray-700 group-hover:text-black">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative more-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !showFloatingMoreMenu;
                  setShowFloatingMoreMenu(next);
                  if (next) {
                    setShowFloatingAddMenu(false);
                    setActiveActionMenuId(null);
                  }
                }}
                className="w-10 h-10 bg-white border border-gray-200 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[22px]">
                  more_horiz
                </span>
              </button>
              {showFloatingMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[101]">
                  {[
                    {
                      label: "Bulk Edit",
                      icon: "edit_calendar",
                      onClick: () => {
                        setShowBulkEditDrawer(true);
                      },
                    },
                    {
                      label: "Bulk Delete",
                      icon: "delete",
                      onClick: () => {
                        setShowBulkDeleteModal(true);
                        setSelectedBulkDeleteQuestions([]);
                      },
                    },
                    {
                      label: isBulkEditQuestionsOn ? "Exit Sorting" : "Sort Questions",
                      icon: isBulkEditQuestionsOn ? "close" : "sort",
                      onClick: () => setIsBulkEditQuestionsOn(!isBulkEditQuestionsOn),
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.onClick) item.onClick();
                        setShowFloatingMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-[18px] text-gray-400">
                        {item.icon}
                      </span>
                      <span className="text-[13px] font-bold text-gray-700">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(QuestionEditorToolbar);
