import assert from "node:assert/strict";
import { test } from "node:test";
import { deviceVerificationRequiredResponseSchema } from "@workspace/api-zod";
import {
  ApiResponseContractError,
  ApiRequestError,
  deleteJson,
  getJson,
  postJson,
} from "../src/modules/app/api/httpClient";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function withMockedFetch(
  mockFetch: typeof fetch,
  run: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("POST obtains CSRF and sends the documented JSON request", async () => {
  const calls: FetchCall[] = [];

  await withMockedFetch(
    async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === "/api/v1/auth/csrf") {
        return jsonResponse({ csrfToken: "csrf-value" });
      }
      return jsonResponse({ status: "accepted" }, 201);
    },
    async () => {
      const result = await postJson<{ status: string }>(
        "/onboarding/interests",
        {
          interests: ["music"],
        },
      );

      assert.deepEqual(result, { status: "accepted" });
      assert.deepEqual(
        calls.map(({ url }) => url),
        ["/api/v1/auth/csrf", "/api/v1/onboarding/interests"],
      );
      assert.equal(calls[0].init?.credentials, "include");
      assert.equal(calls[0].init?.cache, "no-store");
      assert.equal(calls[1].init?.credentials, "include");
      assert.equal(calls[1].init?.method, "POST");
      assert.equal(
        calls[1].init?.body,
        JSON.stringify({ interests: ["music"] }),
      );
      assert.equal(
        new Headers(calls[1].init?.headers).get("X-CSRF-Token"),
        "csrf-value",
      );
    },
  );
});

test("GET uses a fresh session request and DELETE includes CSRF", async () => {
  const calls: FetchCall[] = [];

  await withMockedFetch(
    async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === "/api/v1/auth/csrf") {
        return jsonResponse({ csrfToken: "csrf-value" });
      }
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return jsonResponse({ status: "active" });
    },
    async () => {
      assert.deepEqual(await getJson("/auth/session"), { status: "active" });
      assert.equal(await deleteJson<void>("/auth/sessions/current"), undefined);

      assert.equal(calls[0].url, "/api/v1/auth/session");
      assert.equal(calls[0].init?.method, "GET");
      assert.equal(calls[0].init?.cache, "no-store");
      assert.equal(calls[1].url, "/api/v1/auth/csrf");
      assert.equal(calls[2].url, "/api/v1/auth/sessions/current");
      assert.equal(calls[2].init?.method, "DELETE");
      assert.equal(
        new Headers(calls[2].init?.headers).get("X-CSRF-Token"),
        "csrf-value",
      );
    },
  );
});

test("non-success responses retain the shared API error contract", async () => {
  await withMockedFetch(
    async () =>
      jsonResponse(
        {
          error: {
            key: "INTERNAL_ERROR",
            message: "Falha controlada",
            details: [{ field: "email", message: "Inválido" }],
            supportEmail: "support@example.test",
            retryAfterSeconds: 30,
            attemptsRemaining: 2,
            resendAvailableAt: "2026-10-27T20:00:00.000Z",
          },
        },
        429,
      ),
    async () => {
      await assert.rejects(getJson("/auth/session"), (error: unknown) => {
        assert.ok(error instanceof ApiRequestError);
        assert.equal(error.status, 429);
        assert.ok(error.code > 0);
        assert.equal(error.key, "INTERNAL_ERROR");
        assert.equal(error.message, "Falha controlada");
        assert.deepEqual(error.details, [
          { field: "email", message: "Inválido" },
        ]);
        assert.equal(error.supportEmail, "support@example.test");
        assert.equal(error.retryAfterSeconds, 30);
        assert.equal(error.attemptsRemaining, 2);
        assert.equal(error.resendAvailableAt, "2026-10-27T20:00:00.000Z");
        return true;
      });
    },
  );
});

test("validated responses enforce status and shape without changing wire values", async () => {
  const challenge = {
    status: "device_verification_required",
    challengeId: "7f3cde86-6efb-45a1-9440-67e93c0e5bf4",
    emailMasked: "a***@example.test",
    expiresAt: "2026-10-27T18:00:00.000Z",
    resendAvailableAt: "2026-10-27T17:30:00.000Z",
    message: "Confirme esta instalação.",
  };

  await withMockedFetch(
    async (input) =>
      String(input) === "/api/v1/auth/csrf"
        ? jsonResponse({ csrfToken: "csrf-value" })
        : jsonResponse(challenge, 202),
    async () => {
      const result = await postJson<typeof challenge>(
        "/auth/login",
        { identifier: "user", password: "Password1!" },
        { 202: deviceVerificationRequiredResponseSchema },
      );

      assert.deepEqual(result, challenge);
      assert.equal(typeof result.expiresAt, "string");
    },
  );
});

test("validated responses reject unexpected success statuses and malformed bodies", async () => {
  const contract = { 202: deviceVerificationRequiredResponseSchema };
  const invalidResponses: Array<{
    response: () => Response;
    expectedStatus: number;
  }> = [
    {
      response: () => jsonResponse({ status: "verification_required" }, 200),
      expectedStatus: 200,
    },
    {
      response: () =>
        jsonResponse(
          {
            status: "device_verification_required",
            challengeId: "not-a-uuid",
            emailMasked: "a***@example.test",
            expiresAt: "not-a-date",
            resendAvailableAt: "not-a-date",
            message: "Confirme esta instalação.",
          },
          202,
        ),
      expectedStatus: 202,
    },
    {
      response: () =>
        new Response("{", {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }),
      expectedStatus: 202,
    },
  ];

  for (const invalid of invalidResponses) {
    await withMockedFetch(
      async (input) =>
        String(input) === "/api/v1/auth/csrf"
          ? jsonResponse({ csrfToken: "csrf-value" })
          : invalid.response(),
      async () => {
        await assert.rejects(
          postJson("/auth/login", { identifier: "user", password: "secret" }, contract),
          (error: unknown) => {
            assert.ok(error instanceof ApiResponseContractError);
            assert.equal(error.status, invalid.expectedStatus);
            assert.equal(
              error.message,
              "A resposta recebida do servidor está incompatível. Tente novamente.",
            );
            return true;
          },
        );
      },
    );
  }
});

test("validated no-content responses require HTTP 204", async () => {
  await withMockedFetch(
    async (input, init) => {
      if (String(input) === "/api/v1/auth/csrf") {
        return jsonResponse({ csrfToken: "csrf-value" });
      }
      assert.equal(init?.method, "DELETE");
      return new Response(null, { status: 204 });
    },
    async () => {
      const result = await deleteJson<void>("/auth/sessions/other", {
        204: "empty",
      });
      assert.equal(result, undefined);
    },
  );
});
