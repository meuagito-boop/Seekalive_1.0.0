import type { AccountViewsByIdsReader } from "./businessProfileReviewsPorts";
import type { AccountIdentityRecord } from "../../accounts/domain/accountIdentity";
import type { CommercialProfileDetailsReader } from "./commercialProfileDetails";
import type { RelationshipView } from "../../social/domain/relationshipView";
import { canViewPrivateProfileContent } from "../domain/profileVisibility";
import {
  encodeBusinessProfileReviewCursor,
  type BusinessProfileReviewPosition,
} from "./businessProfileReviewCursor";

export type BusinessReviewRecord = {
  id: string;
  businessAccountId: string;
  reviewerAccountId: string;
  rating: number;
  comment: string;
  businessReply: string | null;
  businessRepliedAt: Date | null;
  createdAt: Date;
};

export type BusinessReviewSummary = {
  averageRating: number | null;
  total: number;
  distribution: Array<{ rating: 1 | 2 | 3 | 4 | 5; count: number }>;
};

export type BusinessReviewPage = {
  items: Array<{
    id: string;
    businessAccountId: string;
    reviewer: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string;
    createdAt: string;
    businessReply: { content: string; createdAt: string } | null;
  }>;
  summary: BusinessReviewSummary;
  viewerReviewId: string | null;
  nextCursor: string | null;
};

export type BusinessProfileReviewStore = {
  list: (
    businessAccountId: string,
    viewerId: string | null,
    position: BusinessProfileReviewPosition | null,
    limit: number,
  ) => Promise<{
    items: BusinessReviewRecord[];
    summary: BusinessReviewSummary;
    hasMore: boolean;
    viewerReviewId: string | null;
  }>;
  create: (input: {
    businessAccountId: string;
    reviewerAccountId: string;
    rating: number;
    comment: string;
  }) => Promise<
    | { kind: "created"; record: BusinessReviewRecord }
    | { kind: "already_exists" }
  >;
  deleteOwn: (
    businessAccountId: string,
    reviewerAccountId: string,
  ) => Promise<boolean>;
  reply: (
    businessAccountId: string,
    reviewId: string,
    content: string,
  ) => Promise<BusinessReviewRecord | null>;
};

export type BusinessProfileReviewErrorKind =
  | "not_found"
  | "not_allowed"
  | "already_exists"
  | "reviewer_not_found";

export class BusinessProfileReviewError extends Error {
  readonly kind: BusinessProfileReviewErrorKind;

  constructor(kind: BusinessProfileReviewErrorKind) {
    super(kind);
    this.name = "BusinessProfileReviewError";
    this.kind = kind;
  }
}

export type BusinessProfileReviewDependencies = {
  store: BusinessProfileReviewStore;
  findActiveAccountById: (
    id: string,
  ) => Promise<(AccountIdentityRecord & { isPrivate: boolean }) | null>;
  findActiveAccountByUsername: (
    username: string,
  ) => Promise<AccountIdentityRecord | null>;
  accountViewsByIds: AccountViewsByIdsReader;
  getRelationshipFor: (
    viewerId: string | null,
    targetId: string,
  ) => Promise<RelationshipView>;
  isBlockedBetween: (firstId: string, secondId: string) => Promise<boolean>;
  readCommercialProfileDetails: CommercialProfileDetailsReader;
};

type CreateInput = {
  rating: number;
  comment: string;
};

type ReplyInput = { content: string };

function normalizeRating(value: number): 1 | 2 | 3 | 4 | 5 {
  if (value < 1 || value > 5 || !Number.isInteger(value)) {
    throw new BusinessProfileReviewError("not_allowed");
  }
  return value as 1 | 2 | 3 | 4 | 5;
}

