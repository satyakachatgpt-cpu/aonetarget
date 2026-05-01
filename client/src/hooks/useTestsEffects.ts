import { useEffect, useRef } from 'react';
import { testSeriesAPI, testsAPI } from '../services/apiClient';

interface Props {
  routeId: string | undefined;
  tests: any[];
  courses: any[];
  detailTests: any[];
  location: any;
  setActiveTab: (val: string) => void;
  setViewingQuestionEditor: (val: any) => void;
  setEditingTest: (val: any) => void;
  setShowAddSingleTestDrawer: (val: boolean) => void;
  setResultFilters: (val: any) => void;
  setViewingTestSeries: (val: any) => void;
  viewingTestSeries: any;
  setDetailTests: (val: any) => void;
  viewingTestSeriesTab: string;
  setLoadingUsers: (val: boolean) => void;
  setSeriesUsers: (val: any[]) => void;
  viewingQuestionEditor: any;
  setBulkUploadData: (val: any) => void;
  setEditorQuestions: (val: any[]) => void;
  viewingAddQuestionForm: any;
  setQuestionFormData: (val: any) => void;
  loadData: () => void;
  showFloatingAddMenu: boolean;
  setShowFloatingAddMenu: (val: boolean) => void;
  showFloatingMoreMenu: boolean;
  setShowFloatingMoreMenu: (val: boolean) => void;
  activeActionMenuId: string | number | null;
  setActiveActionMenuId: (val: string | number | null) => void;
  activeMenu: string | null;
  setActiveMenu: (val: string | null) => void;
}

