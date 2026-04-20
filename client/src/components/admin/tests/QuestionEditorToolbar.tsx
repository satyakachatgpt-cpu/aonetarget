import React from "react";

interface QuestionEditorToolbarProps {
  marks: number;
  time: number;
  lastPublished: string;
  testName: string;
  showFloatingAddMenu: boolean;
  setShowFloatingAddMenu: (val: boolean) => void;
  showFloatingMoreMenu: boolean;
  setShowFloatingMoreMenu: (val: boolean) => void;
  setActiveActionMenuId: (id: any) => void;
  onAddQuestion: () => void;
  onBulkUpload: () => void;
  onBulkDelete: () => void;
  onSort: () => void;
}

const QuestionEditorToolbar: React.FC<QuestionEditorToolbarProps> = ({
  marks,
  time,
  lastPublished,
  testName,
  showFloatingAddMenu,
  setShowFloatingAddMenu,
  showFloatingMoreMenu,
  setShowFloatingMoreMenu,
  setActiveActionMenuId,
  onAddQuestion,
  onBulkUpload,
  onBulkDelete,
  onSort,
}) => {
  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-bold text-gray-600">
            {marks || 0} Marks
          </span>
          <span className="text-[13px] font-bold text-gray-600">
            {time || 0} Minutes
          </span>
          <span className="text-[13px] font-bold text-gray-600 italic opacity-60">
            {time || 0} Minutes
          </span>
        </div>
        <p className="text-[12px] font-medium text-gray-400">
          Last Published: {lastPublished || "Not yet published"}
        </p>
      </div>

      {/* Tabs Bar & Actions */}
      <div className="bg-white rounded-xl border border-gray-100 h-14 flex items-center justify-between px-2 shadow-sm">
        <div className="flex h-full">
          <button className="px-6 h-full text-[13px] font-bold border-b-[3px] border-black">
            {testName}
          </button>
          <button className="px-6 h-full text-[13px] font-bold text-gray-400 hover:text-gray-600 transition-colors">
            All
          </button>
        </div>

        <div className="flex items-center gap-3 pr-2">
          {/* Add Menu */}
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
                className="material-symbols-outlined text-[24px] transition-transform duration-200"
                style={{
                  transform: showFloatingAddMenu ? "rotate(45deg)" : "rotate(0)",
                }}
              >
                add
              </span>
            </button>
            {showFloatingAddMenu && (
              <div className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[101]">
                <button
                  onClick={() => {
                    onAddQuestion();
                    setShowFloatingAddMenu(false);
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <span className="material-symbols-outlined text-[20px] text-blue-500">
                      edit_square
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-gray-700 group-hover:text-black">
                    Create Question
                  </span>
                </button>
                <button
                  onClick={() => {
                    onBulkUpload();
                    setShowFloatingAddMenu(false);
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <span className="material-symbols-outlined text-[20px] text-amber-500">
                      description
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-gray-700 group-hover:text-black">
                    Bulk Upload from Word Doc
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* More Menu */}
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
                <button
                  onClick={() => {
                    onBulkDelete();
                    setShowFloatingMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px] text-gray-400">
                    delete
                  </span>
                  <span className="text-[13px] font-bold text-gray-700">
                    Bulk Delete
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSort();
                    setShowFloatingMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px] text-gray-400">
                    sort
                  </span>
                  <span className="text-[13px] font-bold text-gray-700">
                    Sort Questions
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditorToolbar;
