import type { AuthorPostCountRow } from "./postCountMapping";
import { mapAuthorPostCounts } from "./postCountMapping";

export type CountPostRows = (authorIds: string[]) => Promise<AuthorPostCountRow[]>;

export function createCountAllPostsByAuthorIds(countRows: CountPostRows) {
  return async (authorIds: string[]): Promise<Map<string, number>> => {
    const ids = [...new Set(authorIds)];
    if (ids.length === 0) return new Map();

    const rows = await countRows(ids);
    return mapAuthorPostCounts(ids, rows);
  };
}
