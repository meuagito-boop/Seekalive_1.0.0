export function normalizeSocialSearchQuery(query: string) {
  return query.trim().replace(/^@/, "");
}
