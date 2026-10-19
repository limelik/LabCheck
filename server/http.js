export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function idParam(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new ApiError(400, 'INVALID_ID', 'A positive integer ID is required.');
  }
  return number;
}

export function midtermParam(value) {
  const number = Number(value);
  if (number !== 1 && number !== 2) {
    throw new ApiError(400, 'INVALID_MIDTERM', 'Midterm must be 1 or 2.');
  }
  return number;
}

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', result.error.issues.map((issue) =>
      `${issue.path.join('.') || 'request'}: ${issue.message}`).join('; '));
  }
  return result.data;
}

export function requireRecord(record, message = 'Record not found.') {
  if (!record) throw new ApiError(404, 'NOT_FOUND', message);
  return record;
}

export function errorHandler(error, _req, res, next) {
  void next;
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large.' } });
  }
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'This record already exists.' } });
  }
  if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: { code: 'IN_USE', message: 'This record is still in use.' } });
  }
  if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: { code: 'INVALID_REFERENCE', message: 'A related record does not exist.' } });
  }
  if (error?.code === 'ER_DATA_TOO_LONG' || error?.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
    return res.status(400).json({ error: { code: 'INVALID_VALUE', message: 'A value is too long or has the wrong format.' } });
  }
  if (error?.code === 'ER_LOCK_DEADLOCK' || error?.code === 'ER_LOCK_WAIT_TIMEOUT') {
    return res.status(409).json({ error: { code: 'CONCURRENT_CHANGE', message: 'Another change is in progress. Please retry.' } });
  }
  if (error?.sqlState === '45000' || error?.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(409).json({ error: { code: 'BUSINESS_RULE', message: error.sqlMessage || 'Operation conflicts with a database rule.' } });
  }
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR', 'ER_BAD_DB_ERROR',
    'ER_NO_SUCH_TABLE'].includes(error?.code)) {
    console.error(error);
    return res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable or incomplete.' } });
  }
  console.error(error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } });
}
