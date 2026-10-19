import test from 'node:test';
import assert from 'node:assert/strict';
import { neededLabGroups, placeStudents } from '../services/placement.js';
import { ApiError, idParam, midtermParam, validate } from '../http.js';
import { z } from 'zod';

test('placement creates exactly enough groups for capacity 16', () => {
  assert.equal(neededLabGroups(0), 0);
  assert.equal(neededLabGroups(16), 1);
  assert.equal(neededLabGroups(17), 2);
  assert.equal(neededLabGroups(33), 3);
});

test('placement sorts by surname and distributes round robin', () => {
  const students = [
    { id: 1, firstName: 'A', lastName: 'Z' },
    { id: 2, firstName: 'B', lastName: 'B' },
    { id: 3, firstName: 'A', lastName: 'B' },
    { id: 4, firstName: 'C', lastName: 'C' },
  ];
  const rows = placeStudents(students, [{ id: 10 }, { id: 11 }]);
  assert.deepEqual(rows, [
    { studentId: 3, labGroupId: 10 },
    { studentId: 2, labGroupId: 11 },
    { studentId: 4, labGroupId: 10 },
    { studentId: 1, labGroupId: 11 },
  ]);
  assert.deepEqual(students.map((row) => row.id), [1, 2, 3, 4]);
});

test('placement cannot proceed with students but no lab group', () => {
  assert.throws(() => placeStudents([{ id: 1, firstName: 'A', lastName: 'B' }], []), ApiError);
});

test('request validation rejects invalid identifiers and unexpected fields', () => {
  assert.equal(idParam('12'), 12);
  assert.equal(midtermParam('2'), 2);
  assert.throws(() => idParam('0'), ApiError);
  assert.throws(() => midtermParam('3'), ApiError);
  assert.throws(() => validate(z.strictObject({ value: z.number() }), { value: 1, extra: true }), ApiError);
});
