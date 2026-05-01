import React from "react";
import TestsReportedView from "../TestsReportedView";

interface TestsReportedWrapperProps {
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

const TestsReportedWrapper: React.FC<TestsReportedWrapperProps> = (props) => {
  return <TestsReportedView {...props} />;
};

export default TestsReportedWrapper;
