import type { ContentReference, ReferenceType } from "@/types/content";

const REFERENCE_TYPES: ReferenceType[] = ["seek_entity", "shop_item", "social_post"];

export function isReferenceType(value: unknown): value is ReferenceType {
  return typeof value === "string" && (REFERENCE_TYPES as string[]).includes(value);
}

/** Builds a stable query string that pre-attaches a reference to the composer/editor. */
export function referenceQuery(reference: ContentReference): string {
  const params = new URLSearchParams({ refType: reference.type, refId: reference.id });
  return `?${params.toString()}`;
}

export function composePath(reference?: ContentReference): string {
  return `/compose${reference ? referenceQuery(reference) : ""}`;
}

export function articleCreatePath(reference?: ContentReference): string {
  return `/article/create${reference ? referenceQuery(reference) : ""}`;
}

/** Reads ?refType=&refId= from a search string. Invalid input yields null (never guessed). */
export function readReferenceFromSearch(search: string): ContentReference | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const type = params.get("refType");
  const id = params.get("refId")?.trim();
  if (!isReferenceType(type) || !id) return null;
  return { type, id };
}

export function postPath(post: { id: string; format?: string }): string {
  return post.format === "article" ? `/article/${post.id}` : `/post/${post.id}`;
}

export function extractHashtags(text: string): string[] {
  return [...new Set([...text.matchAll(/(^|\s)#([\p{L}\p{N}_]{2,40})/gu)].map((m) => m[2].toLowerCase()))];
}

export function extractMentions(text: string): string[] {
  return [...new Set([...text.matchAll(/(^|\s)@([A-Za-z0-9_.]{2,30})/g)].map((m) => m[2]))];
}
