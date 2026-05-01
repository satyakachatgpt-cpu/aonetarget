import React from "react";
import TestsResultsView from "../TestsResultsView";

interface TestsResultsWrapperProps {
  results: any[];
  resultFilters: any;
  setResultFilters: (val: any) => void;
  resultsPageSize: number;
  setResultsPageSize: (val: number) => void;
  resultsCurrentPage: number;
  setResultsCurrentPage: (val: number) => void;
  tests: any[];
  showToast: (m: string, type?: "success" | "error") => void;
  setViewingStudentAnalysis: (val: any) => void;
  loading: boolean;
}

const TestsResultsWrapper: React.FC<TestsResultsWrapperProps> = (props) => {
  return <TestsResultsView {...props} />;
};

export default TestsResultsWrapper;
