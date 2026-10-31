import type { BusinessProfileReview } from "../types/businessProfileReview";

const STORAGE_KEY = "seekalive-social-reviews";

function isReview(value: unknown): value is BusinessProfileReview {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<BusinessProfileReview>;
  const reply = review.businessReply;
  const hasValidReply =
    reply === undefined ||
    (typeof reply.content === "string" &&
      typeof reply.createdAt === "string");
  return (
    typeof review.id === "string" &&
    typeof review.businessAccountId === "string" &&
    typeof review.reviewerId === "string" &&
    typeof review.rating === "number" &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.comment === "string" &&
    typeof review.createdAt === "string" &&
    hasValidReply
  );
}

export function getStoredBusinessProfileReviews(): BusinessProfileReview[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(value) ? value.filter(isReview) : [];
  } catch {
    console.warn("Could not read profile reviews from this browser.");
    return [];
  }
}

export function saveStoredBusinessProfileReviews(
  reviews: BusinessProfileReview[],
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    throw new Error(
      "Não foi possível salvar a avaliação neste navegador. Verifique o espaço disponível e as permissões de armazenamento.",
    );
  }
}
