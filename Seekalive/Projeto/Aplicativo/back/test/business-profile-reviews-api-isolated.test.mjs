import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  configureIsolatedDatabaseEnvironment,
  createIsolatedSchemaName,
  setupIsolatedDatabaseFixture,
} from "./support/isolatedDatabaseFixture.mjs";

const schemaName = createIsolatedSchemaName();
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const expectedDatabase = process.env.SEEKALIVE_EXPECTED_DATABASE?.trim();
configureIsolatedDatabaseEnvironment({
  schemaName,
  sessionSecret: "seekalive-isolated-review-http-session-secret",
});

const database = await import("@workspace/db");
const {
  accountBlocks,
  accountEmails,
  accountFollows,
  accountFollowRequests,
  accountProfiles,
  accountUsernameReservations,
  accounts,
  authChallenges,
  businessProfileReviews,
  commercialProfiles,
  db,
  passwordCredentials,
  pool,
  sessions,
  trustedDevices,
} = database;
const { getTableConfig } = await import("drizzle-orm/pg-core");
const schemaTables = [
  accountBlocks,
  accountEmails,
  accountFollows,
  accountFollowRequests,
  accountProfiles,
  accountUsernameReservations,
  accounts,
  authChallenges,
  businessProfileReviews,
  commercialProfiles,
  passwordCredentials,
  sessions,
  trustedDevices,
];

for (const table of schemaTables) {
  assert.equal(
    getTableConfig(table).schema,
    schemaName,
    "Every table used by the Reviews HTTP test must target the temporary schema.",
  );
}

let server;
let baseUrl;
let isolatedDatabaseFixture;
const verificationMessages = [];
const clientIp = "203.0.113.42";

function responseCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  return [response.headers.get("set-cookie") ?? ""];
}

function cookieValue(response, name) {
  const cookie = responseCookies(response)
    .map((value) => value.split(";")[0])
    .findLast((value) => value.startsWith(`${name}=`));
  assert.ok(cookie, `Expected ${name} cookie.`);
  return cookie;
}

function mergeResponseCookies(auth, response) {
  if (!auth) return;
  const values = new Map(
    (auth.cookie ?? "")
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const separator = value.indexOf("=");
        return [value.slice(0, separator), value.slice(separator + 1)];
      }),
  );
  for (const cookie of responseCookies(response)) {
    const [pair, ...attributes] = cookie.split(";");
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    const isCleared = attributes.some(
      (attribute) => attribute.trim().toLowerCase() === "max-age=0",
    );
    if (isCleared || value === "") values.delete(name);
    else values.set(name, value);
  }
  auth.cookie = [...values]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(path, { method = "GET", body, auth } = {}) {
  const headers = new Headers({ "x-seekalive-client-ip": clientIp });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (auth?.cookie) headers.set("cookie", auth.cookie);
  if (auth?.csrfToken) headers.set("x-csrf-token", auth.csrfToken);

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  const responseBody = text ? JSON.parse(text) : null;
  mergeResponseCookies(auth, response);
  if (auth && responseBody?.csrfToken) {
    auth.csrfToken = responseBody.csrfToken;
  }
  return { response, body: responseBody };
}

async function createPreAuth() {
  const { response, body } = await request("/api/v1/auth/csrf");
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(typeof body.csrfToken, "string");
  return {
    cookie: cookieValue(response, "__Host-seekalive_pre_auth"),
    csrfToken: body.csrfToken,
  };
}

async function createVerifiedAccount(accountType, suffix) {
  const username =
    accountType === "commercial" ? `b_${suffix}` : `r_${suffix}`;
  const email = `${accountType}-${suffix}@example.com`;
  const password = "A12_Reviews_Isolated_2026!";
  const registration =
    accountType === "commercial"
      ? {
          accountType,
          businessName: "Café de Teste",
          categoryKey: "cafes",
          discoveryKind: "place",
          address: "Rua Isolada, 10",
          postalCode: "01001000",
          city: "São Paulo",
          state: "SP",
          country: "Brasil",
          username,
          email,
          dateOfBirth: "01/01/1990",
          password,
          passwordConfirmation: password,
          acceptedTermsVersion: "v1",
        }
      : {
          accountType,
          firstName: "Pessoa",
          lastName: "Avaliadora",
          username,
          email,
          dateOfBirth: "01/01/1990",
          password,
          passwordConfirmation: password,
          acceptedTermsVersion: "v1",
        };

  const preAuth = await createPreAuth();
  const registrationResult = await request("/api/v1/auth/register", {
    method: "POST",
    body: registration,
    auth: preAuth,
  });
  assert.equal(
    registrationResult.response.status,
    202,
    JSON.stringify(registrationResult.body),
  );

  const verificationMessage = verificationMessages.findLast(
    (message) => message.email === email.toLowerCase(),
  );
  assert.ok(verificationMessage, "Verification email must use the test sink.");

  const confirmation = await request("/api/v1/auth/verification/confirm", {
    method: "POST",
    body: { email, code: verificationMessage.code },
    auth: preAuth,
  });
  assert.equal(
    confirmation.response.status,
    200,
    JSON.stringify(confirmation.body),
  );
  assert.equal(confirmation.body.emailVerified, true);

  return {
    account: confirmation.body.account,
    cookie: preAuth.cookie,
    csrfToken: confirmation.body.csrfToken,
    username,
  };
}

