import test from 'node:test';
import assert from 'node:assert/strict';
import { requireSafeForeignKeys } from '../services/database-integrity.js';

test('unsafe FK implementations/check settings fail closed without changing database settings', () => {
  const safe = { globalChecks: 1, sessionChecks: 1, nativeForeignKeys: true };
  for (const change of [
    { globalChecks: 0 },
    { sessionChecks: 0 },
    { nativeForeignKeys: false },
  ])
    assert.throws(
      () => requireSafeForeignKeys({ ...safe, ...change }),
      (error) => error.code === 'UNSAFE_DATABASE_CONFIGURATION',
    );
  assert.doesNotThrow(() => requireSafeForeignKeys(safe));
  assert.doesNotThrow(() =>
    requireSafeForeignKeys({ ...safe, nativeForeignKeys: null }),
  );
});
