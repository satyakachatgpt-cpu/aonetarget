import React from 'react';
import TestsBulkUploaderTab from './TestsBulkUploaderTab';

interface Props {
  bulkUploadData: any;
  setBulkUploadData: (val: any) => void;
  isParsing: boolean;
  setIsParsing: (val: boolean) => void;
  uploadProgress: number;
  handleFinalBulkUpload: () => void;
  tests: any[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  parseFile: (file: File) => Promise<{ questions: any[], extractedImages: string[] }>;
  showToast: (m: string, type?: "success" | "error") => void;
  activeImageAssignment: any;
  setActiveImageAssignment: (val: any) => void;
  handleImageSelect: (image: string, context: any) => void;
  handleRemoveImage: (id: any, field: string) => void;
  generateDOCX: any;
  viewingTestSeries: any;
  viewingQuestionEditor: any;
  setActiveTab: (val: string) => void;
}

const TestsBulkUploaderView: React.FC<Props> = (props) => {
  return (
    <TestsBulkUploaderTab {...props} />
  );
};

export default TestsBulkUploaderView;
