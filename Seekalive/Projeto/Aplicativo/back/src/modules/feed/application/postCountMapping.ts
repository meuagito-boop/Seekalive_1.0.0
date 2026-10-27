export type AuthorPostCountRow = {
  authorId: string;
  total: number;
};

export function mapAuthorPostCounts(
  authorIds: string[],
  rows: AuthorPostCountRow[],
): Map<string, number> {
  const counts = new Map([...new Set(authorIds)].map((id) => [id, 0]));
  for (const row of rows) {
    if (counts.has(row.authorId)) counts.set(row.authorId, row.total);
  }
  return counts;
}
