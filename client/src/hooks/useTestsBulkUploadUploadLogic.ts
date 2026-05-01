import { useCallback } from 'react';
import { testsAPI, invalidateCache, getAdminHeaders } from '../services/apiClient';

interface Props {
  bulkUploadData: any;
  setBulkUploadData: (data: any) => void;
  tests: any[];
  detailTests: any[];
  viewingQuestionEditor: any;
  viewingTestSeries: any;
  setEditorQuestions: (qs: any[]) => void;
  setViewingQuestionEditor: (test: any) => void;
  setActiveTab: (tab: string) => void;
  setIsParsing: (isParsing: boolean) => void;
  setUploadProgress: (progress: number) => void;
  loadData: () => void;
  showToast: (m: string, type?: "success" | "error") => void;
}

export const useTestsBulkUploadUploadLogic = ({
  bulkUploadData,
  setBulkUploadData,
  tests,
  detailTests,
  viewingQuestionEditor,
  viewingTestSeries,
  setEditorQuestions,
  setViewingQuestionEditor,
  setActiveTab,
  setIsParsing,
  setUploadProgress,
  loadData,
  showToast
}: Props) => {
  const handleFinalBulkUpload = useCallback(async () => {
    const testId =
      bulkUploadData.testTitle ||
      viewingQuestionEditor?.id ||
      (viewingQuestionEditor as any)?._id;
    if (!bulkUploadData.testSeries && !viewingQuestionEditor) {
      showToast("Please select Test Series", "error");
      return;
    }
    if (!testId) {
      showToast("Please select Test Title", "error");
      return;
    }
    if (
      !bulkUploadData.file ||
      (bulkUploadData.parsedQuestions || []).length === 0
    ) {
      showToast(
        "No questions to upload. Please parse a file first.",
        "error",
      );
      return;
    }

    try {
      const targetTestMatch =
        tests.find((t) => (t.id || (t as any)._id) === testId) ||
        detailTests.find(
          (t) => (t.id || (t as any)._id) === testId,
        );
      
      if (bulkUploadData.uploadMode === 'replace') {
        const confirm = window.confirm("WARNING: 'Replace All' mode will DELETE all existing questions in this test and replace them with the current file contents. Do you want to continue?");
        if (!confirm) return;

        showToast("Clearing existing questions...", "success");
        await fetch(`/api/questions/test/${testId}`, { 
          method: 'DELETE',
          headers: getAdminHeaders()
        });
      }

      // 1. Fetch current questions for duplicate check and limit enforcement
      const existingQuestions = bulkUploadData.uploadMode === 'replace' ? [] : await testsAPI.getQuestions(testId);
      const existingTexts = new Set(
        existingQuestions.map((q: any) =>
          (q.questionEn || q.question || "").trim().toLowerCase(),
        ),
      );

      const limit = targetTestMatch?.noOfQuestions || 0;
      const currentCount = existingQuestions.length;

      if (limit > 0 && currentCount >= limit) {
        showToast(
          `Test already has ${currentCount} questions. Limit is ${limit}.`,
          "error",
        );
        return;
      }

      // 2. Prepare payload - Standardization to displayOptions
      const uploadBase64Image = async (base64Str: string) => {
        if (!base64Str || !base64Str.startsWith("data:image")) return base64Str;
        try {
          const r = await fetch("/api/v2/upload/image/base64", {
            method: "POST",
            headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Str }),
          });
          if (!r.ok) return base64Str;
          const data = await r.json();
          return data.url || base64Str;
        } catch (e) {
          return base64Str;
        }
      };

      let filteredList = (bulkUploadData.parsedQuestions || []).filter(
        (q) => !existingTexts.has((q.questionEn || "").trim().toLowerCase()),
      );

      // Scoring settings from test
      const defaultMarks = targetTestMatch?.marksPerQuestion || targetTestMatch?.marks;
      const defaultNeg = targetTestMatch?.negativeMarking;

      // VALIDATION: Ensure scoring is defined
      const questionsMissingMarks = filteredList.filter(q => !q.positiveMarks && !q.marks && !defaultMarks);
      if (questionsMissingMarks.length > 0) {
        showToast(
          `${questionsMissingMarks.length} questions are missing marks and no Test-level default is set. Please set a 'Marks Per Question' in Test settings first.`,
          "error"
        );
        return;
      }

      setIsParsing(true);
      let questionsToUpload = await Promise.all(
        filteredList.map(async (q) => {
          const qImageUrl = await uploadBase64Image(q.questionImage || "");
          
          const processedOptions = await Promise.all(
            (q.options || []).map(async (opt: string, i: number) => {
              const optImageUrl = await uploadBase64Image(q.optionImages?.[i] || "");
              return {
                id: i + 1,
                text: opt,
                image: optImageUrl,
                isCorrect: String(q.correctAnswer).toUpperCase() === String.fromCharCode(65 + i),
              };
            })
          );

          return {
            testId: testId,
            courseId:
              bulkUploadData.testSeries ||
              viewingTestSeries?.id ||
              (viewingTestSeries as any)?._id,
            questionEn: q.questionEn,
            questionHi: q.questionHi || "",
            questionImage: qImageUrl,
            type: "Multiple Choice Question",
            marks: q.positiveMarks || q.marks || defaultMarks,
            negative: q.negativeMarks || q.negative || defaultNeg,
            positiveMarks: q.positiveMarks || q.marks || defaultMarks,
            negativeMarks: q.negativeMarks || q.negative || defaultNeg,
            displayOptions: processedOptions,
            hasDiagramOptions: q.hasDiagramOptions || false,
            solution: {
              heading: "Full Solution",
              text: q.solution || "",
            },
            format: bulkUploadData.format || "default",
          };
        })
      );


      if (questionsToUpload.length === 0) {
        showToast(
          "All questions in this file already exist in the test.",
          "error",
        );
        setIsParsing(false);
        return;
      }

      // Enforce the limit
      if (
        limit > 0 &&
        currentCount + questionsToUpload.length > limit
      ) {
        const allowed = limit - currentCount;
        showToast(
          `Only ${allowed} out of ${questionsToUpload.length} new q. will be uploaded as per limit (${limit}).`,
          "error",
        );
        questionsToUpload = questionsToUpload.slice(0, allowed);
      }

      showToast(
        `Uploading ${questionsToUpload.length} questions...`,
        "success",
      );

      // 3. Sequential upload with progress
      setUploadProgress(0);
      let uploadedCount = 0;
      const totalToUpload = questionsToUpload.length;

      try {
        for (const q of questionsToUpload) {
          const res = await fetch("/api/questions", {
            method: "POST",
            headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(q),
          });
          if (!res.ok) throw new Error("Upload failed at question " + (uploadedCount + 1));
          uploadedCount++;
          setUploadProgress((uploadedCount / totalToUpload) * 100);
        }

        invalidateCache("tests");
        showToast(
          `${uploadedCount} questions uploaded successfully!`,
          "success",
        );

        // 4. Update the test's viewFormat if needed
        const formatVal = bulkUploadData.format || "default";
        await fetch(`/api/tests/${testId}`, {
          method: "PUT",
          headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ viewFormat: formatVal }),
        });

        // 5. Cleanup and Sync
        setBulkUploadData({
          ...bulkUploadData,
          file: null,
          parsedQuestions: [],
          extractedImages: [],
          uploadMode: 'append'
        });

        // Sync the editor view if we are in it
        const updatedQs = await testsAPI.getQuestions(testId);
        setEditorQuestions(updatedQs);

        // 6. Redirect to view results
        if (targetTestMatch) {
          setViewingQuestionEditor(targetTestMatch);
          setActiveTab("Tests");
        }
        loadData();
        } catch (err: any) {
          showToast(err.message || "Upload failed", "error");
        } finally {
          setIsParsing(false);
          setUploadProgress(0);
        }
      } catch (err: any) {
        showToast(err.message || "Upload failed", "error");
      } finally {
        setIsParsing(false);
        setUploadProgress(0);
      }
  }, [bulkUploadData, tests, detailTests, viewingQuestionEditor, viewingTestSeries, setEditorQuestions, setViewingQuestionEditor, setActiveTab, setIsParsing, setUploadProgress, loadData, showToast, setBulkUploadData]);

  return {
    handleFinalBulkUpload
  };
};
