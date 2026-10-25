import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "../src/modules/profile/types/user";
import type { SeekReview } from "../src/modules/seek/types/review";
import {
  calculateAverageBusinessRating,
  selectBusinessReviews,
} from "../src/modules/seek/utils/businessReviews";

function makeReview(overrides: Partial<SeekReview> = {}): SeekReview {
  return {
    id: "review-1",
    businessAccountId: "business-1",
    reviewerId: "reviewer-1",
    rating: 5,
    comment: "Atendimento muito bom.",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("avaliações do comércio ficam ordenadas e autores bloqueados não aparecem no conteúdo", () => {
  const reviews = [
    makeReview({ id: "older", reviewerId: "visible", createdAt: "2026-01-01T00:00:00.000Z" }),
    makeReview({ id: "newest", reviewerId: "blocked", rating: 1, createdAt: "2026-02-01T00:00:00.000Z" }),
    makeReview({ id: "other-business", businessAccountId: "business-2" }),
  ];
  const blockedUser = { id: "blocked", isBlocked: true } as User;
  const selected = selectBusinessReviews(reviews, "business-1", (id) =>
    id === blockedUser.id ? blockedUser : undefined,
  );

  assert.deepEqual(selected.allReviews.map((review) => review.id), ["newest", "older"]);
  assert.deepEqual(selected.visibleReviews.map((review) => review.id), ["older"]);
  assert.equal(calculateAverageBusinessRating(selected.allReviews), 3);
});
