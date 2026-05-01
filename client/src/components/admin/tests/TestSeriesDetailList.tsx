import React from 'react';

interface TestSeriesDetailListProps {
  tests: any[];
  activeActionMenuId: string | number | null;
  setActiveActionMenuId: (id: string | number | null) => void;
  onViewQuestionEditor: (test: any) => void;
  onEditTest: (test: any) => void;
  onViewResults: (test: any) => void;
  onDuplicateTest: (test: any) => void;
  onPublish: (id: string) => void;
  onReviewQuestions: (test: any) => void;
  onExportPDF: (test: any, withSolution: boolean) => void;
  onReevaluate: (test: any) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (test: any) => void;
  expandedDropdownItem: string | null;
  setExpandedDropdownItem: (id: string | null) => void;
}

const TestSeriesDetailList: React.FC<TestSeriesDetailListProps> = ({
  tests,
  activeActionMenuId,
  setActiveActionMenuId,
  onViewQuestionEditor,
  onEditTest,
  onViewResults,
  onDuplicateTest,
  onPublish,
  onReviewQuestions,
  onExportPDF,
  onReevaluate,
  onDelete,
  onToggleStatus,
  expandedDropdownItem,
  setExpandedDropdownItem
}) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {tests.map((test, index) => (
        <div
          key={String(test?.id || (test as any)._id || index)}
          className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="px-5 py-4 flex items-center gap-3">
            <input
              type="checkbox"
              className="w-[16px] h-[16px] rounded border-gray-300 accent-black cursor-pointer flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3
                className="text-[14px] font-bold text-gray-800 hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                onClick={() => {
                  onViewQuestionEditor(test);
                }}
              >
                {test.name || (test as any).title}
              </h3>
              <div className="flex items-center gap-4 mt-1 text-[12px] text-gray-500 font-medium">
                <span><span className="font-bold text-gray-700">{test.marks || 0}</span> Marks</span>
                <span><span className="font-bold text-gray-700">{test.time || 0}</span> Minutes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {/* Last Published */}
              <span className="text-[11px] text-gray-400 whitespace-nowrap hidden xl:block mr-2">
                Last Published:<span className="font-semibold ml-1">{(test as any).published || "—"}</span>
              </span>

              {/* Toggle */}
              <button
                onClick={() => onToggleStatus(test)}
                className={`w-9 h-[20px] rounded-full relative transition-all duration-300 ${test.status === "active" ? "bg-gray-700" : "bg-gray-200"}`}
              >
                <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow ${test.status === "active" ? "left-[18px]" : "left-[2px]"}`} />
              </button>

              {/* Lock Icon */}
              <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                <span className="material-symbols-outlined text-[19px]">lock_open</span>
              </button>

              {/* Price */}
              <span className="text-[13px] font-bold text-gray-700 min-w-[32px] text-center">
                {Number((test as any).price || 0).toFixed(2)}
              </span>

              {/* Actions Dropdown */}
              <div className="relative action-menu-container" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                <button
                  onClick={() =>
                    setActiveActionMenuId(
                      activeActionMenuId ===
                        (test.id || (test as any)._id)
                        ? null
                        : test.id || (test as any)._id,
                    )
                  }
                  className={`flex items-center gap-1 px-3 h-8 border rounded text-[12.5px] font-semibold transition-all whitespace-nowrap ${String(activeActionMenuId) === String(test.id || (test as any)._id) ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-300 text-gray-700 hover:border-gray-500"}`}
                >
                  Actions
                  <span className="material-symbols-outlined text-[14px]">expand_more</span>
                </button>

                {String(activeActionMenuId) ===
                  String(test.id || (test as any)._id) && (
                    <div className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[999] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      {[
                        {
                          id: "add_questions",
                          label: "Add Questions",
                          icon: "add_circle",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            onViewQuestionEditor(test);
                            setActiveActionMenuId(null);
                          },
                        },
                        {
                          id: "edit",
                          label: "Edit",
                          icon: "edit",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            onEditTest(test);
                            setActiveActionMenuId(null);
                          },
                        },
                        {
                          id: "results",
                          label: "View Results",
                          icon: "analytics",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            onViewResults(test);
                            setActiveActionMenuId(null);
                          },
                        },
                        {
                          id: "duplicate",
                          label: "Duplicate",
                          icon: "content_copy",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            onDuplicateTest(test);
                            setActiveActionMenuId(null);
                          },
                        },
                        {
                          id: "publish",
                          label: "Publish Changes",
                          icon: "sync",
                          subItems: [
                            {
                              id: "publish_yes",
                              label: "Publish",
                              icon: "public",
                              onClick: (e: React.MouseEvent) => {
                                e.stopPropagation();
                                onPublish(test.id || (test as any)._id);
                                setActiveActionMenuId(null);
                              },
                            },
                            {
                              id: "publish_no",
                              label: "Unpublish",
                              icon: "public_off",
                              onClick: (e: React.MouseEvent) => {
                                e.stopPropagation();
                                onPublish(test.id || (test as any)._id);
                                setActiveActionMenuId(null);
                              },
                            },
                          ]
                        },
                        {
                          id: "review",
                          label: "Review Questions",
                          icon: "checklist",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            onReviewQuestions(test);
                            setActiveActionMenuId(null);
                          },
                        },
                        {
                          id: "pdf",
                          label: "Export to PDF",
                          icon: "picture_as_pdf",
                          subItems: [
                            {
                              id: "pdf_sol",
                              label: "Export with Solution",
                              icon: "task",
                              onClick: (e: React.MouseEvent) => {
                                e.stopPropagation();
                                onExportPDF(test, true);
                                setActiveActionMenuId(null);
                              },
                            },
                            {
                              id: "pdf_nosol",
                              label: "Export without Solution",
                              icon: "assignment",
                              onClick: (e: React.MouseEvent) => {
                                e.stopPropagation();
                                onExportPDF(test, false);
                                setActiveActionMenuId(null);
                              },
                            },
                          ]
                        },
                        {
                          id: "reevaluate",
                          label: "Re-evaluate Attempts",
                          icon: "rule",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            onReevaluate(test);
                            setActiveActionMenuId(null);
                          },
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          icon: "delete",
                          color: "text-red-500",
                          onClick: (e: React.MouseEvent) => {
                            e.stopPropagation();
                            onDelete(test.id || (test as any)._id);
                            setActiveActionMenuId(null);
                          },
                        },
                      ].map((item) => (
                        <React.Fragment key={item.id}>
                          <button
                            onClick={(e) => {
                              if (item.subItems) {
                                e.stopPropagation();
                                setExpandedDropdownItem(expandedDropdownItem === item.id ? null : item.id);
                              } else if (item.onClick) {
                                item.onClick(e);
                              }
                            }}
                            className="w-full px-5 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors group text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`material-symbols-outlined text-[20px] ${item.color || "text-gray-400 group-hover:text-black"}`}>
                                {item.icon}
                              </span>
                              <span className={`text-[13px] font-bold ${item.color || "text-gray-600 group-hover:text-black"}`}>
                                {item.label}
                              </span>
                            </div>
                            {item.subItems && (
                              <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-black">
                                {expandedDropdownItem === item.id ? 'expand_less' : 'expand_more'}
                              </span>
                            )}
                          </button>
                          {item.subItems && expandedDropdownItem === item.id && (
                            <div className="bg-gray-50 border-y border-gray-100 py-1">
                              {item.subItems.map(subItem => (
                                <button
                                  key={subItem.id}
                                  onClick={(e) => {
                                    if (subItem.onClick) subItem.onClick(e);
                                  }}
                                  className="w-full px-5 py-2 pl-10 flex items-center gap-3 hover:bg-gray-100 transition-colors group text-left"
                                >
                                  <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-black">
                                    {subItem.icon}
                                  </span>
                                  <span className="text-[12.5px] font-bold text-gray-600 group-hover:text-black">
                                    {subItem.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(TestSeriesDetailList);
