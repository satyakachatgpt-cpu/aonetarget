import React from 'react';
import TestsReportedQuestionsTab from './TestsReportedQuestionsTab';

interface Props {
  reportedQuestions: any[];
  reportedSearchQuery: string;
  setReportedSearchQuery: (val: string) => void;
  reportedFilters: any;
  setReportedFilters: (val: any) => void;
  reportedPageSize: number;
  setReportedPageSize: (val: number) => void;
  reportedCurrentPage: number;
  setReportedCurrentPage: (val: number) => void;
  selectedReportedIds: string[];
  setSelectedReportedIds: (val: string[]) => void;
  handleBulkDeleteReports: () => Promise<void>;
  handleQuickResolve: (id: string) => Promise<void>;
  handleDeleteReport: (id: string) => Promise<void>;
  isReportedFilterOpen: boolean;
  setIsReportedFilterOpen: (val: boolean) => void;
  loading: boolean;
}

const TestsReportedView: React.FC<Props> = (props) => {
  return (
    <TestsReportedQuestionsTab {...props} />
  );
};

export default TestsReportedView;
