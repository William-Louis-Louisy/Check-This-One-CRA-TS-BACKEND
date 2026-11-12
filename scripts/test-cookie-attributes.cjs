// Checks secure deployment cookie flags without opening a network server.
// The migration CI job has already built the backend to compiled JS.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const code = `
const assert = require("node:assert/strict");
const session = require("./build/src/middlewares/session.js");
const expectedSecure = process.env.NODE_ENV === "staging";
const expectedName = expectedSecure ? "__Host-cto_session" : "cto_session";
assert.equal(session.SESSION_COOKIE_NAME, expectedName);

let result;
const response = {
  cookie(name, value, options) { result = { name, value, options }; },
  clearCookie(name, options) { result = { name, options }; }
};
session.setSessionCookie(response, "opaque-test-cookie");
assert.equal(result.name, expectedName);
assert.equal(result.options.httpOnly, true);
assert.equal(result.options.sameSite, "lax");
assert.equal(result.options.path, "/");
assert.equal(result.options.secure, expectedSecure);
assert.equal(result.options.domain, undefined);
assert.equal(result.options.maxAge, 259200000);

session.clearSessionCookie(response);
assert.equal(result.name, expectedName);
assert.equal(result.options.path, "/");
assert.equal(result.options.secure, expectedSecure);
assert.equal(result.options.domain, undefined);

console.log("Session cookie attributes validated in " + process.env.NODE_ENV);
`;

for (const mode of ["staging", "test"]) {
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: mode },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  process.stdout.write(result.stdout);
}
