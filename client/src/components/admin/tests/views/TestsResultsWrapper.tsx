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
  selectedResultIds: string[];
  setSelectedResultIds: (val: string[] | ((prev: string[]) => string[])) => void;
  latestFilter: string;
  setLatestFilter: (val: string) => void;
}

const TestsResultsWrapper: React.FC<TestsResultsWrapperProps> = (props) => {
  return (
    <div className="p-4 md:p-8 space-y-8">
      <TestsResultsView 
        {...props} 
      />
    </div>
  );
};

export default TestsResultsWrapper;
