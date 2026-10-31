import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import type { User } from "@/modules/profile/types/user";
import type {
  BusinessProfileReview,
  BusinessReviewRating,
} from "../types/businessProfileReview";
import {
  createBusinessProfileReview,
  deleteMyBusinessProfileReview,
  listBusinessProfileReviews,
  replyToBusinessProfileReview,
} from "../services/businessProfileReviewApi";

type Summary = {
  averageRating: number | null;
  total: number;
  distribution: Array<{ rating: BusinessReviewRating; count: number }>;
};

const EMPTY_SUMMARY: Summary = {
  averageRating: null,
  total: 0,
  distribution: [1, 2, 3, 4, 5].map((rating) => ({
    rating: rating as BusinessReviewRating,
    count: 0,
  })),
};

function localAuthor(user: User | undefined) {
  if (!user) return undefined;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl || null,
  };
}

export function useBusinessProfileReviews(business: User) {
  const { currentUser } = useAppContext();
  const {
    reviews: localReviews,
    getUserById,
    publishBusinessProfileReview,
    deleteBusinessProfileReview,
    replyToBusinessProfileReview: saveLocalReply,
  } = useSocial();
  const isRemote = business.source === "server";
  const [remoteReviews, setRemoteReviews] = useState<BusinessProfileReview[]>(
    [],
  );
  const [remoteSummary, setRemoteSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [viewerReviewId, setViewerReviewId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(isRemote);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      if (!isRemote) return;
      setLoading(true);
      setError(null);
      try {
        const page = await listBusinessProfileReviews(
          business.username,
          cursor,
        );
        const mapped: BusinessProfileReview[] = page.items.map((item) => ({
          id: item.id,
          businessAccountId: item.businessAccountId,
          reviewerId: item.reviewer.id,
          reviewer: item.reviewer,
          rating: item.rating as BusinessReviewRating,
          comment: item.comment,
          createdAt: item.createdAt,
          businessReply: item.businessReply ?? undefined,
        }));
        setRemoteReviews((current) =>
          append ? [...current, ...mapped] : mapped,
        );
        setRemoteSummary({
          averageRating: page.summary.averageRating,
          total: page.summary.total,
          distribution: page.summary.distribution.map(({ rating, count }) => ({
            rating: rating as BusinessReviewRating,
            count,
          })),
        });
        setViewerReviewId(page.viewerReviewId);
        setNextCursor(page.nextCursor);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar as avaliações.",
        );
      } finally {
        setLoading(false);
      }
    },
    [business.username, isRemote],
  );

  useEffect(() => {
    if (!isRemote) {
      setRemoteReviews([]);
      setRemoteSummary(EMPTY_SUMMARY);
      setViewerReviewId(null);
      setNextCursor(null);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [isRemote, load]);

  const localBusinessReviews = useMemo(
    () =>
      localReviews
        .filter((review) => review.businessAccountId === business.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .filter((review) => !getUserById(review.reviewerId)?.isBlocked)
        .map((review) => ({
          ...review,
          reviewer: localAuthor(getUserById(review.reviewerId)),
        })),
    [business.id, getUserById, localReviews],
  );

  const localSummary = useMemo<Summary>(() => {
    if (!localBusinessReviews.length) return EMPTY_SUMMARY;
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating: rating as BusinessReviewRating,
      count: localBusinessReviews.filter((review) => review.rating === rating)
        .length,
    }));
    return {
      averageRating:
        localBusinessReviews.reduce((sum, review) => sum + review.rating, 0) /
        localBusinessReviews.length,
      total: localBusinessReviews.length,
      distribution,
    };
  }, [localBusinessReviews]);

  const viewerReview = isRemote
    ? (remoteReviews.find((review) => review.id === viewerReviewId) ?? null)
    : (localBusinessReviews.find(
        (review) => review.reviewerId === currentUser?.id,
      ) ?? null);
  const effectiveViewerReviewId = isRemote
    ? viewerReviewId
    : (viewerReview?.id ?? null);

  const create = useCallback(
    async (input: { rating: BusinessReviewRating; comment: string }) => {
      setSaving(true);
      setError(null);
      try {
        if (isRemote) {
          await createBusinessProfileReview(business.username, input);
          await load();
          return;
        }
        if (!currentUser) throw new Error("Entre na conta para continuar.");
        publishBusinessProfileReview({
          id: crypto.randomUUID(),
          businessAccountId: business.id,
          reviewerId: currentUser.id,
          rating: input.rating,
          comment: input.comment.trim(),
          createdAt: new Date().toISOString(),
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível publicar a avaliação.",
        );
        throw requestError;
      } finally {
        setSaving(false);
      }
    },
    [
      business.id,
      business.username,
      currentUser,
      isRemote,
      load,
      publishBusinessProfileReview,
    ],
  );

  const remove = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (isRemote) {
        await deleteMyBusinessProfileReview(business.username);
        await load();
        return;
      }
      deleteBusinessProfileReview(business.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível excluir a avaliação.",
      );
      throw requestError;
    } finally {
      setSaving(false);
    }
  }, [
    business.id,
    business.username,
    deleteBusinessProfileReview,
    isRemote,
    load,
  ]);

  const reply = useCallback(
    async (reviewId: string, content: string) => {
      setSaving(true);
      setError(null);
      try {
        if (isRemote) {
          await replyToBusinessProfileReview(
            business.username,
            reviewId,
            content,
          );
          await load();
          return;
        }
        saveLocalReply(reviewId, business.id, content);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível salvar a resposta.",
        );
        throw requestError;
      } finally {
        setSaving(false);
      }
    },
    [business.id, business.username, isRemote, load, saveLocalReply],
  );

  const reviews = isRemote ? remoteReviews : localBusinessReviews;
  return {
    reviews,
    summary: isRemote ? remoteSummary : localSummary,
    viewerReviewId: effectiveViewerReviewId,
    viewerReview,
    nextCursor: isRemote ? nextCursor : null,
    loading,
    saving,
    error,
    loadMore: () => (nextCursor ? load(nextCursor, true) : Promise.resolve()),
    reload: () => load(),
    create,
    remove,
    reply,
  };
}
