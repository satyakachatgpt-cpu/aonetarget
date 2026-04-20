import React from "react";
import AddQuestionDrawer from "../AddQuestionDrawer";

interface AddQuestionEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  viewingQuestion: any;
  setViewingQuestion: (q: any) => void;
  questions: any[];
  sections: { id: string; name: string }[];
  testId: string;
  showToast: (m: string, type?: "success" | "error") => void;
}

const AddQuestionEditorDrawer: React.FC<AddQuestionEditorDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  viewingQuestion,
  setViewingQuestion,
  questions,
  sections,
  testId,
  showToast,
}) => {
  // Helper to handle Save and Go to another question
  const handleSaveAndNavigate = async (data: any, direction: "next" | "prev") => {
    try {
      await onSubmit(data);
      
      const currentId = data.id || data._id;
      const currentIdx = questions.findIndex(
        (q: any) => (q.id || q._id) === currentId
      );

      if (direction === "prev") {
        if (currentIdx > 0) {
          setViewingQuestion(questions[currentIdx - 1]);
        } else {
          showToast("This is the first question", "error");
          onClose(); // Or stay on current? Parent behavior was close/null
        }
      } else {
        if (currentIdx < questions.length - 1) {
          setViewingQuestion(questions[currentIdx + 1]);
        } else {
          showToast("This is the last question", "error");
          onClose();
        }
      }
    } catch (err) {
      // Error is handled by parent onSubmit (toast)
    }
  };

  return (
    <AddQuestionDrawer
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={(data) => {
        onSubmit(data).then(() => onClose());
      }}
      editingQuestion={
        viewingQuestion &&
        typeof viewingQuestion === "object" &&
        Object.keys(viewingQuestion).length > 0
          ? viewingQuestion
          : null
      }
      sections={sections}
      testId={testId}
      onSaveAndGoToPrevious={(data) => handleSaveAndNavigate(data, "prev")}
      onSaveAndGoToNext={(data) => handleSaveAndNavigate(data, "next")}
    />
  );
};

export default AddQuestionEditorDrawer;
