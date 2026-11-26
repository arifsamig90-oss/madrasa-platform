import { describe, expect, it } from "vitest";
import { audienceAllows, canEditGroup, canInvite, canViewStudent, resultSummary } from "./rules";

describe("audienceAllows", () => {
  it("keeps brothers and sisters groups separate", () => {
    expect(audienceAllows("MALE", "MALE")).toBe(true);
    expect(audienceAllows("MALE", "FEMALE")).toBe(false);
    expect(audienceAllows("FEMALE", "MALE")).toBe(false);
    expect(audienceAllows("MIXED", "FEMALE")).toBe(true);
  });
});

describe("resultSummary", () => {
  it("counts only marked lessons", () => {
    expect(resultSummary(["PASSED", "FAILED", null, "PASSED", undefined])).toEqual({ passed: 2, total: 3 });
  });
});

describe("canViewStudent", () => {
  const ctx = { parentIds: ["p1"], teacherIds: ["t1"] };
  it("allows self, own parent, own teacher, admin", () => {
    expect(canViewStudent({ id: "s1", roles: ["STUDENT"] }, "s1", ctx)).toBe(true);
    expect(canViewStudent({ id: "p1", roles: ["PARENT"] }, "s1", ctx)).toBe(true);
    expect(canViewStudent({ id: "t1", roles: ["TEACHER"] }, "s1", ctx)).toBe(true);
    expect(canViewStudent({ id: "a", roles: ["ADMIN"] }, "s1", ctx)).toBe(true);
  });
  it("denies other parents, teachers and students", () => {
    expect(canViewStudent({ id: "p2", roles: ["PARENT"] }, "s1", ctx)).toBe(false);
    expect(canViewStudent({ id: "t2", roles: ["TEACHER"] }, "s1", ctx)).toBe(false);
    expect(canViewStudent({ id: "s2", roles: ["STUDENT"] }, "s1", ctx)).toBe(false);
    // being listed as a parent without the PARENT role is not enough
    expect(canViewStudent({ id: "p1", roles: ["STUDENT"] }, "s1", ctx)).toBe(false);
  });
});

describe("canEditGroup", () => {
  it("only the group's teacher or an admin", () => {
    expect(canEditGroup({ id: "t1", roles: ["TEACHER"] }, "t1")).toBe(true);
    expect(canEditGroup({ id: "t2", roles: ["TEACHER"] }, "t1")).toBe(false);
    expect(canEditGroup({ id: "a", roles: ["ADMIN"] }, null)).toBe(true);
    expect(canEditGroup({ id: "t1", roles: ["TEACHER"] }, null)).toBe(false);
  });
});

describe("canInvite", () => {
  it("teachers invite students and parents, admins anyone", () => {
    expect(canInvite({ id: "t", roles: ["TEACHER"] }, "STUDENT")).toBe(true);
    expect(canInvite({ id: "t", roles: ["TEACHER"] }, "ADMIN")).toBe(false);
    expect(canInvite({ id: "a", roles: ["ADMIN"] }, "ACCOUNTANT")).toBe(true);
    expect(canInvite({ id: "s", roles: ["STUDENT"] }, "STUDENT")).toBe(false);
  });
});
