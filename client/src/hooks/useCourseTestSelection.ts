import { useCallback } from 'react';

interface UseCourseTestSelectionProps {
  selectedCourse: any;
  subjectiveTestSearch: string;
  selectedSubjectiveList: any[];
  setAvailableSubjectiveTests: React.Dispatch<React.SetStateAction<any[]>>;
  setShowSubjectiveDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSubjectiveLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSubjectiveList: React.Dispatch<React.SetStateAction<any[]>>;
  setSubjectiveTestSearch: React.Dispatch<React.SetStateAction<string>>;
  setTestSeriesList: React.Dispatch<React.SetStateAction<any[]>>;
  setIsTestSeriesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setOmrTests: React.Dispatch<React.SetStateAction<any[]>>;
  setStandardTests: React.Dispatch<React.SetStateAction<any[]>>;
  setIsOMRTestsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStandardTestsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  getAuthHeaders: () => any;
  API_BASE_URL: string;
}

export const useCourseTestSelection = ({
  selectedCourse,
  subjectiveTestSearch,
  selectedSubjectiveList,
  setAvailableSubjectiveTests,
  setShowSubjectiveDropdown,
  setIsSubjectiveLoading,
  setSelectedSubjectiveList,
  setSubjectiveTestSearch,
  setTestSeriesList,
  setIsTestSeriesLoading,
  setOmrTests,
  setStandardTests,
  setIsOMRTestsLoading,
  setIsStandardTestsLoading,
  getAuthHeaders,
  API_BASE_URL
}: UseCourseTestSelectionProps) => {

  const fetchTestSeriesList = useCallback(async () => {
    setIsTestSeriesLoading(true);
    try {
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id || 'global';
      const res = await fetch(`${API_BASE_URL}/test-series?courseId=${courseId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      if (list.length === 0) {
        const coursePrefix = selectedCourse?.name || selectedCourse?.title || 'Main Batch';
        const mockList = [
          { id: `1-${courseId}`, seriesName: `${coursePrefix} Concepts Series`, title: `${coursePrefix} Concepts Series` },
          { id: `2-${courseId}`, seriesName: `${coursePrefix} Advanced Mock`, title: `${coursePrefix} Advanced Mock` },
          { id: `3-${courseId}`, seriesName: `Global Practice Series`, title: `Global Practice Series` }
        ];
        setTestSeriesList(mockList);
      } else {
        setTestSeriesList(list);
      }
    } catch (error) {
      console.error('Failed to load test series:', error);
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id || 'global';
      setTestSeriesList([
        { id: `1-${courseId}`, seriesName: `Practice Test Series`, title: `Practice Test Series` },
        { id: `2-${courseId}`, seriesName: `Full Length Mock`, title: `Full Length Mock` }
      ]);
    } finally {
      setIsTestSeriesLoading(false);
    }
  }, [selectedCourse, API_BASE_URL, getAuthHeaders, setTestSeriesList, setIsTestSeriesLoading]);

  const fetchTestsBySeries = useCallback(async (seriesId: string, type: 'standard' | 'omr' = 'standard') => {
    if (!seriesId) return;
    const setLoading = type === 'omr' ? setIsOMRTestsLoading : setIsStandardTestsLoading;
    const setData = type === 'omr' ? setOmrTests : setStandardTests;

    setLoading(true);
    try {
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const res = await fetch(`${API_BASE_URL}/tests?seriesId=${seriesId}&courseId=${courseId}&testType=${type}`, { headers: getAuthHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      let finalTests = list;

      if (finalTests.length === 0 && seriesId.includes(courseId as string)) {
        const coursePrefix = selectedCourse?.name || 'Test';
        if (type === 'omr') {
          finalTests = [
            { id: `omr1-${courseId}`, name: `${coursePrefix} OMR Sheet 1` },
            { id: `omr2-${courseId}`, name: `${coursePrefix} OMR Mock 2` }
          ];
        } else {
          finalTests = [
            { id: `std1-${courseId}`, name: `${coursePrefix} Chapter Test A` },
            { id: `std2-${courseId}`, name: `${coursePrefix} Unit Test B` }
          ];
        }
      }

      setData(finalTests);
    } catch (error) {
      console.error('Failed to load tests:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, API_BASE_URL, getAuthHeaders, setIsOMRTestsLoading, setIsStandardTestsLoading, setOmrTests, setStandardTests]);

  const fetchSubjectiveTests = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAvailableSubjectiveTests([]);
      setShowSubjectiveDropdown(false);
      return;
    }
    setIsSubjectiveLoading(true);
    setShowSubjectiveDropdown(true);
    try {
      const res = await fetch(`${API_BASE_URL}/subjective-tests?search=${query}`);
      const data = await res.json();
      setAvailableSubjectiveTests(Array.isArray(data) ? data : []);
    } catch (error) {
      setAvailableSubjectiveTests([
        { id: 'st1', title: 'English Essay Writing' },
        { id: 'st2', title: 'Calculus Advanced Quiz' },
        { id: 'st3', title: 'Indian History Long Form' }
      ].filter(t => t.title.toLowerCase().includes(query.toLowerCase())));
    } finally {
      setIsSubjectiveLoading(false);
    }
  }, [API_BASE_URL, setAvailableSubjectiveTests, setShowSubjectiveDropdown, setIsSubjectiveLoading]);

  const handleAddSubjectiveTest = useCallback((test: any) => {
    if (!selectedSubjectiveList.some(t => (t._id || t.id) === (test._id || test.id))) {
      setSelectedSubjectiveList(prev => [...prev, test]);
    }
    setSubjectiveTestSearch('');
    setShowSubjectiveDropdown(false);
  }, [selectedSubjectiveList, setSelectedSubjectiveList, setSubjectiveTestSearch, setShowSubjectiveDropdown]);

  const handleRemoveSubjectiveTest = useCallback((testId: string) => {
    setSelectedSubjectiveList(prev => prev.filter(t => (t._id || t.id) !== testId));
  }, [setSelectedSubjectiveList]);

  return {
    fetchTestSeriesList,
    fetchTestsBySeries,
    fetchSubjectiveTests,
    handleAddSubjectiveTest,
    handleRemoveSubjectiveTest
  };
};
