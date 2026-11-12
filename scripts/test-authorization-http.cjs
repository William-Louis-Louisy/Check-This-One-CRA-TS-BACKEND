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

function assertPublicResponse(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertPublicResponse(entry, path + "[" + index + "]"));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, entry] of Object.entries(value)) {
    assert.ok(
      !["password", "reset_password_token", "reset_password_expires", "seen_by"].includes(key),
      "Sensitive field leaked at " + path + "." + key
    );
    assertPublicResponse(entry, path + "." + key);
  }
}

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

    // Credentials must be absent even from deeply nested ORM relations.
    const publicAlice = await request("GET", `/user/${alice.id}`);
    assert.equal(publicAlice.status, 200);
    assertPublicResponse(publicAlice.data);
    assert.equal(publicAlice.data.user.email, undefined);
    assert.equal(publicAlice.data.user.role, undefined);
    assert.equal(publicAlice.data.user.seenContent, undefined);
    assert.equal(publicAlice.data.user.seenContentCount, undefined);

    const ownAlice = await request("GET", `/user/${alice.id}`, alice.token);
    assert.equal(ownAlice.status, 200);
    assertPublicResponse(ownAlice.data);
    assert.equal(ownAlice.data.user.email, "alice@example.test");
    assert.equal(ownAlice.data.user.role, "user");


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
    assert.equal((await request("PUT", `/list/${listId}/like/${bob.id}`, bob.token)).status, 404);

    assert.equal((await request("GET", `/list/${listId}/likes`)).status, 404);
    assert.equal((await request("GET", `/list/${listId}/likes`, bob.token)).status, 404);
    assert.equal((await request("GET", `/list/${listId}/likes`, alice.token)).status, 200);

    await db.execute("UPDATE `list` SET likes = 11 WHERE id = ?", [listId]);
    const publicStats = await request("GET", `/user/${alice.id}/stats`);
    const ownerStats = await request("GET", `/user/${alice.id}/stats`, alice.token);
    assert.equal(publicStats.status, 200);
    assert.equal(ownerStats.status, 200);
    assert.equal(publicStats.data.listCount, 0);
    assert.equal(ownerStats.data.listCount, 1);
    assert.equal(publicStats.data.likesCount, 0);
    assert.equal(ownerStats.data.likesCount, 11);

    const publicLikes = await request("GET", "/lists/getTotalLikes");
    assert.equal(publicLikes.status, 200);
    assert.equal(Number(publicLikes.data.total_likes || 0), 0);

    // Roles are resolved from MySQL, never from a forged JWT claim or register body.
    await db.execute("UPDATE `user` SET role = 'admin' WHERE id = ?", [alice.id]);
    const adminUsers = await request("GET", "/users/getAll", alice.token);
    assert.equal(adminUsers.status, 200);
    assertPublicResponse(adminUsers.data);
    assert.ok(Array.isArray(adminUsers.data.users[0].lists), "Admin list counts remain compatible.");
    assert.ok(Array.isArray(adminUsers.data.users[0].liked_lists), "Admin liked-list counts remain compatible.");
    assert.equal(adminUsers.data.users.find((user) => user.id === bob.id).email, "bob@example.test");

    const publicLists = await request("GET", "/lists/getAllPublic");
    assert.equal(publicLists.status, 200);
    assertPublicResponse(publicLists.data);

    const allLists = await request("GET", "/lists/getAll", alice.token);
    assert.equal(allLists.status, 200);
    assertPublicResponse(allLists.data);

    const byUser = await request("GET", `/lists/getByUserId/${alice.id}`, bob.token);
    assert.equal(byUser.status, 200);
    assertPublicResponse(byUser.data);
    assert.equal(byUser.data.results.some((list) => list.id === listId), false);

    const ownerList = await request("GET", `/list/getById/${listId}/user/${alice.id}`, alice.token);
    assert.equal(ownerList.status, 200);
    assertPublicResponse(ownerList.data);

    const notified = await request("GET", `/user/${alice.id}/notifications/unseen`, alice.token);
    assert.equal(notified.status, 200);
    assertPublicResponse(notified.data);
    assert.equal((await request("GET", `/list/getById/${listId}/user/0`, alice.token)).status, 200);
    assert.equal((await request("GET", `/list/${listId}/likes`, alice.token)).status, 200);
    const adminLikes = await request("GET", "/lists/getTotalLikes", alice.token);
    assert.equal(adminLikes.status, 200);
    assert.equal(Number(adminLikes.data.total_likes), 11);
    const adminStats = await request("GET", `/user/${alice.id}/stats`, alice.token);
    assert.equal(adminStats.status, 200);
    assert.equal(adminStats.data.listCount, 1);
    const badgeResult = await request("POST", "/badge", alice.token, {
      name: "CI badge",
      name_en: "CI badge",
      description: "Integration test",
      description_en: "Integration test",
      icon: "shield",
    });
    assert.equal(badgeResult.status, 200, JSON.stringify(badgeResult));
    // Password-reset token and expiry are select:false, but the reset flow
    // must explicitly read them. A regular public API may never reveal them.
    const resetToken = "fixture_reset_token_bob";
    await db.execute(
      "UPDATE `user` SET reset_password_token = ?, reset_password_expires = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?",
      [resetToken, bob.id]
    );
    assert.equal((await request("POST", "/reset-password/confirm", undefined, {
      token: resetToken, password: "UpdatedPassword123!"
    })).status, 400);
    await db.execute(
      "UPDATE `user` SET reset_password_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?",
      [bob.id]
    );
    assert.equal((await request("POST", "/reset-password/confirm", undefined, {
      token: resetToken, password: "UpdatedPassword123!"
    })).status, 200);
    assert.equal((await request("POST", "/login", undefined, {
      email: "bob@example.test", password: "UpdatedPassword123!"
    })).status, 200);
    const [resetRows] = await db.execute(
      "SELECT reset_password_token, reset_password_expires FROM `user` WHERE id = ?",
      [bob.id]
    );
    assert.equal(resetRows[0].reset_password_token, null);
    assert.equal(resetRows[0].reset_password_expires, null);

    console.log("CTO-01/02 HTTP authorization and sensitive-field checks: OK");
  } finally {
    await db.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
