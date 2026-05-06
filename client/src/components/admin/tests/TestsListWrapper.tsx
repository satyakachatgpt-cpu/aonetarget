import React from 'react';
import {
  DndContext,
  closestCenter,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
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
  onReorder: (event: DragEndEvent) => void;
  sensors: any;
  isSortingDisabled: boolean;
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
  onReorder,
  sensors,
  isSortingDisabled
}) => {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onReorder}
    >
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
                <SortableContext
                  items={tests.filter(t => !!t._id).map(t => String(t._id))}
                  strategy={verticalListSortingStrategy}
                  disabled={isSortingDisabled}
                >
                  {tests.map((test, index) => (
                    <TestRow
                      key={test._id || `temp-${index}`}
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
                      isSortingDisabled={isSortingDisabled}
                    />
                  ))}
                </SortableContext>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DndContext>
  );
};

export default React.memo(TestsListWrapper);
