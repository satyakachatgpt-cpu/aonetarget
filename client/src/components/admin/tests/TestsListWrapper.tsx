import React from 'react';
import TestsEmptyState from './TestsEmptyState';
import TestRow from './TestRow';

interface TestsListWrapperProps {
  tests: any[];
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  onView: (test: any) => void;
  onEdit: (test: any) => void;
  onDuplicate: (test: any) => void;
  onPublish: (id: string) => void;
  onToggleStatus: (test: any) => void;
  onDelete: (id: string) => void;
}

const TestsListWrapper: React.FC<TestsListWrapperProps> = ({
  tests,
  activeMenu,
  setActiveMenu,
  onView,
  onEdit,
  onDuplicate,
  onPublish,
  onToggleStatus,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 mb-6 shadow-sm">
      <div className="">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f1f3f5] text-gray-500">
            <tr>
              <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                <div className="flex items-center gap-2 cursor-pointer group uppercase">
                  S. No.{" "}
                  <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                    unfold_more
                  </span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                <div className="flex items-center gap-2 cursor-pointer group uppercase">
                  Logo{" "}
                  <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                    unfold_more
                  </span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                <div className="flex items-center gap-2 cursor-pointer group uppercase">
                  Title{" "}
                  <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                    unfold_more
                  </span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                <div className="flex items-center gap-2 cursor-pointer group uppercase">
                  Price{" "}
                  <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                    unfold_more
                  </span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight">
                <div className="flex items-center gap-2 cursor-pointer group uppercase">
                  Sort By{" "}
                  <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-400">
                    unfold_more
                  </span>
                </div>
              </th>
              <th className="px-6 py-3.5 text-[12px] font-bold tracking-tight text-center uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tests.length === 0 ? (
              <TestsEmptyState />
            ) : (
              tests.map((test, index) => (
                <TestRow
                  key={test.id || index}
                  test={test}
                  index={index}
                  totalTests={tests.length}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  onView={onView}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onPublish={onPublish}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(TestsListWrapper);
