import type {
  BusinessProfileReviewCreated,
  BusinessProfileReviewPage,
  BusinessProfileReviewReplyResponse,
} from "@workspace/api-client-react";
import {
  CreateBusinessProfileReviewResponse,
  DeleteMyBusinessProfileReviewResponse,
  ListBusinessProfileReviewsResponse,
  ReplyToBusinessProfileReviewResponse,
} from "@workspace/api-zod";
import {
  deleteJson,
  getJson,
  postJson,
  putJson,
} from "@/modules/app/api/httpClient";

function profileReviewsPath(username: string) {
  return `/profiles/${encodeURIComponent(username)}/reviews`;
}

export function listBusinessProfileReviews(
  username: string,
  cursor?: string,
): Promise<BusinessProfileReviewPage> {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return getJson(`${profileReviewsPath(username)}?${params.toString()}`, {
    200: ListBusinessProfileReviewsResponse,
  });
}

export function createBusinessProfileReview(
  username: string,
  input: { rating: number; comment: string },
): Promise<BusinessProfileReviewCreated> {
  return postJson(profileReviewsPath(username), input, {
    201: CreateBusinessProfileReviewResponse,
  });
}

export function deleteMyBusinessProfileReview(
  username: string,
): Promise<{ deleted: true }> {
  return deleteJson(`${profileReviewsPath(username)}/me`, {
    200: DeleteMyBusinessProfileReviewResponse,
  });
}

export function replyToBusinessProfileReview(
  username: string,
  reviewId: string,
  content: string,
): Promise<BusinessProfileReviewReplyResponse> {
  return putJson(
    `${profileReviewsPath(username)}/${encodeURIComponent(reviewId)}/reply`,
    { content },
    { 200: ReplyToBusinessProfileReviewResponse },
  );
}
