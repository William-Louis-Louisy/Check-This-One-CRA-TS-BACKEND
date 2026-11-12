// CTO-01 integration checks against disposable CI MySQL and a local API.
// These tests never call a production URL or reuse production credentials.
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");

const BASE = "http://127.0.0.1:5000";

async function request(method, path, token, body) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => undefined);
  return { status: response.status, data };
}

const password = "SecuredPwd123!";
async function register(name, email, extra = {}) {
  const response = await request("POST", "/register", undefined, {
    user_name: name,
    email,
    password,
    ...extra,
  });
  assert.equal(response.status, 200, JSON.stringify(response));
  assert.equal(typeof response.data.token, "string");
  assert.equal(response.data.user.role, "user");
  assert.equal(response.data.user.password, undefined);
  return { token: response.data.token, id: response.data.user.id };
}

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Browser preflight: exact preview origin allowed, arbitrary origins denied.
    const preflightHeaders = {
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    };
    const trusted = await fetch(BASE + "/users/getAll", {
      method: "OPTIONS",
      headers: { ...preflightHeaders, Origin: "https://cto01-preview.example.test" },
    });
    assert.equal(trusted.status, 204);
    assert.equal(trusted.headers.get("access-control-allow-origin"), "https://cto01-preview.example.test");
    assert.equal(trusted.headers.get("access-control-allow-credentials"), "true");

    const blocked = await fetch(BASE + "/users/getAll", {
      method: "OPTIONS",
      headers: { ...preflightHeaders, Origin: "https://untrusted.example.test" },
    });
    assert.equal(blocked.headers.get("access-control-allow-origin"), null);

    assert.equal((await request("GET", "/users/getAll")).status, 401);
    assert.equal((await request("POST", "/badge", undefined, {})).status, 401);

    const alice = await register("test_alice", "alice@example.test", { role: "admin" });
    const bob = await register("test_bobby", "bob@example.test");

    assert.equal((await request("GET", "/users/getAll", alice.token)).status, 403);
    assert.equal((await request("PUT", `/update/${bob.id}`, alice.token, {})).status, 403);
    assert.equal((await request("PUT", `/update/${alice.id}`, undefined, {})).status, 401);
    assert.equal((await request("PUT", `/content/42/seen/${alice.id}`, bob.token)).status, 403);
    assert.equal((await request("GET", `/user/${alice.id}/notifications/unseen`, bob.token)).status, 403);

    // Seed a private list directly, independent of the badge creation workflow.
    const [list] = await db.execute(
      "INSERT INTO `list` (title, description, creation_date, creator_id, likes, privacy) VALUES (?, ?, NOW(), ?, 0, 'private')",
      ["Owner-only collection", "A private collection", alice.id]
    );
    const listId = list.insertId;
    assert.equal((await request("GET", `/list/getById/${listId}/user/0`)).status, 404);
    assert.equal((await request("GET", `/list/getById/${listId}/user/${alice.id}`, bob.token)).status, 404);
    assert.equal((await request("PUT", `/list/update/${listId}`, bob.token, {})).status, 403);
    assert.equal((await request("DELETE", `/list/${listId}`, bob.token)).status, 403);
    assert.equal((await request("PUT", `/${listId}/content`, bob.token, {})).status, 403);
    assert.equal((await request("PUT", `/list/${listId}/like/${alice.id}`, bob.token)).status, 403);

    // Roles are resolved from MySQL, never from a forged JWT claim or register body.
    await db.execute("UPDATE `user` SET role = 'admin' WHERE id = ?", [alice.id]);
    assert.equal((await request("GET", "/users/getAll", alice.token)).status, 200);
    assert.equal((await request("GET", `/list/getById/${listId}/user/0`, alice.token)).status, 200);
    const badgeResult = await request("POST", "/badge", alice.token, {
      name: "CI badge",
      name_en: "CI badge",
      description: "Integration test",
      description_en: "Integration test",
      icon: "shield",
    });
    assert.equal(badgeResult.status, 200, JSON.stringify(badgeResult));
    console.log("CTO-01 HTTP integration checks: OK");
  } finally {
    await db.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
