import { useState, useCallback } from 'react';

export const useTestsBulkUploadState = () => {
  const [bulkUploadData, setBulkUploadData] = useState<{
    testSeries: string;
    testTitle: string;
    format: string;
    file: File | null;
    parsedQuestions: any[];
    extractedImages: string[];
    uploadMode: 'append' | 'replace';
  }>({
    testSeries: "",
    testTitle: "",
    format: "default",
    file: null,
    parsedQuestions: [],
    extractedImages: [],
    uploadMode: 'append',
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [activeImageAssignment, setActiveImageAssignment] = useState<{
    questionId: number;
    field: string;
  } | null>(null);

  const handleImageSelect = useCallback((dataUrl: string, explicitAssignment?: { questionId: number | string, field: string }) => {
    const assignment = explicitAssignment || activeImageAssignment;
    if (!assignment) return;
    const { questionId, field } = assignment;
    setBulkUploadData(prev => ({
      ...prev,
      parsedQuestions: prev.parsedQuestions.map(q => {
        if (q.id === questionId) {
          if (field === "question") return { ...q, questionImage: dataUrl, hasDiagramOptions: false };
          if (field === "solution") return { ...q, solutionImage: dataUrl };
          
          // Handle option images
          const oIdx = field.charCodeAt(0) - 65; // A=0, B=1...
          const newOptionImages = [...(q.optionImages || ["", "", "", ""])];
          newOptionImages[oIdx] = dataUrl;
          return { ...q, optionImages: newOptionImages };
        }
        return q;
      })
    }));
    setActiveImageAssignment(null);
  }, [activeImageAssignment]);

  const handleRemoveImage = useCallback((qId: number, field: string) => {
    setBulkUploadData(prev => ({
      ...prev,
      parsedQuestions: prev.parsedQuestions.map(q => {
        if (q.id === qId) {
          if (field === "question") return { ...q, questionImage: "" };
          const oIdx = field.charCodeAt(0) - 65;
          const newOptionImages = [...(q.optionImages || ["", "", "", ""])];
          newOptionImages[oIdx] = "";
          return { ...q, optionImages: newOptionImages };
        }
        return q;
      })
    }));
  }, []);

  return {
    bulkUploadData,
    setBulkUploadData,
    uploadProgress,
    setUploadProgress,
    isParsing,
    setIsParsing,
    activeImageAssignment,
    setActiveImageAssignment,
    handleImageSelect,
    handleRemoveImage
  };
};
