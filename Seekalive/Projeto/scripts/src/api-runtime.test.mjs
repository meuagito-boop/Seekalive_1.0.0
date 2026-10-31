import assert from "node:assert/strict";
import { once } from "node:events";
import { after, test } from "node:test";

process.env.SESSION_SECRET ??= "test-only-session-secret-at-least-32-bytes";
process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/seekalive_test";

const [{ default: app }, { pool }] = await Promise.all([
  import("../../Aplicativo/back/src/app.ts"),
  import("../../infra/database/src/index.ts"),
]);

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

function assertRequestId(response, body) {
  const requestId = response.headers.get("x-request-id");
  assert.match(requestId ?? "", /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  if (body?.error && typeof body.error === "object" && "requestId" in body.error) {
    assert.equal(body.error.requestId, requestId);
  }
  return requestId;
}

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

test("liveness stays available without depending on database readiness", async () => {
  const response = await fetch(`${baseUrl}/api/healthz`, {
    headers: { "x-request-id": "client-controlled-id" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.notEqual(assertRequestId(response), "client-controlled-id");
});

test("readiness reports database availability without exposing connection details", async () => {
  const response = await fetch(`${baseUrl}/api/readyz`);
  assert.ok(response.status === 200 || response.status === 503);
  const body = await response.json();
  assert.equal(body.status, response.status === 200 ? "ready" : "not_ready");
  assertRequestId(response);
  assert.doesNotMatch(JSON.stringify(body), /postgres|database_url|connection refused|password/i);
});

test("unknown API paths return a JSON 404 with the request ID", async () => {
  const response = await fetch(`${baseUrl}/api/path-that-does-not-exist`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/i);
  const body = await response.json();
  assert.equal(body.error.key, "NOT_FOUND");
  assert.equal(body.error.code, 1003);
  assertRequestId(response, body);
});

test("protected profile routes return a traceable authentication error", async () => {
  const response = await fetch(`${baseUrl}/api/v1/accounts/me`);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error.key, "UNAUTHENTICATED");
  assert.equal(body.error.code, 1101);
  assertRequestId(response, body);
});

test("CSRF rejections use the same traceable error contract", async () => {
  const response = await fetch(`${baseUrl}/api/v1/onboarding/interests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ interests: [] }),
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error.key, "CSRF_REJECTED");
  assert.equal(body.error.code, 1106);
  assertRequestId(response, body);
});

test("Feed comments require a session and all Feed mutations reject missing CSRF", async () => {
  const postId = "00000000-0000-4000-8000-000000000001";
  const commentId = "00000000-0000-4000-8000-000000000002";
  const comments = await fetch(
    `${baseUrl}/api/v1/social/posts/${postId}/comments?limit=20`,
  );
  assert.equal(comments.status, 401);
  const commentsBody = await comments.json();
  assert.equal(commentsBody.error.key, "UNAUTHENTICATED");
  assertRequestId(comments, commentsBody);

  const mutationRequests = [
    {
      method: "POST",
      path: `/api/v1/social/posts/${postId}/comments`,
      body: { text: "teste de segurança" },
    },
    { method: "DELETE", path: `/api/v1/social/comments/${commentId}` },
    { method: "PUT", path: `/api/v1/social/posts/${postId}/like` },
    { method: "DELETE", path: `/api/v1/social/posts/${postId}/like` },
    { method: "POST", path: `/api/v1/social/posts/${postId}/repost` },
    { method: "DELETE", path: `/api/v1/social/posts/${postId}/repost` },
    { method: "PUT", path: `/api/v1/social/comments/${commentId}/like` },
    { method: "DELETE", path: `/api/v1/social/comments/${commentId}/like` },
    { method: "DELETE", path: `/api/v1/social/posts/${postId}` },
  ];

  for (const request of mutationRequests) {
    const response = await fetch(`${baseUrl}${request.path}`, {
      method: request.method,
      headers: request.body ? { "content-type": "application/json" } : {},
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    });
    assert.equal(response.status, 403, `${request.method} ${request.path}`);
    const body = await response.json();
    assert.equal(body.error.key, "CSRF_REJECTED");
    assert.equal(body.error.code, 1106);
    assertRequestId(response, body);
  }
});

test("article requests allow the declared article length while other JSON bodies retain the 32 KB cap", async () => {
  const largeArticle = await fetch(`${baseUrl}/api/v1/social/articles`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      audience: "public",
      article: {
        title: "T".repeat(160),
        body: "x".repeat(40_000),
      },
    }),
  });
  assert.equal(largeArticle.status, 403);
  const largeArticleBody = await largeArticle.json();
  assert.equal(largeArticleBody.error.key, "CSRF_REJECTED");
  assertRequestId(largeArticle, largeArticleBody);

  const largeOtherRequest = await fetch(`${baseUrl}/api/v1/onboarding/interests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ interests: ["x".repeat(40_000)] }),
  });
  assert.equal(largeOtherRequest.status, 413);
  const largeOtherBody = await largeOtherRequest.json();
  assert.equal(largeOtherBody.error.key, "PAYLOAD_TOO_LARGE");
  assertRequestId(largeOtherRequest, largeOtherBody);
});
