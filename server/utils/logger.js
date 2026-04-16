/**
 * Server-side logger for grading and result operations - Phase 17
 * All log functions are fire-and-forget (non-blocking).
 * Failures are swallowed silently to never block the request flow.
 */

const LOG_PREFIX = '[AOneTarget]';

/**
 * Internal emit — extend this to write to a file or external sink (e.g. Datadog, Logtail).
 * Currently emits to stdout via console.log.
 */
const emit = (level, payload) => {
  try {
    const line = JSON.stringify({ level, ...payload, ts: new Date().toISOString() });
    if (level === 'error') {
      console.error(`${LOG_PREFIX} ${line}`);
    } else {
      console.log(`${LOG_PREFIX} ${line}`);
    }
  } catch (_) {
    // Never throw from logger
  }
};

/**
 * Log a test submission event.
 * @param {{ studentId, testId, obtainedMarks, totalMarks, percentage, timeTaken }} data
 */
export const logSubmission = (data) => {
  try {
    emit('info', {
      action: 'SUBMIT',
      studentId: data.studentId ?? null,
      testId: data.testId ?? null,
      obtainedMarks: data.obtainedMarks ?? null,
      totalMarks: data.totalMarks ?? null,
      percentage: data.percentage ?? null,
      timeTaken: data.timeTaken ?? null,
    });
  } catch (_) { /* non-blocking */ }
};

/**
 * Log a reevaluation event.
 * @param {{ testId, updatedCount, testName }} data
 */
export const logReevaluation = (data) => {
  try {
    emit('info', {
      action: 'REEVALUATE',
      testId: data.testId ?? null,
      testName: data.testName ?? null,
      updatedCount: data.updatedCount ?? 0,
    });
  } catch (_) { /* non-blocking */ }
};

/**
 * Log a caught error with context.
 * @param {{ action, error, context }} data
 */
export const logError = (data) => {
  try {
    emit('error', {
      action: data.action ?? 'UNKNOWN',
      message: data.error?.message ?? String(data.error) ?? 'Unknown error',
      context: data.context ?? null,
    });
  } catch (_) { /* non-blocking */ }
};
