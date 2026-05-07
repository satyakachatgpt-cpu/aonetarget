import React from 'react';
import TestsResultsTab from './TestsResultsTab';

interface Props {
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

const TestsResultsView: React.FC<Props> = (props) => {
  return (
    <TestsResultsTab
      {...props}
    />
  );
};

export default TestsResultsView;
