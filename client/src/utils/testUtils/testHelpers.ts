/**
 * Formats seconds into a human-readable string (e.g., "1h 20m" or "45m 10s")
 */
export const formatTime = (seconds: number) => {
  if (!seconds) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${seconds % 60}s`;
};

/**
 * Resolves the course or test series name for a given test
 */
export const getCourseName = (test: any, courses: any[] = [], tests: any[] = []) => {
  if (test.courseName) return test.courseName;
  if (test.courseId) {
    const course = courses.find(
      (c) => c.id === test.courseId || (c as any)._id === test.courseId,
    );
    if (course) return course.name || course.title;
    const parentSeries = tests.find(
      (t) => t.id === test.courseId || (t as any)._id === test.courseId,
    );
    if (parentSeries) return parentSeries.name || parentSeries.title;
    return test.courseId;
  }
  return test.course || "Unlinked";
};

/**
 * Pure comparator for sorting tests by sortBy field
 */
export const testSortComparator = (a: any, b: any) => {
  const sortA = parseFloat(String(a.sortBy || "0")) || 0;
  const sortB = parseFloat(String(b.sortBy || "0")) || 0;
  return sortB - sortA;
};
