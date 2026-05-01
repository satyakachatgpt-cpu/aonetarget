import React from 'react';
import BulkActionBar from './BulkActionBar';
import ContentFilters from './ContentFilters';

interface CourseContentToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  contentTypeFilter: string;
  setContentTypeFilter: (type: string) => void;
  onBulkActionClick?: () => void;
}

const CourseContentToolbar: React.FC<CourseContentToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  isFilterOpen,
  setIsFilterOpen,
  contentTypeFilter,
  setContentTypeFilter,
  onBulkActionClick
}) => {
  return (
    <div className="flex items-center gap-3">
      <BulkActionBar onBulkActionClick={onBulkActionClick} />
      <ContentFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        contentTypeFilter={contentTypeFilter}
        setContentTypeFilter={setContentTypeFilter}
      />
    </div>
  );
};

export default React.memo(CourseContentToolbar);
