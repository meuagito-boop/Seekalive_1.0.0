import { z } from "zod";
import {
  apiRequest,
  commentSchema,
  parseComment,
  parseResponse,
  parsePost,
  postSchema,
} from "@/modules/social/services/socialHttp";
import { referenceSchema } from "@/modules/app/content/referenceSchema";
import type { ContentReference } from "@/modules/app/content/contentReferences";
import {
  accountViewToUser,
} from "@/modules/social/services/socialGraphApi";
import type { AccountView } from "@workspace/api-client-react";

// REST adapter for feed and post flows that are backed by the API.
export interface Page<T> {
  items: T[];
  nextCursor?: string | null;
}

const referencePreviewSchema = referenceSchema.extend({
  title: z.string(),
  imageUrl: z.string().optional(),
  subtitle: z.string().optional(),
  status: z.string().optional(),
  distanceLabel: z.string().optional(),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
  price: z.string().optional(),
  targetPath: z.string(),
  authorName: z.string().optional(),
  authorAvatarUrl: z.string().optional(),
  entityLabel: z.string().optional(),
});
const page = <T extends z.ZodType>(schema: T) =>
  z.object({
    items: z.array(schema),
    nextCursor: z.string().nullable(),
  });
const idPath = (id: string) => `/api/v1/social/posts/${encodeURIComponent(id)}`;
const relationshipSchema = z.object({
  following: z.enum(["none", "pending", "accepted"]),
  inCircle: z.boolean(),
  blockedByMe: z.boolean(),
  blockedByThem: z.boolean(),
  mutedByMe: z.boolean(),
});
const accountViewSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  bio: z.string(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  accountType: z.enum(["personal", "commercial"]),
  isPrivate: z.boolean(),
  joinedAt: z.string(),
  relationship: relationshipSchema,
  stats: z.object({
    posts: z.number().nonnegative(),
    followers: z.number().nonnegative(),
    following: z.number().nonnegative(),
    circles: z.number().nonnegative(),
  }),
  version: z.number().int().positive(),
});

export const restSocialApi = {
  async feed(
    cursor?: string,
    tab: "for-you" | "following" | "articles" = "for-you",
    limit = 20,
  ) {
    const query = new URLSearchParams({ tab, limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    const result = parseResponse(
      page(z.object({ post: postSchema, author: accountViewSchema })),
      await apiRequest(`/api/v1/social/feed?${query}`),
    );
    return {
      nextCursor: result.nextCursor,
      items: result.items.map(({ post }) => parsePost(post)),
      authors: result.items.map(({ author }) =>
        accountViewToUser(author as AccountView),
      ),
    };
  },
  async post(id: string) {
    return parsePost(await apiRequest(idPath(id)));
  },
  async article(id: string) {
    return parsePost(await apiRequest(`/api/v1/social/articles/${encodeURIComponent(id)}`));
  },
  async setLiked(id: string, liked: boolean) {
    return parsePost(await apiRequest(`${idPath(id)}/like`, {
      method: liked ? "PUT" : "DELETE",
    }));
  },
  async comments(id: string, cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const result = parseResponse(
      page(commentSchema),
      await apiRequest(`${idPath(id)}/comments${query}`),
    );
    return { ...result, items: result.items.map(parseComment) };
  },
  async setReposted(id: string, reposted: boolean) {
    return parsePost(await apiRequest(`${idPath(id)}/repost`, {
      method: reposted ? "POST" : "DELETE",
    }));
  },
  async setBookmarked(id: string, bookmarked: boolean) {
    return parsePost(await apiRequest(`${idPath(id)}/bookmark`, {
      method: bookmarked ? "PUT" : "DELETE",
    }));
  },
  async setCommentLiked(id: string, liked: boolean) {
    return parseComment(await apiRequest(
      `/api/v1/social/comments/${encodeURIComponent(id)}/like`,
      { method: liked ? "PUT" : "DELETE" },
    ));
  },
  async profilePosts(accountId: string, cursor?: string, limit = 20) {
    const query = new URLSearchParams({ format: "all", limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    const result = parseResponse(
      page(postSchema),
      await apiRequest(`/api/v1/social/accounts/${encodeURIComponent(accountId)}/posts?${query}`),
    );
    return { ...result, items: result.items.map(parsePost) };
  },
  async removePost(id: string) {
    return apiRequest(idPath(id), { method: "DELETE" });
  },
  async removeComment(id: string) {
    return apiRequest(`/api/v1/social/comments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  async reference(reference: ContentReference) {
    referenceSchema.parse(reference);
    return parseResponse(
      referencePreviewSchema,
      await apiRequest(
        `/api/v1/references/${reference.type}/${encodeURIComponent(reference.id)}`,
      ),
    );
  },
  async searchUsers(query: string, signal?: AbortSignal) {
    return parseResponse(
      z.array(
        z.object({
          id: z.string(),
          username: z.string(),
          displayName: z.string(),
          avatarUrl: z.string().optional(),
        }),
      ),
      await apiRequest(
        `/api/v1/social/users/search?q=${encodeURIComponent(query)}`,
        { signal },
      ),
    );
  },
  async searchTags(query: string, signal?: AbortSignal) {
    return parseResponse(
      z.array(z.string()),
      await apiRequest(
        `/api/v1/social/tags/search?q=${encodeURIComponent(query)}`,
        { signal },
      ),
    );
  },
};
