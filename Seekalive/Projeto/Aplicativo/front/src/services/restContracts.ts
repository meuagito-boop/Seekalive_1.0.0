import { z } from "zod";
import { apiRequest, commentSchema, parseResponse, postSchema } from "./contentService";
import { referenceSchema } from "./contentValidation";
import type { ContentReference } from "@/types/social/contentReferences";

// Proposed contracts ONLY. Nothing here is enabled until a backend is supplied.
export interface Page<T> { items: T[]; nextCursor?: string | null }
const referencePreviewSchema = referenceSchema.extend({
  title: z.string(), imageUrl: z.string().optional(), subtitle: z.string().optional(),
  status: z.string().optional(), distanceLabel: z.string().optional(),
  rating: z.number().optional(), ratingCount: z.number().optional(),
  price: z.string().optional(), targetPath: z.string(),
  authorName: z.string().optional(), authorAvatarUrl: z.string().optional(), entityLabel: z.string().optional(),
});
const page = <T extends z.ZodType>(schema: T) => z.object({ items: z.array(schema), nextCursor: z.string().nullable().optional() });
const idPath = (id: string) => `/api/v1/social/posts/${encodeURIComponent(id)}`;
export const restSocialApi = {
  async feed(cursor?: string, tab = "for-you", limit = 20) {
    const query = new URLSearchParams({ tab, limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    return parseResponse(page(postSchema), await apiRequest(`/api/v1/social/feed?${query}`));
  },
  async post(id: string) { return parseResponse(postSchema, await apiRequest(idPath(id))); },
  async article(id: string) { return parseResponse(postSchema, await apiRequest(`/api/v1/social/articles/${encodeURIComponent(id)}`)); },
  async setLiked(id: string, liked: boolean) {
    return apiRequest(`${idPath(id)}/like`, { method: liked ? "PUT" : "DELETE" });
  },
  async comments(id: string, cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return parseResponse(page(commentSchema), await apiRequest(`${idPath(id)}/comments${query}`));
  },
  async setReposted(id: string, reposted: boolean) {
    return apiRequest(`${idPath(id)}/repost`, { method: reposted ? "POST" : "DELETE" });
  },
  async removePost(id: string) { return apiRequest(idPath(id), { method: "DELETE" }); },
  async removeComment(id: string) { return apiRequest(`/api/v1/social/comments/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async reference(reference: ContentReference) {
    referenceSchema.parse(reference);
    return parseResponse(referencePreviewSchema, await apiRequest(`/api/v1/references/${reference.type}/${encodeURIComponent(reference.id)}`));
  },
  async searchUsers(query: string, signal?: AbortSignal) {
    return parseResponse(z.array(z.object({ id: z.string(), username: z.string(), displayName: z.string(), avatarUrl: z.string().optional() })),
      await apiRequest(`/api/v1/social/users/search?q=${encodeURIComponent(query)}`, { signal }));
  },
  async searchTags(query: string, signal?: AbortSignal) {
    return parseResponse(z.array(z.string()), await apiRequest(`/api/v1/social/tags/search?q=${encodeURIComponent(query)}`, { signal }));
  },
};
