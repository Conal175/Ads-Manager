import { test } from "node:test";
import assert from "node:assert/strict";
import { canUseRole, canViewPage } from "../src/lib/auth/policy.ts";

const allowed = ["/assets", "/products", "/creatives", "/launcher", "/actions"];
const restricted = ["/", "/users", "/reports", "/system", "/unknown", "/assets-elsewhere"];
test("operator can access exactly the assigned page sections", () => {
  for (const path of allowed) { assert.equal(canViewPage("operator", path), true); assert.equal(canViewPage("operator", `${path}/child`), true); }
  for (const path of restricted) assert.equal(canViewPage("operator", path), false);
});
test("viewer and unassigned accounts cannot access business pages", () => {
  for (const path of [...allowed, ...restricted]) { assert.equal(canViewPage("viewer", path), false); assert.equal(canViewPage(null, path), false); }
});
test("admin can access all pages and APIs; viewer cannot use protected APIs", () => {
  for (const path of [...allowed, ...restricted]) assert.equal(canViewPage("admin", path), true);
  assert.equal(canUseRole("viewer", "operator"), false);
  assert.equal(canUseRole("viewer", "admin"), false);
  assert.equal(canUseRole("operator", "operator"), true);
  assert.equal(canUseRole("operator", "admin"), false);
  assert.equal(canUseRole("admin", "operator"), true);
  assert.equal(canUseRole(null, "operator"), false);
});
