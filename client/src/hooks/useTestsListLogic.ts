import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounce } from "./useDebounce";
import { testsAPI, coursesAPI, testSeriesAPI, invalidateCache } from "../services/apiClient";

interface Test {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  course: string;
  courseId: string;
  courseName: string;
  questions: number | string;
  status: "active" | "inactive" | "scheduled" | "draft";
  date: string;
  openDate?: string;
  closeDate?: string;
  duration?: number | string;
  featured?: boolean;
  totalAttempts?: number;
  avgScore?: number;
  logo?: string;
  image?: string;
  price?: number | string;
  sortBy?: number | string;
  marks?: number | string;
  time?: number | string;
  published?: string;
  isSeries?: boolean;
}

interface Course {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  categoryId?: string;
}

export const useTestsListLogic = (showToast: (m: string, type?: "success" | "error") => void) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const loadData = useCallback(async () => {
    // Safety fallback: Ensure loading is disabled after 10 seconds 
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 10000);

    try {
      const [testData, courseData, seriesData] = await Promise.all([
        testsAPI.getAll().catch((err) => {
          console.error("Error fetching tests:", err);
          return [];
        }),
        coursesAPI.getAll().catch((err) => {
          console.error("Error fetching courses:", err);
          return [];
        }),
        testSeriesAPI.getAll().catch((err) => {
          console.error("Error fetching test series:", err);
          return [];
        }),
      ]);
      setTests(Array.isArray(testData) ? testData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setTestSeries(Array.isArray(seriesData) ? seriesData : []);
    } catch (error) {
      console.error("loadData massive failure:", error);
      setTests([]);
      setCourses([]);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string, viewingTestSeries?: any, setDetailTests?: React.Dispatch<React.SetStateAction<any[]>>) => {
    if (confirm("Are you sure you want to delete this test?")) {
      try {
        await testsAPI.delete(id);
        setTests(prev => prev.filter((t) => (t.id || (t as any)._id) !== id));
        if (viewingTestSeries && setDetailTests) {
          setDetailTests((prev) =>
            prev.filter((t) => (t.id || (t as any)._id) !== id),
          );
        }
        showToast("Test deleted successfully!");
      } catch (error) {
        showToast("Failed to delete test", "error");
      }
    }
  }, [showToast]);

  const handleDuplicateTest = useCallback(async (test: any, viewingTestSeries?: any, setDetailTests?: React.Dispatch<React.SetStateAction<any[]>>) => {
    const testId = test.id || (test as any)._id;
    try {
      showToast("Duplicating test...");
      const response = await testsAPI.duplicate(testId);
      const createdTest = response?.data || response;
      setTests((prev) => [...prev, createdTest]);
      if (viewingTestSeries && setDetailTests) {
        setDetailTests((prev) => [...prev, createdTest]);
      }
      showToast("Test duplicated successfully!");
    } catch (error) {
      console.error("Duplicate error:", error);
      showToast("Failed to duplicate test", "error");
    }
  }, [showToast]);

  const handlePublish = useCallback(async (id: string, viewingTestSeries?: any, setDetailTests?: React.Dispatch<React.SetStateAction<any[]>>) => {
    try {
      showToast("Updating publish status...");
      await testsAPI.publish(id);
      setTests((prev) =>
        prev.map((t) =>
          (t.id || (t as any)._id) === id
            ? { ...t, status: t.status === "active" ? "inactive" : "active" }
            : t,
        ),
      );
      if (viewingTestSeries && setDetailTests) {
        setDetailTests((prev) =>
          prev.map((t) =>
            (t.id || (t as any)._id) === id
              ? { ...t, status: t.status === "active" ? "inactive" : "active" }
              : t,
          ),
        );
      }
      showToast("Publish status updated!");
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  }, [showToast]);

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        (test.name &&
          test.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      const matchesCourse =
        !filterCourse ||
        test.courseId === filterCourse ||
        (!test.courseId && test.course === filterCourse);
      const matchesStatus = !filterStatus || test.status === filterStatus;

      // ONLY show Test Series in the main global list.
      const isMainSeries = test.isSeries === true;

      return matchesSearch && matchesCourse && matchesStatus && isMainSeries;
    }).sort((a, b) => {
      const sortA = parseFloat(String(a.sortBy || "0")) || 0;
      const sortB = parseFloat(String(b.sortBy || "0")) || 0;
      return sortB - sortA;
    });
  }, [tests, debouncedSearchQuery, filterCourse, filterStatus]);

  const totalPages = useMemo(() => Math.ceil(filteredTests.length / itemsPerPage), [filteredTests.length, itemsPerPage]);
  
  const paginatedTests = useMemo(() => {
    return filteredTests.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredTests, currentPage, itemsPerPage]);

  return {
    tests,
    setTests,
    courses,
    setCourses,
    testSeries,
    setTestSeries,
    loading,
    setLoading,
    searchQuery,
    setSearchQuery,
    filterCourse,
    setFilterCourse,
    filterStatus,
    setFilterStatus,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    isFilterOpen,
    setIsFilterOpen,
    loadData,
    handleDelete,
    handleDuplicateTest,
    handlePublish,
    filteredTests,
    totalPages,
    paginatedTests
  };
};