function assertApiError(result, status, key) {
  assert.equal(result.response.status, status, JSON.stringify(result.body));
  assert.equal(result.body?.error?.key, key);
}

before(async () => {
  isolatedDatabaseFixture = await setupIsolatedDatabaseFixture({
    schemaName,
    expectedDatabase,
    projectRoot,
    pool,
  });

  const { setAuthEmailDeliveryForTests } =
    await import("../src/modules/auth/infrastructure/emailDelivery.ts");
  setAuthEmailDeliveryForTests({
    isConfigured: true,
    async sendVerificationCode(message) {
      verificationMessages.push(message);
    },
    async sendPasswordResetCode() {},
    async sendDeviceLoginCode() {},
    async sendPasswordUpdateCode() {},
    async sendAccountPasswordChangeCode() {},
    async sendAccountEmailChangeCurrentCode() {},
    async sendAccountEmailChangeNewCode() {},
    async sendAccountEmailChangeSecurityNotice() {},
    async sendAccountDeletionCode() {},
  });

  const { default: app } = await import("../src/app.ts");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  try {
    if (server?.listening) {
      const stopped = new Promise((resolveStop, rejectStop) => {
        server.close((error) => (error ? rejectStop(error) : resolveStop()));
        server.closeAllConnections();
      });
      await stopped;
    }
  } finally {
    if (isolatedDatabaseFixture) {
      const cleanup = await isolatedDatabaseFixture.cleanup();
      assert.equal(cleanup.schemaRemoved, true);
      assert.equal(cleanup.publicSchemaUnchanged, true);
      console.log("Isolated Reviews API schema dropped.");
    } else {
      await pool.end();
    }
  }
});

