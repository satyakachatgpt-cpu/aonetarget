import React from 'react';
import BreadcrumbHeader from './BreadcrumbHeader';
import CourseContentToolbar from './CourseContentToolbar';
import ContentEmptyState from './ContentEmptyState';
import ContentListShell from './ContentListShell';

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
  onBulkActionClick?: () => void;
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
  renderItems,
  onBulkActionClick
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
          onBulkActionClick={onBulkActionClick}
        />
      </div>

      <ContentListShell>
        {itemsCount === 0 ? (
          <ContentEmptyState type="empty" />
        ) : (
          renderItems
        )}
        {itemsCount > 0 && (
          <ContentEmptyState type="end-of-list" />
        )}
      </ContentListShell>
    </div>
  );
};

export default React.memo(CourseContentTreeView);
