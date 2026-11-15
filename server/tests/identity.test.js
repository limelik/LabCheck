import test from "node:test";
import assert from "node:assert/strict";
import { extractGroup, universityEmail } from "../services/identity.js";
import { placeStudents } from "../services/placement.js";
for (const [email, expected] of Object.entries({
  "lianamelikyan.tt319@polytechnic.am": "TT319",
  "name.TT319@polytechnic.am": "TT319",
  "name.tt320-2@polytechnic.am": "TT320",
  "name.ab123@polytechnic.am": "AB123",
  "example.xy456-1@polytechnic.am": "XY456",
  " NAME.XY456-1@POLYTECHNIC.AM ": "XY456",
}))
  test(`detect ${email}`, () =>
    assert.equal(extractGroup(universityEmail.parse(email)), expected));
test("invalid addresses, wrong domain, missing groups and unrestricted hyphen suffixes", () => {
  for (const email of [
    "invalid",
    "name.tt319@evil.am",
    "name.tt319@polytechnic.am.evil",
  ])
    assert.equal(universityEmail.safeParse(email).success, false);
  for (const email of [
    "name@polytechnic.am",
    "name.-2@polytechnic.am",
    "name..@polytechnic.am",
  ])
    assert.equal(extractGroup(email), null);
  for (const email of [
    "name.tt319-@polytechnic.am",
    "name.tt319-2-3@polytechnic.am",
    "name.tt319-transfer@polytechnic.am",
  ])
    assert.equal(extractGroup(universityEmail.parse(email)), "TT319");
  // Recognition is a separate database lookup; extraction does not invent code restrictions.
  assert.equal(
    extractGroup(universityEmail.parse("name.tt@polytechnic.am")),
    "TT",
  );
});
test("cohort allocation is deterministic, bounded, and independent of input order", () => {
  const students = Array.from({ length: 33 }, (_, i) => ({
    id: i + 1,
    firstName: "Student",
    lastName: String(i).padStart(3, "0"),
  }));
  const labs = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const placed = placeStudents(students, labs);
  assert.deepEqual(placeStudents([...students].reverse(), labs), placed);
  for (const lab of labs)
    assert.equal(placed.filter((p) => p.labGroupId === lab.id).length, 11);
  assert.equal(placeStudents(students, labs.slice(0, 2)).length, 33);
  assert.throws(() => placeStudents(students, labs.slice(0, 1)), /cannot hold/);
});

import { assertRemovalAllowed } from "../services/account-policy.js";
test("account removal protects current and last active administrators without blocking inactive profiles", () => {
  const last = {
    id: 2,
    role: "ADMIN",
    status: "APPROVED",
    isActive: 1,
    adminLevel: "SUPER_ADMIN",
  };
  assert.throws(
    () =>
      assertRemovalAllowed(2, last, [{ id: 2, admin_level: "SUPER_ADMIN" }]),
    (e) => e.code === "SELF_PROTECTED",
  );
  assert.throws(
    () =>
      assertRemovalAllowed(1, last, [{ id: 2, admin_level: "SUPER_ADMIN" }]),
    (e) => e.code === "LAST_ADMIN",
  );
  assert.throws(
    () =>
      assertRemovalAllowed(1, last, [
        { id: 2, admin_level: "SUPER_ADMIN" },
        { id: 3, admin_level: "ACADEMIC_UNIT_ADMIN" },
      ]),
    (e) => e.code === "LAST_ADMIN",
  );
  assert.doesNotThrow(() =>
    assertRemovalAllowed(1, { ...last, isActive: 0 }, [
      { id: 1, admin_level: "SUPER_ADMIN" },
    ]),
  );
  assert.doesNotThrow(() =>
    assertRemovalAllowed(1, last, [
      { id: 1, admin_level: "SUPER_ADMIN" },
      { id: 2, admin_level: "SUPER_ADMIN" },
    ]),
  );
});
