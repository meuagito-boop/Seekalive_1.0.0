export const MAX_HASHTAGS_PER_POST = 10;
export const HASHTAG_LIMIT_MESSAGE = `A publicação pode conter no máximo ${MAX_HASHTAGS_PER_POST} hashtags diferentes.`;

const hashtagPattern = /(^|\s)#([\p{L}\p{N}_]{2,40})/gu;

export function normalizeHashtag(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function normalizeHashtagPrefix(value: string): string | null {
  const candidate = value.trim().replace(/^#/, "");
  if (!/^[\p{L}\p{N}_]{2,40}$/u.test(candidate)) return null;
  return normalizeHashtag(candidate);
}

export function extractPostHashtags(
  ...fields: Array<string | null | undefined>
): string[] {
  const text = fields
    .filter((field): field is string => Boolean(field))
    .join("\n");
  const uniqueTags = new Map<string, string>();

  for (const match of text.matchAll(hashtagPattern)) {
    const displayTag = match[2].toLocaleLowerCase("pt-BR");
    const normalizedTag = normalizeHashtag(displayTag);
    if (!uniqueTags.has(normalizedTag)) {
      uniqueTags.set(normalizedTag, displayTag);
    }
  }

  return [...uniqueTags.values()];
}

export function countPostHashtags(
  ...fields: Array<string | null | undefined>
): number {
  return extractPostHashtags(...fields).length;
}
