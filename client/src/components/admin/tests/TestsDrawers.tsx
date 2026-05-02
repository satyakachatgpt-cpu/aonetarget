import React from "react";
import AddTestDrawer from "../AddTestDrawer";
import AddSingleTestDrawer from "../AddSingleTestDrawer";
import AddTestPDFDrawer from "../AddTestPDFDrawer";
import SubjectiveTestDrawer from "../SubjectiveTestDrawer";
import AddTestPDFBulkDrawer from "../AddTestPDFBulkDrawer";
import AddQuestionDrawer from "../AddQuestionDrawer";
import BulkEditQuestionsDrawer from "../BulkEditQuestionsDrawer";
import { testsAPI, questionsAPI, getAdminHeaders } from "../../../services/apiClient";

interface Props {
  showModal: boolean;
  handleCloseModal: () => void;
  handleSubmit: (data: any) => void;
  editingTest: any;
  courses: any[];
  viewingTestSeries: any;
  showAddSingleTestDrawer: boolean;
  setShowAddSingleTestDrawer: (val: boolean) => void;
  setEditingTest: (val: any) => void;
  testSeries: any[];
  showToast: (m: string, type?: "success" | "error") => void;
  loadData: () => void;
  routeId: string | undefined;
  navigate: (path: string, options?: any) => void;
  showAddTestPDFDrawer: boolean;
  setShowAddTestPDFDrawer: (val: boolean) => void;
  showSubjectiveTestDrawer: boolean;
  setShowSubjectiveTestDrawer: (val: boolean) => void;
  showAddTestPDFBulkDrawer: boolean;
  setShowAddTestPDFBulkDrawer: (val: boolean) => void;
  viewingAddQuestionForm: any;
  setViewingAddQuestionForm: (val: any) => void;
  viewingQuestionEditor: any;
  handleSaveQuestion: (data: any) => Promise<void>;
  editorQuestions: any[];
  setEditorQuestions: (val: any[]) => void;
  showBulkEditDrawer: boolean;
  setShowBulkEditDrawer: (val: boolean) => void;
}

