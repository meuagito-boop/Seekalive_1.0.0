/** Search treats accents and whitespace consistently across names, categories and addresses. */
export function normalizeSeekText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}