export function createBusinessProfileReviewService(
  dependencies: BusinessProfileReviewDependencies,
) {
  async function resolveVisibleBusiness(
    username: string,
    viewerId: string | null,
  ): Promise<string | null> {
    const identity = await dependencies.findActiveAccountByUsername(username);
    if (!identity || identity.accountType !== "commercial") return null;
    if (
      viewerId &&
      (await dependencies.isBlockedBetween(viewerId, identity.id))
    ) {
      return null;
    }

    const [account, relationship, commercialDetails] = await Promise.all([
      dependencies.findActiveAccountById(identity.id),
      dependencies.getRelationshipFor(viewerId, identity.id),
      dependencies.readCommercialProfileDetails(identity.id),
    ]);
    if (!account || !commercialDetails) return null;
    if (
      !canViewPrivateProfileContent(
        account.isPrivate,
        viewerId,
        identity.id,
        relationship.following,
      )
    ) {
      return null;
    }
    return identity.id;
  }

  async function toPage(
    records: BusinessReviewRecord[],
    viewerId: string | null,
    summary: BusinessReviewSummary,
    hasMore: boolean,
    viewerReviewId: string | null,
  ): Promise<BusinessReviewPage> {
    const reviewerViews = await dependencies.accountViewsByIds(
      records.map((record) => record.reviewerAccountId),
      viewerId,
    );
    const reviewersById = new Map(
      reviewerViews.map((account) => [account.id, account]),
    );
    const visibleRecords = records.filter((record) =>
      reviewersById.has(record.reviewerAccountId),
    );
    const items = visibleRecords.map((record) => {
      const reviewer = reviewersById.get(record.reviewerAccountId);
      if (!reviewer) {
        throw new Error("Review author disappeared during profile mapping.");
      }
      return {
        id: record.id,
        businessAccountId: record.businessAccountId,
        reviewer: {
          id: reviewer.id,
          username: reviewer.username,
          displayName: reviewer.displayName,
          avatarUrl: reviewer.avatarUrl,
        },
        rating: normalizeRating(record.rating),
        comment: record.comment,
        createdAt: record.createdAt.toISOString(),
        businessReply: record.businessReply
          ? {
              content: record.businessReply,
              createdAt:
                record.businessRepliedAt?.toISOString() ??
                record.createdAt.toISOString(),
            }
          : null,
      };
    });
    const last = visibleRecords.at(-1);

    return {
      items,
      summary,
      viewerReviewId,
      nextCursor:
        hasMore && last
          ? encodeBusinessProfileReviewCursor({
              createdAt: last.createdAt,
              id: last.id,
            })
          : null,
    };
  }

  return {
    async list(
      username: string,
      viewerId: string | null,
      position: BusinessProfileReviewPosition | null,
      limit: number,
    ): Promise<BusinessReviewPage | null> {
      const businessAccountId = await resolveVisibleBusiness(
        username,
        viewerId,
      );
      if (!businessAccountId) return null;
      const page = await dependencies.store.list(
        businessAccountId,
        viewerId,
        position,
        limit,
      );
      return toPage(
        page.items,
        viewerId,
        page.summary,
        page.hasMore,
        page.viewerReviewId,
      );
    },

    async create(
      username: string,
      reviewerAccountId: string,
      input: CreateInput,
    ): Promise<BusinessReviewRecord> {
      const reviewer =
        await dependencies.findActiveAccountById(reviewerAccountId);
      if (!reviewer) {
        throw new BusinessProfileReviewError("reviewer_not_found");
      }
      if (reviewer.accountType !== "personal") {
        throw new BusinessProfileReviewError("not_allowed");
      }
      const businessAccountId = await resolveVisibleBusiness(
        username,
        reviewerAccountId,
      );
      if (!businessAccountId || businessAccountId === reviewerAccountId) {
        throw new BusinessProfileReviewError("not_found");
      }
      const comment = input.comment.trim();
      if (
        !Number.isInteger(input.rating) ||
        input.rating < 1 ||
        input.rating > 5 ||
        comment.length < 10 ||
        comment.length > 500
      ) {
        throw new BusinessProfileReviewError("not_allowed");
      }
      const result = await dependencies.store.create({
        businessAccountId,
        reviewerAccountId,
        rating: input.rating,
        comment,
      });
      if (result.kind === "already_exists") {
        throw new BusinessProfileReviewError("already_exists");
      }
      return result.record;
    },

    async deleteOwn(
      username: string,
      reviewerAccountId: string,
    ): Promise<boolean> {
      const businessAccountId = await resolveVisibleBusiness(
        username,
        reviewerAccountId,
      );
      if (!businessAccountId) return false;
      return dependencies.store.deleteOwn(businessAccountId, reviewerAccountId);
    },

    async reply(
      username: string,
      businessAccountId: string,
      input: ReplyInput,
      reviewId: string,
    ): Promise<BusinessReviewRecord | null> {
      const visibleBusinessId = await resolveVisibleBusiness(
        username,
        businessAccountId,
      );
      if (!visibleBusinessId || visibleBusinessId !== businessAccountId) {
        throw new BusinessProfileReviewError("not_found");
      }
      const business =
        await dependencies.findActiveAccountById(businessAccountId);
      if (!business || business.accountType !== "commercial") {
        throw new BusinessProfileReviewError("not_allowed");
      }
      const content = input.content.trim();
      if (content.length < 3 || content.length > 500) {
        throw new BusinessProfileReviewError("not_allowed");
      }
      return dependencies.store.reply(businessAccountId, reviewId, content);
    },
  };
}
