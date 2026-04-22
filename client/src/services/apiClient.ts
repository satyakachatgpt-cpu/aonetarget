/**
 * Backward Compatibility Layer
 * Re-exports all functionality from specialized service modules
 * Do NOT add new logic here; add it to the respective service file.
 */

export * from './baseService';
export * from './authService';
export * from './systemService';
export * from './academicService';
export * from './communicationService';
export * from './paymentService';
export * from './studentService';
export * from './adminService';
export * from './courseService';
export { questionsAPI, testsAPI, testSeriesAPI, subjectiveTestsAPI, reportedQuestionsAPI, resultsAPI } from './testService';

