import { useCallback } from 'react';
import { testsAPI, resultsAPI } from '../services/apiClient';

interface Props {
  editingTest: any;
  viewingTestSeries: any;
  courses: any[];
  showToast: (m: string, type?: "success" | "error") => void;
  tests: any[];
  setTests: (val: any) => void;
  loadData: () => void;
  setDetailTests: (val: any) => void;
  handleCloseModal: () => void;
  selectedTests: string[];
  setSelectedTests: (val: any) => void;
  navigate: (path: string) => void;
  setActiveActionMenuId: (val: any) => void;
  activeTab: string;
  loadResults: () => void;
  paginatedTests: any[];
}

export const useTestsCrudActions = ({
  editingTest,
  viewingTestSeries,
  courses,
  showToast,
  tests,
  setTests,
  loadData,
  setDetailTests,
  handleCloseModal,
  selectedTests,
  setSelectedTests,
  navigate,
  setActiveActionMenuId,
  activeTab,
  loadResults,
  paginatedTests,
}: Props) => {
  const handleSubmit = useCallback(async (data: any) => {
    const effectiveCourseId =
      data.courseId || viewingTestSeries?.id || viewingTestSeries?._id || "";
    const effectiveCourseName =
      data.courseName ||
      (viewingTestSeries
        ? viewingTestSeries.name || viewingTestSeries.title
        : "");

    if (!data.name) {
      showToast("Please fill Test Title", "error");
      return;
    }

    const selectedCourse =
      courses.find(
        (c) =>
          c.id === effectiveCourseId || (c as any)._id === effectiveCourseId,
      ) || viewingTestSeries;

    try {
      const testData: any = {
        id: editingTest?.id || `test_${Date.now()}`,
        name: data.name,
        courseId: effectiveCourseId,
        courseName: selectedCourse
          ? selectedCourse.name || selectedCourse.title
          : effectiveCourseName,
        course: selectedCourse
          ? selectedCourse.name || selectedCourse.title
          : effectiveCourseName,
        noOfQuestions: parseInt(data.noOfQuestions || data.questions) || 0,
        duration: parseInt(data.duration || 0) || 0,
        status: data.status || "active",
        openDate: data.openDate || "",
        closeDate: data.closeDate || "",
        featured: data.featured || false,
        price: data.price,
        logo: data.image,
        sortBy: data.sortBy,
        isSeries: viewingTestSeries ? false : true,
        validity: data.validity,
        expiryMode: data.expiryMode,
        mrp: data.mrp,
        description: data.description,
        disableCoupons: data.disableCoupons,
        enableCombo: data.enableCombo,
        includeTestMaker: data.includeTestMaker,
        allowPayment: data.allowPayment,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        enableRichSnippets: data.enableRichSnippets,
        testSeriesId: viewingTestSeries
          ? viewingTestSeries.id || viewingTestSeries._id
          : undefined,
        date:
          editingTest?.date ||
          new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      };

      if (editingTest) {
        try {
          await testsAPI.update(
            editingTest.id || (editingTest as any)._id,
            testData,
          );
          setTests(
            tests.map((t) =>
              (t.id || (t as any)._id) ===
                (editingTest.id || (editingTest as any)._id)
                ? testData
                : t,
            ),
          );
          showToast("Test updated successfully!");
        } catch (apiError) {
          console.error("API update error:", apiError);
          setTests(
            tests.map((t) =>
              (t.id || (t as any)._id) ===
                (editingTest.id || (editingTest as any)._id)
                ? testData
                : t,
            ),
          );
          showToast("Test updated (local only)");
        }
      } else {
        try {
          await testsAPI.create(testData);
          setTests((prev: any) => [...prev, testData]);
          loadData();
          if (viewingTestSeries) {
            const seriesId =
              viewingTestSeries.id || (viewingTestSeries as any)._id;
            const res = await fetch(`/api/courses/${seriesId}/tests`);
            if (res.ok) {
              const data = await res.json();
              setDetailTests(Array.isArray(data) ? data : []);
            } else {
              setDetailTests((prev: any) => [...prev, testData]);
            }
          }
          showToast("Test created successfully!");
        } catch (apiError) {
          console.error("API create error:", apiError);
          setTests([...tests, testData]);
          showToast("Test created (local only)");
        }
      }

      handleCloseModal();
    } catch (error) {
      console.error("Test save error:", error);
      showToast(
        `Error: ${error instanceof Error ? error.message : "Failed to save test"}`,
        "error",
      );
    }
  }, [editingTest, viewingTestSeries, courses, showToast, tests, setTests, loadData, setDetailTests, handleCloseModal]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTests.length === 0) return;
    if (confirm(`Delete ${selectedTests.length} selected tests?`)) {
      try {
        await Promise.all(selectedTests.map((id) => testsAPI.delete(id)));
        setTests(
          tests.filter((t) => !selectedTests.includes(t.id || (t as any)._id)),
        );
        setSelectedTests([]);
        showToast(`${selectedTests.length} tests deleted!`);
      } catch (error) {
        showToast("Failed to delete tests", "error");
      }
    }
  }, [selectedTests, tests, setTests, setSelectedTests, showToast]);

  const toggleStatus = useCallback(async (test: any) => {
    const newStatus = test.status === "active" ? "inactive" : "active";
    try {
      const updatedTest = { ...test, status: newStatus as any };
      await testsAPI.update(test.id || (test as any)._id, updatedTest);
      setTests(
        tests.map((t: any) =>
          (t.id || (t as any)._id) === (test.id || (test as any)._id)
            ? updatedTest
            : t,
        ),
      );
      showToast(`Test ${newStatus}!`);
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  }, [tests, setTests, showToast]);

  const toggleFeatured = useCallback(async (test: any) => {
    try {
      const updatedTest = { ...test, featured: !test.featured };
      await testsAPI.update(test.id || (test as any)._id, updatedTest);
      setTests(
        tests.map((t: any) =>
          (t.id || (t as any)._id) === (test.id || (test as any)._id)
            ? updatedTest
            : t,
        ),
      );
      showToast(
        test.featured ? "Removed from featured!" : "Added to featured!",
      );
    } catch (error) {
      showToast("Failed to update test", "error");
    }
  }, [tests, setTests, showToast]);

  const downloadFile = useCallback(async (url: string, filename: string) => {
    try {
      showToast("Downloading file...");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Download started!");
    } catch (err) {
      showToast("Failed to download PDF", "error");
    }
  }, [showToast]);

  const handleViewResults = useCallback((test: any) => {
    const testId = test.id || (test as any)._id;
    navigate(`/admin/tests/${testId}/results`);
    setActiveActionMenuId(null);
  }, [navigate, setActiveActionMenuId]);

  const handleReevaluate = useCallback(async (test: any) => {
    const testId = test.id || (test as any)._id;
    try {
      showToast("Re-evaluating attempts...");
      await resultsAPI.reevaluate(testId);
      showToast("Re-evaluation completed successfully!");
      if (activeTab === "Results") {
        loadResults();
      }
      loadData(); 
    } catch (err: any) {
      showToast(err.message || "Failed to re-evaluate", "error");
    }
  }, [showToast, activeTab, loadResults, loadData]);

  const handleExportPDF = useCallback(async (test: any, withSolution: boolean) => {
    const testId = test.id || (test as any)._id;
    const testName = (test.name || test.title || "test").replace(/\s+/g, "-").toLowerCase();
    const filename = `${testName}-${withSolution ? "with" : "without"}-solution.pdf`;
    const url = `/api/tests/${testId}/export?solution=${withSolution}`;
    await downloadFile(url, filename);
  }, [downloadFile]);

  const toggleSelectAll = useCallback(() => {
    if (selectedTests.length === paginatedTests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(paginatedTests.map((t) => t.id || (t as any)._id));
    }
  }, [selectedTests, paginatedTests, setSelectedTests]);

  const toggleSelectTest = useCallback((id: string) => {
    setSelectedTests((prev: string[]) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }, [setSelectedTests]);

  return {
    handleSubmit,
    handleBulkDelete,
    toggleStatus,
    toggleFeatured,
    handleViewResults,
    handleReevaluate,
    handleExportPDF,
    toggleSelectAll,
    toggleSelectTest,
  };
};