const TestsDrawers: React.FC<Props> = ({
  showModal,
  handleCloseModal,
  handleSubmit,
  editingTest,
  courses,
  viewingTestSeries,
  showAddSingleTestDrawer,
  setShowAddSingleTestDrawer,
  setEditingTest,
  testSeries,
  showToast,
  loadData,
  routeId,
  navigate,
  showAddTestPDFDrawer,
  setShowAddTestPDFDrawer,
  showSubjectiveTestDrawer,
  setShowSubjectiveTestDrawer,
  showAddTestPDFBulkDrawer,
  setShowAddTestPDFBulkDrawer,
  viewingAddQuestionForm,
  setViewingAddQuestionForm,
  viewingQuestionEditor,
  handleSaveQuestion,
  editorQuestions,
  setEditorQuestions,
  showBulkEditDrawer,
  setShowBulkEditDrawer,
}) => {
  return (
    <>
      <AddTestDrawer
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        editingTest={editingTest}
        courses={courses.map((c) => ({ ...c, id: c.id || c._id }))}
        defaultCourseId={viewingTestSeries?.id || (viewingTestSeries as any)?._id}
      />

      <AddSingleTestDrawer
        isOpen={showAddSingleTestDrawer}
        onClose={() => {
          setShowAddSingleTestDrawer(false);
          setEditingTest(null);
        }}
        editingTest={editingTest}
        testSeriesOptions={testSeries.map((ts) => ({
          value: ts.id || ts._id,
          label: ts.name || ts.title || "Unnamed Series",
        }))}
        defaultTestSeries={
          viewingTestSeries
            ? [viewingTestSeries.id || (viewingTestSeries as any)._id]
            : []
        }
        showToast={showToast}
        onSubmit={async (testData) => {
          try {
            const effectiveCourseId =
              Array.isArray(testData.testSeries) && testData.testSeries.length > 0
                ? testData.testSeries[0]
                : viewingTestSeries?.id || (viewingTestSeries as any)._id;

            const payload = {
              ...testData,
              name: testData.title || testData.name,
              courseId: effectiveCourseId,
              courseIds:
                Array.isArray(testData.testSeries) && testData.testSeries.length > 0
                  ? testData.testSeries
                  : [effectiveCourseId],
              isSeries: false,
              status: "active",
              questions: 0,
              noOfQuestions: parseInt(testData.noOfQuestions) || 0,
              time:
                parseInt(testData.totalDuration) ||
                parseInt(testData.duration) ||
                0,
              marks: parseInt(testData.totalMarks) || 0,
              duration:
                parseInt(testData.totalDuration) ||
                parseInt(testData.duration) ||
                0,
              openDate: testData.startDate || "",
              closeDate: testData.endDate || "",
              sortBy: testData.sortingOrder || "0.00",
            };

            if (editingTest) {
              const targetId = editingTest.id || editingTest._id || (editingTest as any)._id;
              await testsAPI.update(targetId, payload);
              showToast("Test updated successfully", "success");
            } else {
              await testsAPI.create(payload);
              showToast("Test added successfully", "success");
            }

            await loadData();
            setShowAddSingleTestDrawer(false);
            setEditingTest(null);

            if (routeId) {
              navigate("/admin/tests", { replace: true });
            }
          } catch (err: any) {
            showToast(err.message || "Failed to save test", "error");
          }
        }}
      />

      <AddTestPDFDrawer
        isOpen={showAddTestPDFDrawer}
        onClose={() => setShowAddTestPDFDrawer(false)}
        onSubmit={async (data) => {
          try {
            if (!data.pdfFiles || data.pdfFiles.length === 0) {
              throw new Error("Please select at least one PDF file");
            }
            showToast(`Processing ${data.pdfFiles.length} PDF(s)...`, "success");
            const targetCourseId =
              viewingTestSeries?.id ||
              (viewingTestSeries as any)?._id ||
              (data.testSeries && data.testSeries.length > 0
                ? data.testSeries[0]
                : "");

            for (let i = 0; i < data.pdfFiles.length; i++) {
              const file = data.pdfFiles[i];
              const originalTitle = data.title || "Untitled Test";
              const testTitle =
                data.pdfFiles.length > 1
                  ? file.name.replace(/\.[^/.]+$/, "")
                  : originalTitle;

              await testsAPI.create({
                ...data,
                title: testTitle,
                name: testTitle,
                courseId: targetCourseId,
                courseIds:
                  Array.isArray(data.testSeries) && data.testSeries.length > 0
                    ? data.testSeries
                    : [targetCourseId],
                type: "PDF",
                pdfFile: file,
              });
            }

            setShowAddTestPDFDrawer(false);
            showToast(
              `${data.pdfFiles.length} Test PDF(s) added successfully`,
              "success",
            );
            loadData();
          } catch (err: any) {
            showToast(err.message, "error");
          }
        }}
        testSeriesOptions={testSeries.map((ts) => ({
          value: ts.id || ts._id,
          label: ts.name || ts.title || "Unnamed Series",
        }))}
      />

      <SubjectiveTestDrawer
        isOpen={showSubjectiveTestDrawer}
        onClose={() => setShowSubjectiveTestDrawer(false)}
        onAddTests={(data) => {
          console.log("Subjective Test Added:", data);
          setShowSubjectiveTestDrawer(false);
          showToast("Subjective Test added successfully", "success");
        }}
        testSeriesOptions={testSeries.map((ts) => ({
          value: ts.id || ts._id,
          label: ts.name || ts.title || "Unnamed Series",
        }))}
      />

      <AddTestPDFBulkDrawer
        isOpen={showAddTestPDFBulkDrawer}
        onClose={() => setShowAddTestPDFBulkDrawer(false)}
        onSubmit={async (data) => {
          try {
            showToast("Creating test and uploading questions...", "success");
            
            // 1. Create the Test record
            const targetCourseId =
              viewingTestSeries?.id ||
              (viewingTestSeries as any)?._id ||
              (data.testSeries && data.testSeries.length > 0
                ? data.testSeries[0]
                : "");

            const totalMarks = Number(data.marks) || 0;
            const totalTime = Number(data.time) || 0;

            const testResponse = await testsAPI.create({
              name: data.title,
              title: data.title,
              courseId: targetCourseId,
              courseIds: [targetCourseId],
              type: "Standard", 
              noOfQuestions: data.parsedQuestions?.length || 0,
              marks: totalMarks,
              time: totalTime,
              duration: totalTime,
              sortBy: data.sortingOrder || "0.00",
              subject: data.subject || "",
              isFree: data.freeFlag === 'Free',
              status: "active"
            });

            const newTestId = testResponse.id || testResponse._id;

            // 2. Upload Questions sequentially
            if (data.parsedQuestions && data.parsedQuestions.length > 0) {
                let successCount = 0;
                const marksPerQ = totalMarks > 0 ? (totalMarks / data.parsedQuestions.length) : 4;

                for (const q of data.parsedQuestions) {
                    await questionsAPI.create({
                        ...q,
                        testId: newTestId,
                        courseId: targetCourseId,
                        marks: marksPerQ,
                        positiveMarks: marksPerQ,
                        negative: -1,
                        negativeMarks: -1
                    });
                    successCount++;
                }
                showToast(`Test created with ${successCount} questions!`, "success");
            } else {
                showToast("Test created (no questions found)", "success");
            }

            setShowAddTestPDFBulkDrawer(false);
            loadData();
          } catch (err: any) {
            showToast(err.message || "Failed to complete bulk upload", "error");
          }
        }}
      />

      {viewingAddQuestionForm && (
        <AddQuestionDrawer
          isOpen={!!viewingAddQuestionForm}
          test={viewingQuestionEditor}
          onClose={() => setViewingAddQuestionForm(null)}
          onSubmit={(data) => {
            handleSaveQuestion(data);
          }}
          editingQuestion={
            viewingAddQuestionForm &&
            typeof viewingAddQuestionForm === "object" &&
            Object.keys(viewingAddQuestionForm).length > 0
              ? viewingAddQuestionForm
              : null
          }
          sections={[
            { id: "default", name: viewingQuestionEditor?.name || "Default" },
          ]}
          testId={viewingQuestionEditor?.id || viewingQuestionEditor?._id || ""}
          onSaveAndGoToPrevious={(data) => {
            handleSaveQuestion(data).then(() => {
              const currentId = data.id || data._id;
              const currentIdx = editorQuestions.findIndex(
                (q: any) => (q.id || q._id) === currentId,
              );
              if (currentIdx > 0) {
                setViewingAddQuestionForm(editorQuestions[currentIdx - 1]);
              } else {
                showToast("This is the first question", "error");
                setViewingAddQuestionForm(null);
              }
            });
          }}
          onSaveAndGoToNext={(data) => {
            handleSaveQuestion(data).then(() => {
              const currentId = data.id || data._id;
              const currentIdx = editorQuestions.findIndex(
                (q: any) => (q.id || q._id) === currentId,
              );
              if (currentIdx < editorQuestions.length - 1) {
                setViewingAddQuestionForm(editorQuestions[currentIdx + 1]);
              } else {
                showToast("This is the last question", "error");
                setViewingAddQuestionForm(null);
              }
            });
          }}
        />
      )}

      {showBulkEditDrawer && (
        <BulkEditQuestionsDrawer
          isOpen={showBulkEditDrawer}
          onClose={() => setShowBulkEditDrawer(false)}
          questions={editorQuestions}
          test={viewingQuestionEditor}
          testName={viewingQuestionEditor?.name || viewingQuestionEditor?.title}
          onSave={async (updatedQuestions) => {
            try {
              const individualUpdates = updatedQuestions.map(async (q: any) => {
                const qId = q.id || q._id;
                if (qId && typeof qId === "string" && qId.length > 5) {
                  try {
                    return await fetch(`/api/questions/${qId}`, {
                      method: "PUT",
                      headers: {
                        ...getAdminHeaders(),
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(q),
                    });
                  } catch (e) {
                    console.warn(`Failed to update individual question ${qId}`, e);
                  }
                }
                return null;
              });

              await Promise.all(individualUpdates);

              setEditorQuestions(updatedQuestions);
              await testsAPI.update(
                viewingQuestionEditor.id || viewingQuestionEditor._id,
                {
                  ...viewingQuestionEditor,
                  questions: updatedQuestions,
                },
              );

              showToast("Bulk edit changes saved successfully", "success");
            } catch (error: any) {
              showToast(error.message || "Failed to save bulk edits", "error");
              throw error;
            }
          }}
        />
      )}
    </>
  );
};

export default React.memo(TestsDrawers);
