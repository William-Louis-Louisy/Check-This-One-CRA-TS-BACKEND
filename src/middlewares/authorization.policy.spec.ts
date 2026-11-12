import { describe, expect, it } from "vitest";
import { isAdmin, mayManageList, mayManageUser, mayReadList } from "./authorization.policy";

const alice = { userId: 10, role: "user" as const };
const admin = { userId: 1, role: "admin" as const };

describe("CTO-01 authorization policies", () => {
  it("allows account and list owners to modify their resources", () => {
    expect(mayManageUser(alice, 10)).toBe(true);
    expect(mayManageList(alice, 10)).toBe(true);
  });

  it("forbids cross-account and cross-list mutations", () => {
    expect(mayManageUser(alice, 11)).toBe(false);
    expect(mayManageList(alice, 11)).toBe(false);
  });

  it("requires the admin role instead of a username", () => {
    expect(isAdmin(alice)).toBe(false);
    expect(isAdmin(admin)).toBe(true);
    expect(mayManageUser(admin, 10)).toBe(true);
  });

  it("allows anonymous public reads but forbids reading private lists", () => {
    expect(mayReadList(undefined, 10, "public")).toBe(true);
    expect(mayReadList(undefined, 10, "private")).toBe(false);
    expect(mayReadList(alice, 10, "private")).toBe(true);
    expect(mayReadList(alice, 11, "private")).toBe(false);
    expect(mayReadList(admin, 11, "private")).toBe(true);
  });
});