export const useTestsEffects = ({
  routeId,
  tests,
  courses,
  detailTests,
  location,
  setActiveTab,
  setViewingQuestionEditor,
  setEditingTest,
  setShowAddSingleTestDrawer,
  setResultFilters,
  setViewingTestSeries,
  viewingTestSeries,
  setDetailTests,
  viewingTestSeriesTab,
  setLoadingUsers,
  setSeriesUsers,
  viewingQuestionEditor,
  setBulkUploadData,
  setEditorQuestions,
  viewingAddQuestionForm,
  setQuestionFormData,
  loadData,
  showFloatingAddMenu,
  setShowFloatingAddMenu,
  showFloatingMoreMenu,
  setShowFloatingMoreMenu,
  activeActionMenuId,
  setActiveActionMenuId,
  activeMenu,
  setActiveMenu,
}: Props) => {
  useEffect(() => {
    if (routeId) {
      const parts = routeId.split("/");
      const id = parts[0];
      const subPath = parts.slice(1).join("/");

      const foundTest =
        tests.find((t) => t.id === id || (t as any)._id === id) ||
        detailTests.find((t) => t.id === id || (t as any)._id === id);
      const foundCourse = courses.find(
        (c) => c.id === id || (c as any)._id === id,
      );

      if (foundTest) {
        const currentId = viewingTestSeries?.id || viewingTestSeries?._id;
        const newId = foundTest.id || foundTest._id;
        
        if (currentId !== newId) {
          if (subPath === "questions/add" || subPath === "review") {
            setActiveTab("Tests");
            setViewingQuestionEditor(foundTest);
          } else if (subPath === "edit") {
            setActiveTab("Tests");
            setEditingTest(foundTest);
            setShowAddSingleTestDrawer(true);
          } else if (subPath === "results") {
            setActiveTab("Results");
            setResultFilters((prev: any) => ({
              ...prev,
              series: foundTest.courseName || "",
              test: foundTest.name || foundTest.title || "",
            }));
          } else {
            setViewingTestSeries(foundTest);
          }
        }
      } else if (foundCourse) {
        const currentId = viewingTestSeries?.id || viewingTestSeries?._id;
        const newId = foundCourse.id || foundCourse._id;
        if (currentId !== newId) {
          setViewingTestSeries(foundCourse);
        }
      }
    } else if (viewingTestSeries) {
      if (location.pathname === "/admin/tests") {
        setViewingTestSeries(null);
        setViewingQuestionEditor(null);
      }
    }
  }, [routeId, tests, courses, detailTests, location.pathname]);

  useEffect(() => {
    if (viewingTestSeries) {
      const seriesId = viewingTestSeries?.id || viewingTestSeries?._id;
      if (!seriesId) return;
      const loadDetailTests = async () => {
        try {
          const filtered = tests.filter((t: any) => {
            if (!t) return false;
            const tId = t.id || t._id;
            return (
              String(t.courseId) === String(seriesId) ||
              String(t.testSeriesId) === String(seriesId) ||
              (Array.isArray(t.courseIds) && t.courseIds.map(String).includes(String(seriesId)))
            );
          });
          setDetailTests(filtered);
        } catch (err) {
          console.error("Error loading detail tests:", err);
          setDetailTests([]);
        }
      };
      loadDetailTests();
    } else {
      setDetailTests([]);
    }
  }, [viewingTestSeries, tests]);

  useEffect(() => {
    const seriesId = viewingTestSeries?.id || viewingTestSeries?._id;
    if (viewingTestSeries && viewingTestSeriesTab === "Users" && seriesId) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const users = await testSeriesAPI.getUsers(seriesId);
          setSeriesUsers(Array.isArray(users) ? users : []);
        } catch (err) {
          console.error("Error fetching series users:", err);
          setSeriesUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [viewingTestSeries, viewingTestSeriesTab]);

  const lastViewedIds = useRef({ seriesId: "", testId: "" });

  useEffect(() => {
    const seriesId = viewingTestSeries?.id || (viewingTestSeries as any)?._id;
    const testId = viewingQuestionEditor?.id || (viewingQuestionEditor as any)?._id;
    const testSeriesId = viewingQuestionEditor?.courseId || (viewingQuestionEditor as any)?.testSeriesId || seriesId;

    if (seriesId !== lastViewedIds.current.seriesId || testId !== lastViewedIds.current.testId) {
      if (seriesId || testId) {
        setBulkUploadData((prev: any) => ({
          ...prev,
          testSeries: String(testSeriesId || prev.testSeries || ""),
          testTitle: String(testId || prev.testTitle || ""),
        }));
      }
      lastViewedIds.current = { seriesId: String(seriesId || ""), testId: String(testId || "") };
    }
  }, [viewingTestSeries, viewingQuestionEditor]);

  useEffect(() => {
    const fetchQs = async () => {
      const editorId =
        viewingQuestionEditor?.id || (viewingQuestionEditor as any)?._id;
      if (viewingQuestionEditor && editorId) {
        try {
          const qs = await testsAPI.getQuestions(editorId);
          setEditorQuestions(Array.isArray(qs) ? qs : []);
        } catch (err) {
          setEditorQuestions([]);
        }
      }
    };
    fetchQs();
  }, [viewingQuestionEditor]);

  useEffect(() => {
    if (viewingAddQuestionForm) {
      if (
        typeof viewingAddQuestionForm === "object" &&
        viewingAddQuestionForm !== null
      ) {
        setQuestionFormData({ ...viewingAddQuestionForm });
      } else {
        setQuestionFormData({
          id: null,
          textEn: "",
          textHi: "",
          optionsContent: [
            { id: "a", label: "" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
            { id: "d", label: "D" },
          ],
          correctOption: "c",
          solutionEn: "",
          positiveMarks: "1.00",
          negativeMarks: "0.00",
          type: "Multiple Choice Question",
          section: viewingQuestionEditor?.name || "Default",
        });
      }
    } else {
      setQuestionFormData(null);
    }
  }, [viewingAddQuestionForm, viewingQuestionEditor]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (showFloatingAddMenu && !target.closest(".add-menu-container")) {
        setShowFloatingAddMenu(false);
      }

      if (showFloatingMoreMenu && !target.closest(".more-menu-container")) {
        setShowFloatingMoreMenu(false);
      }

      if (
        activeActionMenuId !== null &&
        !target.closest(".action-menu-container")
      ) {
        setActiveActionMenuId(null);
      }

      if (
        activeMenu !== null &&
        !target.closest(".action-menu-container")
      ) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showFloatingAddMenu, showFloatingMoreMenu, activeActionMenuId, activeMenu]);
};
