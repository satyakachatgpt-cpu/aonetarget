import { useCallback } from 'react';
import { questionsAPI, testsAPI, invalidateCache } from '../services/apiClient';

interface Props {
  questionFormData: any;
  viewingQuestionEditor: any;
  showToast: (m: string, type?: "success" | "error") => void;
  setEditorQuestions: (val: any) => void;
  setViewingAddQuestionForm: (val: any) => void;
  setQuestionFormData: (val: any) => void;
}

export const useTestsQuestionActions = ({
  questionFormData,
  viewingQuestionEditor,
  showToast,
  setEditorQuestions,
  setViewingAddQuestionForm,
  setQuestionFormData,
}: Props) => {
  const handleSaveQuestion = useCallback(async (data?: any) => {
    const payload = data || questionFormData;
    if (!payload) return;
    try {
      const editorId = viewingQuestionEditor?.id || viewingQuestionEditor?._id;
      const questionId = String(payload.id || payload._id || "");

      if (questionId) {
        console.log(
          "[handleSaveQuestion] Updating question:",
          questionId,
          "payload keys:",
          Object.keys(payload),
        );
        await questionsAPI.update(questionId, payload);
        showToast("Question updated successfully", "success");

        setEditorQuestions((prev: any[]) =>
          prev.map((q: any) => {
            const qId = String(q.id || q._id || "");
            if (qId === questionId) {
              return { ...q, ...payload };
            }
            return q;
          })
        );
      } else {
        console.log(
          "[handleSaveQuestion] Creating new question for test:",
          editorId,
        );
        await questionsAPI.create({ ...payload, testId: editorId });
        showToast("Question created successfully", "success");

        if (editorId) {
          invalidateCache("tests");
          const qs = await testsAPI.getQuestions(editorId);
          setEditorQuestions(qs);
        }
      }

      invalidateCache("tests");
      setViewingAddQuestionForm(null);
      setQuestionFormData(null);
    } catch (err: any) {
      console.error("[handleSaveQuestion] Error:", err);
      showToast(err.message || "Failed to save question", "error");
    }
  }, [questionFormData, viewingQuestionEditor, showToast, setEditorQuestions, setViewingAddQuestionForm, setQuestionFormData]);

  const handleDeleteQuestion = useCallback(async (id: string | number) => {
    if (!window.confirm("Are you sure you want to delete this question?"))
      return;
    try {
      await questionsAPI.delete(String(id));
      invalidateCache("tests");
      showToast("Question deleted successfully", "success");
      const editorId = viewingQuestionEditor?.id || viewingQuestionEditor?._id;
      if (editorId) {
        const qs = await testsAPI.getQuestions(editorId);
        setEditorQuestions(qs);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }, [viewingQuestionEditor, showToast, setEditorQuestions]);

  return {
    handleSaveQuestion,
    handleDeleteQuestion,
  };
};