test("Reviews HTTP routes persist, authorize, validate, paginate, reply and delete", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const reviewer = await createVerifiedAccount("personal", `r${suffix}`);
  const secondReviewer = await createVerifiedAccount("personal", `s${suffix}`);
  const business = await createVerifiedAccount("commercial", `b${suffix}`);
  const reviewsPath = `/api/v1/profiles/${business.username}/reviews`;

  const emptyPage = await request(reviewsPath);
  assert.equal(emptyPage.response.status, 200, JSON.stringify(emptyPage.body));
  assert.deepEqual(emptyPage.body.items, []);
  assert.equal(emptyPage.body.summary.total, 0);
  assert.equal(emptyPage.body.viewerReviewId, null);

  const preAuthOnly = await createPreAuth();
  const unauthenticatedWrite = await request(reviewsPath, {
    method: "POST",
    auth: preAuthOnly,
    body: { rating: 4, comment: "Atendimento muito bom." },
  });
  assertApiError(unauthenticatedWrite, 401, "UNAUTHENTICATED");

  const missingCsrf = await request(reviewsPath, {
    method: "POST",
    auth: { cookie: reviewer.cookie },
    body: { rating: 4, comment: "Atendimento muito bom." },
  });
  assertApiError(missingCsrf, 403, "CSRF_REJECTED");

  const invalidRating = await request(reviewsPath, {
    method: "POST",
    auth: reviewer,
    body: { rating: 6, comment: "Atendimento muito bom." },
  });
  assert.equal(invalidRating.response.status, 400);

  const invalidComment = await request(reviewsPath, {
    method: "POST",
    auth: reviewer,
    body: { rating: 4, comment: "Curto." },
  });
  assert.equal(invalidComment.response.status, 400);

  const commercialReview = await request(reviewsPath, {
    method: "POST",
    auth: business,
    body: { rating: 4, comment: "Avaliação inválida de conta comercial." },
  });
  assertApiError(commercialReview, 403, "BUSINESS_REVIEW_NOT_ALLOWED");

  const reviewInput = {
    rating: 4,
    comment: "Atendimento muito bom.",
  };
  const [firstCreate, concurrentDuplicate] = await Promise.all([
    request(reviewsPath, { method: "POST", auth: { ...reviewer }, body: reviewInput }),
    request(reviewsPath, { method: "POST", auth: { ...reviewer }, body: reviewInput }),
  ]);
  const creates = [firstCreate, concurrentDuplicate];
  assert.deepEqual(
    creates.map((result) => result.response.status).sort(),
    [201, 409],
  );
  const createdReview = creates.find(
    (result) => result.response.status === 201,
  );
  const duplicateReview = creates.find(
    (result) => result.response.status === 409,
  );
  assert.ok(createdReview?.body?.id);
  assertApiError(
    duplicateReview,
    409,
    "BUSINESS_REVIEW_ALREADY_EXISTS",
  );

  const secondCreate = await request(reviewsPath, {
    method: "POST",
    auth: secondReviewer,
    body: {
      rating: 5,
      comment: "Espaço agradável e serviço atencioso.",
    },
  });
  assert.equal(secondCreate.response.status, 201, JSON.stringify(secondCreate.body));

  const storedReviews = await db
    .select({
      id: businessProfileReviews.id,
      reviewerAccountId: businessProfileReviews.reviewerAccountId,
      rating: businessProfileReviews.rating,
    })
    .from(businessProfileReviews)
    .where(eq(businessProfileReviews.businessAccountId, business.account.id));
  assert.equal(storedReviews.length, 2);

  const pageOne = await request(`${reviewsPath}?limit=1`);
  assert.equal(pageOne.response.status, 200, JSON.stringify(pageOne.body));
  assert.equal(pageOne.body.items.length, 1);
  assert.equal(pageOne.body.summary.total, 2);
  assert.equal(pageOne.body.summary.averageRating, 4.5);
  assert.ok(pageOne.body.nextCursor);

  const pageTwoQuery = new URLSearchParams({
    limit: "1",
    cursor: pageOne.body.nextCursor,
  });
  const pageTwo = await request(`${reviewsPath}?${pageTwoQuery}`);
  assert.equal(pageTwo.response.status, 200, JSON.stringify(pageTwo.body));
  assert.equal(pageTwo.body.items.length, 1);
  assert.notEqual(pageTwo.body.items[0].id, pageOne.body.items[0].id);
  assert.equal(pageTwo.body.nextCursor, null);

  const invalidLimit = await request(`${reviewsPath}?limit=51`);
  assert.equal(invalidLimit.response.status, 400);
  const invalidCursor = await request(`${reviewsPath}?cursor=not-a-cursor`);
  assert.equal(invalidCursor.response.status, 400);

  const ownReviewPage = await request(reviewsPath, { auth: reviewer });
  assert.equal(ownReviewPage.response.status, 200);
  assert.equal(ownReviewPage.body.viewerReviewId, createdReview.body.id);

  const reviewId = createdReview.body.id;
  const businessReply = await request(
    `${reviewsPath}/${reviewId}/reply`,
    {
      method: "PUT",
      auth: business,
      body: { content: "Obrigado pelo comentário." },
    },
  );
  assert.equal(
    businessReply.response.status,
    200,
    JSON.stringify(businessReply.body),
  );
  assert.equal(businessReply.body.id, reviewId);
  assert.equal(businessReply.body.businessReply, "Obrigado pelo comentário.");

  const unauthorizedReply = await request(
    `${reviewsPath}/${reviewId}/reply`,
    {
      method: "PUT",
      auth: secondReviewer,
      body: { content: "Tentativa de resposta." },
    },
  );
  assertApiError(unauthorizedReply, 404, "BUSINESS_REVIEW_NOT_FOUND");

  const invalidReply = await request(
    `${reviewsPath}/${reviewId}/reply`,
    {
      method: "PUT",
      auth: business,
      body: { content: "ok" },
    },
  );
  assert.equal(invalidReply.response.status, 400);

  const otherAuthorDelete = await request(
    `${reviewsPath}/me`,
    {
      method: "DELETE",
      auth: secondReviewer,
    },
  );
  assert.equal(otherAuthorDelete.response.status, 200);
  assert.deepEqual(otherAuthorDelete.body, { deleted: true });

  const afterOtherAuthorDelete = await request(reviewsPath);
  assert.equal(afterOtherAuthorDelete.body.summary.total, 1);
  assert.equal(
    afterOtherAuthorDelete.body.items.some((item) => item.id === reviewId),
    true,
  );

  const deletedReview = await request(`${reviewsPath}/me`, {
    method: "DELETE",
    auth: reviewer,
  });
  assert.equal(deletedReview.response.status, 200);
  assert.deepEqual(deletedReview.body, { deleted: true });

  const afterDeletePage = await request(reviewsPath);
  assert.equal(afterDeletePage.body.summary.total, 0);
  assert.equal(
    afterDeletePage.body.items.some((item) => item.id === reviewId),
    false,
  );

  const republishedReview = await request(reviewsPath, {
    method: "POST",
    auth: reviewer,
    body: reviewInput,
  });
  assert.equal(
    republishedReview.response.status,
    201,
    JSON.stringify(republishedReview.body),
  );

  const secondDelete = await request(`${reviewsPath}/me`, {
    method: "DELETE",
    auth: reviewer,
  });
  assert.equal(secondDelete.response.status, 200);
});
