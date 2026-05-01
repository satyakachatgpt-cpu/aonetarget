import { useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DetailSubTab } from "../testConstants";

export const useTestsViewManager = () => {
  const { "*": routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Main Tab State
  const [activeTab, setActiveTab] = useState("Tests");

  // 2. Test Series View State (with localStorage restoration)
  const [viewingTestSeries, setViewingTestSeriesState] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("viewingTestSeries");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setViewingTestSeries = useCallback((val: any) => {
    if (val) localStorage.setItem("viewingTestSeries", JSON.stringify(val));
    else localStorage.removeItem("viewingTestSeries");
    setViewingTestSeriesState(val);
  }, []);

  // 3. Test Series Sub-tab State
  const [viewingTestSeriesTab, setViewingTestSeriesTabState] = useState<DetailSubTab>(() => {
    return (localStorage.getItem("viewingTestSeriesTab") as any) || "Tests";
  });

  const setViewingTestSeriesTab = useCallback((val: DetailSubTab) => {
    localStorage.setItem("viewingTestSeriesTab", val);
    setViewingTestSeriesTabState(val);
  }, []);

  // 4. Question Editor View State
  const [viewingQuestionEditor, setViewingQuestionEditorState] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("viewingQuestionEditor");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setViewingQuestionEditor = useCallback((val: any) => {
    if (val) localStorage.setItem("viewingQuestionEditor", JSON.stringify(val));
    else localStorage.removeItem("viewingQuestionEditor");
    setViewingQuestionEditorState(val);
  }, []);

  // 5. Navigation Sync Handler
  const handleSetViewingTestSeries = useCallback((val: any) => {
    try {
      if (val) {
        const id = typeof val === "object" ? val.id || val._id : val;
        if (id && location.pathname !== `/admin/tests/${id}`) {
          navigate(`/admin/tests/${id}`);
        }
        if (typeof val === "object") {
          localStorage.setItem("viewingTestSeries", JSON.stringify(val));
        }
      } else {
        if (location.pathname !== "/admin/tests") {
          navigate("/admin/tests");
        }
        localStorage.removeItem("viewingTestSeries");
      }
    } catch (error) {
      console.error("Error in handleSetViewingTestSeries:", error);
    }
  }, [location.pathname, navigate]);

  return {
    routeId,
    activeTab,
    setActiveTab,
    viewingTestSeries,
    setViewingTestSeries,
    viewingTestSeriesTab,
    setViewingTestSeriesTab,
    viewingQuestionEditor,
    setViewingQuestionEditor,
    handleSetViewingTestSeries,
    navigate,
    location
  };
};
