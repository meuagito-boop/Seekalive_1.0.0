import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

if (process.env.REPLIT_DEPLOYMENT || process.env.NODE_ENV !== "development") {
  throw new Error("SQL capture requires a non-deployment development process.");
}
const configuredTarget = process.env.SEEKALIVE_DATABASE_TARGET?.trim().toLowerCase();
if (configuredTarget && configuredTarget !== "replit") {
  throw new Error("SQL capture refuses a non-Replit runtime target.");
}

const requireFromBack = createRequire(
  new URL("../../../../Aplicativo/back/package.json", import.meta.url),
);
const esbuild = requireFromBack("esbuild");
const pg = requireFromBack("pg");
const captured = [];
const originalPoolQuery = pg.Pool.prototype.query;

pg.Pool.prototype.query = function captureQuery(query, values, callback) {
  const text = typeof query === "string" ? query : query?.text;
  const params = Array.isArray(values) ? values : query?.values ?? [];
  assert.equal(typeof text, "string", "Expected Drizzle to issue SQL text.");
  captured.push({ text, values: params });
  const result = Promise.resolve({
    command: "SELECT",
    rowCount: 0,
    rows: [],
    fields: [],
  });
  if (typeof callback === "function") {
    result.then((response) => callback(null, response), callback);
    return this;
  }
  return result;
};

function loadRepository(entryPoint) {
  const bundle = esbuild.buildSync({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["pg", "drizzle-orm"],
    write: false,
    logLevel: "silent",
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", "process", bundle.outputFiles[0].text)(
    requireFromBack,
    module,
    module.exports,
    process,
  );
  return module.exports;
}

const repoPath = (relativePath) =>
  fileURLToPath(new URL(`../../../../Aplicativo/back/src/modules/${relativePath}`, import.meta.url));
const testAccountId = "00000000-0000-4000-8000-000000000001";
const testPostId = "00000000-0000-4000-8000-000000000002";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const cursor = { createdAt, id: testPostId };
const records = [];

async function capture(label, run) {
  const start = captured.length;
  await run();
  const queries = captured.slice(start);
  assert.ok(queries.length > 0, `${label} did not issue SQL.`);
  for (const query of queries) {
    assert.match(query.text.trimStart().toLowerCase(), /^select\b/, `${label} must be read-only.`);
  }
  records.push({ label, queries });
}

try {
  const posts = loadRepository(repoPath("feed/infrastructure/postRepository.ts"));
  const comments = loadRepository(repoPath("feed/infrastructure/postCommentRepository.ts"));
  const social = loadRepository(repoPath("social/infrastructure/socialAccountListRepository.ts"));
  const profiles = loadRepository(repoPath("profiles/infrastructure/profilePresentationRepository.ts"));

  await capture("feed:for-you", () => posts.listFeedPostsForTimeline({
    authorIds: null, format: "all", after: cursor, limit: 20,
  }));
  await capture("feed:following", () => posts.listFeedPostsForTimeline({
    authorIds: [testAccountId], format: "all", after: cursor, limit: 20,
  }));
  await capture("feed:articles", () => posts.listFeedPostsForTimeline({
    authorIds: null, format: "article", after: cursor, limit: 20,
  }));
  await capture("feed:videos", () => posts.listFeedPostsForTimeline({
    authorIds: null, format: "media", videoOnly: true, after: cursor, limit: 20,
  }));
  await capture("feed:search-hashtag-prefix", () => posts.listFeedPostsForTimeline({
    authorIds: null, format: "all", searchTerm: "cafe", hashtagPrefix: "cafe",
    after: cursor, limit: 20,
  }));
  await capture("profile:posts-by-author", () => posts.listFeedPostsByAuthor({
    authorId: testAccountId, format: "text", after: cursor, limit: 20,
  }));
  await capture("comments:list", () => comments.listFeedPostComments({
    postId: testPostId, after: cursor, limit: 21,
  }));
  await capture("social:search-verified-accounts", () =>
    social.searchVerifiedAccountIds("cafe", 20, 0));
  await capture("social:search-verified-accounts-page-2", () =>
    social.searchVerifiedAccountIds("cafe", 20, 20));
  await capture("social:list-followers", () =>
    social.listFollowerIds(testAccountId, 20, 0));
  await capture("social:list-followers-page-2", () =>
    social.listFollowerIds(testAccountId, 20, 20));
  await capture("social:list-following", () =>
    social.listFollowingIds(testAccountId, 20, 0));
  await capture("social:list-following-page-2", () =>
    social.listFollowingIds(testAccountId, 20, 20));
  await capture("social:list-circle", () =>
    social.listCircleIds(testAccountId, 20, 0));
  await capture("social:list-circle-page-2", () =>
    social.listCircleIds(testAccountId, 20, 20));
  await capture("profiles:read-presentation", () =>
    profiles.findProfilePresentationByAccountId(testAccountId));
} finally {
  pg.Pool.prototype.query = originalPoolQuery;
}

const database = loadRepository(fileURLToPath(
  new URL("../../../../infra/database/src/index.ts", import.meta.url),
));
const { pool } = database;
const plans = [];
try {
  for (const record of records) {
    for (const [index, query] of record.queries.entries()) {
      const result = await pool.query(
        `EXPLAIN (FORMAT JSON) ${query.text}`,
        query.values,
      );
      const planRoot = result.rows[0]?.["QUERY PLAN"]?.[0]?.Plan;
      assert.ok(planRoot, `EXPLAIN returned no plan for ${record.label}.`);
      const nodes = [];
      const visit = (node) => {
        nodes.push({
          type: node["Node Type"],
          relation: node["Relation Name"] ?? null,
          index: node["Index Name"] ?? null,
          estimatedRows: node["Plan Rows"] ?? null,
        });
        for (const child of node.Plans ?? []) visit(child);
      };
      visit(planRoot);
      plans.push({ label: record.label, queryIndex: index + 1, nodes });
    }
  }
} finally {
  await pool.end();
}

console.log(JSON.stringify({
  runtimeTarget: configuredTarget || "replit (runtime default)",
  environment: "development",
  queryCapture: "Drizzle repository methods executed against a fake pg.Pool; no app SQL reached the database",
  explain: "EXPLAIN (FORMAT JSON), without ANALYZE",
  queries: records.map(({ label, queries }) => ({
    label,
    statements: queries.map(({ text, values }) => ({
      sql: text,
      bindCount: values.length,
      bindTypes: values.map((value) => value instanceof Date ? "timestamp" : typeof value),
    })),
  })),
  plans,
}, null, 2));
