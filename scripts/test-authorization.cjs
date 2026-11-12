// Dependency-free policy smoke tests, compatible with the repository's Node 16 runtime.
// Transpile the actual TypeScript policy source using the installed TypeScript compiler.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("src/middlewares/authorization.policy.ts", "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const moduleObject = { exports: {} };
vm.runInNewContext(output, {
  exports: moduleObject.exports,
  module: moduleObject,
});
const { isAdmin, mayManageUser, mayManageList, mayReadList } = moduleObject.exports;

const alice = { userId: 10, role: "user" };
const bob = { userId: 11, role: "user" };
const admin = { userId: 1, role: "admin" };

assert.equal(isAdmin(alice), false);
assert.equal(isAdmin(admin), true);
assert.equal(mayManageUser(alice, 10), true);
assert.equal(mayManageUser(alice, 11), false);
assert.equal(mayManageUser(admin, 10), true);
assert.equal(mayManageList(alice, 10), true);
assert.equal(mayManageList(alice, 11), false);
assert.equal(mayManageList(admin, 11), true);
assert.equal(mayReadList(undefined, 10, "public"), true);
assert.equal(mayReadList(undefined, 10, "private"), false);
assert.equal(mayReadList(bob, 10, "private"), false);
assert.equal(mayReadList(alice, 10, "private"), true);
assert.equal(mayReadList(admin, 10, "private"), true);
console.log("CTO-01 authorization policies: OK");
