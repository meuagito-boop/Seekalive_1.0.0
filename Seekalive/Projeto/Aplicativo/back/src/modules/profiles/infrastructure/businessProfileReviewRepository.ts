import { and, desc, eq, lt, notExists, or, sql } from "drizzle-orm";
import { accountBlocks, businessProfileReviews, db } from "@workspace/db";
import type { BusinessProfileReviewPosition } from "../application/businessProfileReviewCursor";
import type {
  BusinessProfileReviewStore,
  BusinessReviewRecord,
  BusinessReviewSummary,
} from "../application/businessProfileReviews";

function asNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asCount(value: string | number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Database returned an invalid business review count.");
  }
  return parsed;
}

function isDuplicateReviewError(error: unknown): boolean {
  let current: unknown = error;
  let code: string | undefined;
  let constraint: string | undefined;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") break;
    const candidate = current as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (!code && typeof candidate.code === "string") {
      code = candidate.code;
    }
    if (!constraint && typeof candidate.constraint === "string") {
      constraint = candidate.constraint;
    }
    current = candidate.cause;
  }
  return (
    code === "23505" &&
    constraint === "business_profile_reviews_business_reviewer_unique"
  );
}

function visibleReviewConditions(
  businessAccountId: string,
  viewerId: string | null,
) {
  const conditions = [
    eq(businessProfileReviews.businessAccountId, businessAccountId),
  ];
  if (viewerId) {
    conditions.push(
      notExists(
        db
          .select({ one: sql`1` })
          .from(accountBlocks)
          .where(
            or(
              and(
                eq(accountBlocks.blockerId, viewerId),
                eq(
                  accountBlocks.blockedId,
                  businessProfileReviews.reviewerAccountId,
                ),
              ),
              and(
                eq(
                  accountBlocks.blockerId,
                  businessProfileReviews.reviewerAccountId,
                ),
                eq(accountBlocks.blockedId, viewerId),
              ),
            ),
          ),
      ),
    );
  }
  return conditions;
}

function mapRecord(
  row: typeof businessProfileReviews.$inferSelect,
): BusinessReviewRecord {
  return {
    id: row.id,
    businessAccountId: row.businessAccountId,
    reviewerAccountId: row.reviewerAccountId,
    rating: row.rating,
    comment: row.comment,
    businessReply: row.businessReply,
    businessRepliedAt: row.businessRepliedAt,
    createdAt: row.createdAt,
  };
}

export const businessProfileReviewStore: BusinessProfileReviewStore = {
  async list(
    businessAccountId: string,
    viewerId: string | null,
    position: BusinessProfileReviewPosition | null,
    limit: number,
  ) {
    const baseConditions = visibleReviewConditions(businessAccountId, viewerId);
    const pageConditions = [...baseConditions];
    if (position) {
      pageConditions.push(
        or(
          lt(businessProfileReviews.createdAt, position.createdAt),
          and(
            eq(businessProfileReviews.createdAt, position.createdAt),
            lt(businessProfileReviews.id, position.id),
          ),
        )!,
      );
    }

    const [rows, aggregateRows, viewerReviewRows] = await Promise.all([
      db
        .select()
        .from(businessProfileReviews)
        .where(and(...pageConditions))
        .orderBy(
          desc(businessProfileReviews.createdAt),
          desc(businessProfileReviews.id),
        )
        .limit(limit + 1),
      db
        .select({
          average: sql<
            string | number | null
          >`avg(${businessProfileReviews.rating})`,
          total: sql<string | number>`count(*)`,
          one: sql<
            string | number
          >`count(*) FILTER (WHERE ${businessProfileReviews.rating} = 1)`,
          two: sql<
            string | number
          >`count(*) FILTER (WHERE ${businessProfileReviews.rating} = 2)`,
          three: sql<
            string | number
          >`count(*) FILTER (WHERE ${businessProfileReviews.rating} = 3)`,
          four: sql<
            string | number
          >`count(*) FILTER (WHERE ${businessProfileReviews.rating} = 4)`,
          five: sql<
            string | number
          >`count(*) FILTER (WHERE ${businessProfileReviews.rating} = 5)`,
        })
        .from(businessProfileReviews)
        .where(and(...baseConditions)),
      viewerId
        ? db
            .select({ id: businessProfileReviews.id })
            .from(businessProfileReviews)
            .where(
              and(
                ...baseConditions,
                eq(businessProfileReviews.reviewerAccountId, viewerId),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);
    const aggregate = aggregateRows[0];
    if (!aggregate) {
      throw new Error("Database did not return the business review aggregate.");
    }
    const pageRows = rows.slice(0, limit);
    const summary: BusinessReviewSummary = {
      averageRating: asNumber(aggregate.average),
      total: asCount(aggregate.total),
      distribution: [
        { rating: 1, count: asCount(aggregate.one) },
        { rating: 2, count: asCount(aggregate.two) },
        { rating: 3, count: asCount(aggregate.three) },
        { rating: 4, count: asCount(aggregate.four) },
        { rating: 5, count: asCount(aggregate.five) },
      ],
    };
    return {
      items: pageRows.map(mapRecord),
      summary,
      hasMore: rows.length > limit,
      viewerReviewId: viewerReviewRows[0]?.id ?? null,
    };
  },

  async create(input) {
    try {
      const [row] = await db
        .insert(businessProfileReviews)
        .values({
          businessAccountId: input.businessAccountId,
          reviewerAccountId: input.reviewerAccountId,
          rating: input.rating,
          comment: input.comment,
        })
        .returning();
      if (!row) throw new Error("Business review insert returned no row.");
      return { kind: "created", record: mapRecord(row) };
    } catch (error) {
      if (isDuplicateReviewError(error)) {
        return { kind: "already_exists" };
      }
      throw error;
    }
  },

  async deleteOwn(businessAccountId, reviewerAccountId) {
    const rows = await db
      .delete(businessProfileReviews)
      .where(
        and(
          eq(businessProfileReviews.businessAccountId, businessAccountId),
          eq(businessProfileReviews.reviewerAccountId, reviewerAccountId),
        ),
      )
      .returning({ id: businessProfileReviews.id });
    return rows.length > 0;
  },

  async reply(businessAccountId, reviewId, content) {
    const [row] = await db
      .update(businessProfileReviews)
      .set({
        businessReply: content,
        businessRepliedAt: new Date(),
      })
      .where(
        and(
          eq(businessProfileReviews.businessAccountId, businessAccountId),
          eq(businessProfileReviews.id, reviewId),
        ),
      )
      .returning();
    return row ? mapRecord(row) : null;
  },
};
