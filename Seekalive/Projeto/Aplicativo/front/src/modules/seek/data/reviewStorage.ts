import type { SeekReview } from "@/modules/seek/types/review";

const STORAGE_KEY = "seekalive-social-reviews";

function isReview(value: unknown): value is SeekReview {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<SeekReview>;
  const hasValidReply =
    review.businessReply === undefined ||
    (typeof review.businessReply?.content === "string" &&
      typeof review.businessReply.createdAt === "string");
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

export function getStoredSeekReviews(): SeekReview[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isReview) : [];
  } catch {
    console.warn("Could not read Seek reviews from this browser.");
    return [];
  }
}

export function saveStoredSeekReviews(reviews: SeekReview[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    throw new Error("Não foi possível salvar a avaliação neste navegador. Verifique o espaço disponível e as permissões de armazenamento.");
  }
}
