import React from 'react';
import BreadcrumbHeader from './BreadcrumbHeader';
import CourseContentToolbar from './CourseContentToolbar';
import EmptyState from './EmptyState';

interface CourseContentTreeViewProps {
  folderStack: any[];
  onBackFolder: () => void;
  currentFolder: any;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  contentTypeFilter: string;
  setContentTypeFilter: (type: string) => void;
  itemsCount: number;
  renderItems: React.ReactNode;
}

const CourseContentTreeView: React.FC<CourseContentTreeViewProps> = ({
  folderStack,
  onBackFolder,
  currentFolder,
  searchQuery,
  setSearchQuery,
  isFilterOpen,
  setIsFilterOpen,
  contentTypeFilter,
  setContentTypeFilter,
  itemsCount,
  renderItems
}) => {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-6 py-4 px-2">
        <BreadcrumbHeader
          folderStack={folderStack}
          onBackFolder={onBackFolder}
          currentFolder={currentFolder}
        />
        <CourseContentToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          contentTypeFilter={contentTypeFilter}
          setContentTypeFilter={setContentTypeFilter}
        />
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-visible">
        <div className="p-4 space-y-3 overflow-visible">
          {itemsCount === 0 ? (
            <EmptyState />
          ) : (
            renderItems
          )}
          {itemsCount > 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-[13px] font-medium text-gray-400">You've seen all the items in the list.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CourseContentTreeView);
