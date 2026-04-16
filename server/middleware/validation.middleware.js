/**
 * Validation Middleware - Phase 17
 * All validators are Express middleware (req, res, next).
 * On failure: 400 with a structured error. On pass: next().
 */

/**
 * Validates the testId URL param.
 * Accepts string IDs and numeric IDs.
 */
export const validateTestId = (req, res, next) => {
  const { testId, id } = req.params;
  const tid = testId || id;
  if (!tid || typeof tid !== 'string' || tid.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Invalid testId: must be a non-empty string.'
    });
  }
  next();
};

/**
 * Validates the studentId URL param or body field.
 */
export const validateStudentId = (req, res, next) => {
  const sid = req.params.id || req.body?.studentId;
  if (!sid || typeof sid !== 'string' || sid.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Invalid studentId: must be a non-empty string.'
    });
  }
  next();
};

/**
 * Validates the full submit payload.
 * Rules:
 *  - answers must be a plain object
 *  - answers must have at least one key
 *  - no key may be null, undefined, or empty string
 *  - studentId must be a non-empty string
 */
export const validateSubmitPayload = (req, res, next) => {
  const { studentId, answers } = req.body;

  if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: studentId is required and must be a non-empty string.'
    });
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: answers must be a plain object mapping questionId to selected option.'
    });
  }

  const keys = Object.keys(answers);
  if (keys.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: answers object is empty. At least one answer (even null) must be provided.'
    });
  }

  const invalidKey = keys.find(k => !k || typeof k !== 'string' || k.trim() === '');
  if (invalidKey !== undefined) {
    return res.status(400).json({
      success: false,
      message: `Validation failed: answers object contains an invalid key: "${invalidKey}". All keys must be non-empty strings.`
    });
  }

  next();
};
