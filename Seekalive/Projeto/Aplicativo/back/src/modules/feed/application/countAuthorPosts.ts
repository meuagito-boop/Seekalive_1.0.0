import { countFeedPostsByAuthorIds } from "../infrastructure/postRepository";
import { mapAuthorPostCounts } from "./postCountMapping";

export async function countAllPostsByAuthorIds(authorIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(authorIds)];
  if (ids.length === 0) return new Map();

  const rows = await countFeedPostsByAuthorIds(ids);
  return mapAuthorPostCounts(ids, rows);
}
