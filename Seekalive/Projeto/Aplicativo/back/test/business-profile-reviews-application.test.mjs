import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BusinessProfileReviewError,
  createBusinessProfileReviewService,
} from "../src/modules/profiles/application/businessProfileReviews.ts";
import {
  decodeBusinessProfileReviewCursor,
  encodeBusinessProfileReviewCursor,
} from "../src/modules/profiles/application/businessProfileReviewCursor.ts";

const ids = {
  person: "10000000-0000-4000-8000-000000000001",
  business: "20000000-0000-4000-8000-000000000002",
  otherBusiness: "30000000-0000-4000-8000-000000000003",
  review: "40000000-0000-4000-8000-000000000004",
};
const createdAt = new Date("2026-10-31T12:00:00.000Z");

function createFixture({ businessPrivate = false, blocked = false } = {}) {
  const records = [
    {
      id: ids.review,
      businessAccountId: ids.business,
      reviewerAccountId: ids.person,
      rating: 4,
      comment: "Atendimento atencioso e ambiente agradável.",
      businessReply: null,
      businessRepliedAt: null,
      createdAt,
    },
  ];
  const summaries = {
    averageRating: 4,
    total: 1,
    distribution: [
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 0 },
      { rating: 4, count: 1 },
      { rating: 5, count: 0 },
    ],
  };
  const identities = new Map([
    [
      ids.person,
      {
        id: ids.person,
        username: "pessoa",
        accountType: "personal",
        createdAt,
        version: 1,
        isPrivate: false,
      },
    ],
    [
      ids.business,
      {
        id: ids.business,
        username: "comercio",
        accountType: "commercial",
        createdAt,
        version: 1,
        isPrivate: businessPrivate,
      },
    ],
    [
      ids.otherBusiness,
      {
        id: ids.otherBusiness,
        username: "outrocomercio",
        accountType: "commercial",
        createdAt,
        version: 1,
        isPrivate: false,
      },
    ],
  ]);
  const store = {
    async list() {
      return {
        items: records,
        summary: summaries,
        hasMore: false,
        viewerReviewId:
          records.find((record) => record.reviewerAccountId === ids.person)
            ?.id ?? null,
      };
    },
    async create(input) {
      if (
        records.some(
          (record) =>
            record.businessAccountId === input.businessAccountId &&
            record.reviewerAccountId === input.reviewerAccountId,
        )
      ) {
        return { kind: "already_exists" };
      }
      const record = {
        id: "50000000-0000-4000-8000-000000000005",
        ...input,
        businessReply: null,
        businessRepliedAt: null,
        createdAt,
      };
      records.push(record);
      return { kind: "created", record };
    },
    async deleteOwn(businessId, reviewerId) {
      const previousLength = records.length;
      for (let index = records.length - 1; index >= 0; index -= 1) {
        if (
          records[index].businessAccountId === businessId &&
          records[index].reviewerAccountId === reviewerId
        ) {
          records.splice(index, 1);
        }
      }
      return records.length !== previousLength;
    },
    async reply(businessId, reviewId, content) {
      const record = records.find(
        (review) =>
          review.businessAccountId === businessId && review.id === reviewId,
      );
      if (!record) return null;
      record.businessReply = content;
      record.businessRepliedAt = createdAt;
      return record;
    },
  };
  const service = createBusinessProfileReviewService({
    store,
    findActiveAccountById: async (id) => identities.get(id) ?? null,
    findActiveAccountByUsername: async (username) =>
      [...identities.values()].find(
        (account) => account.username === username,
      ) ?? null,
    accountViewsByIds: async (accountIds) =>
      accountIds
        .map((id) => identities.get(id))
        .filter(Boolean)
        .map((account) => ({
          id: account.id,
          username: account.username,
          displayName:
            account.accountType === "commercial" ? "Comércio" : "Pessoa",
          avatarUrl: null,
        })),
    getRelationshipFor: async (viewerId) => ({
      following:
        businessPrivate && viewerId === ids.person ? "none" : "accepted",
      inCircle: false,
      blockedByMe: false,
      blockedByThem: false,
      mutedByMe: false,
    }),
    isBlockedBetween: async () => blocked,
    readCommercialProfileDetails: async (accountId) =>
      accountId === ids.business || accountId === ids.otherBusiness
        ? {
            categoryKey: "cafes",
            discoveryKind: "place",
            address: "Rua A, 1",
            postalCode: "01000-000",
            cityName: "São Paulo",
            stateName: "SP",
            countryName: "Brasil",
          }
        : null,
  });
  return { service, records };
}

test("review list uses the profile-owned aggregate and author presentation", async () => {
  const { service } = createFixture();
  const page = await service.list("comercio", ids.person, null, 20);

  assert.equal(page.summary.averageRating, 4);
  assert.equal(page.summary.total, 1);
  assert.equal(page.viewerReviewId, ids.review);
  assert.equal(page.items[0].reviewer.username, "pessoa");
  assert.equal(page.items[0].businessReply, null);
});

test("private business reviews follow the existing profile visibility rule", async () => {
  const visible = createFixture({ businessPrivate: true }).service;
  assert.equal(await visible.list("comercio", ids.person, null, 20), null);

  const hiddenByBlock = createFixture({ blocked: true }).service;
  assert.equal(
    await hiddenByBlock.list("comercio", ids.person, null, 20),
    null,
  );
});

test("only a personal account can publish and one review per profile is enforced", async () => {
  const { service } = createFixture();
  await assert.rejects(
    service.create("comercio", ids.person, {
      rating: 5,
      comment: "Experiência excelente para voltar.",
    }),
    (error) =>
      error instanceof BusinessProfileReviewError &&
      error.kind === "already_exists",
  );

  await assert.rejects(
    service.create("comercio", ids.business, {
      rating: 5,
      comment: "Experiência excelente para voltar.",
    }),
    (error) =>
      error instanceof BusinessProfileReviewError &&
      error.kind === "not_allowed",
  );
});

test("review authors may delete and republish; self-reviews remain unavailable", async () => {
  const { service } = createFixture();
  assert.equal(await service.deleteOwn("comercio", ids.person), true);
  const created = await service.create("comercio", ids.person, {
    rating: 5,
    comment: "Experiência excelente para voltar.",
  });
  assert.equal(created.reviewerAccountId, ids.person);

  await assert.rejects(
    service.create("outrocomercio", ids.otherBusiness, {
      rating: 5,
      comment: "Experiência excelente para voltar.",
    }),
    (error) =>
      error instanceof BusinessProfileReviewError &&
      error.kind === "not_allowed",
  );
});

test("only the commercial account can publish or update a reply", async () => {
  const { service } = createFixture();
  const updated = await service.reply(
    "comercio",
    ids.business,
    { content: "Obrigado por compartilhar sua experiência." },
    ids.review,
  );
  assert.equal(
    updated.businessReply,
    "Obrigado por compartilhar sua experiência.",
  );

  await assert.rejects(
    service.reply(
      "comercio",
      ids.person,
      { content: "Resposta inválida." },
      ids.review,
    ),
    (error) =>
      error instanceof BusinessProfileReviewError && error.kind === "not_found",
  );
});

test("review cursor rejects malformed values and round-trips valid positions", () => {
  const position = { id: ids.review, createdAt };
  assert.deepEqual(
    decodeBusinessProfileReviewCursor(
      encodeBusinessProfileReviewCursor(position),
    ),
    position,
  );
  assert.equal(decodeBusinessProfileReviewCursor("not-a-cursor"), null);
});
