export function priceLevelLabel(level?: number) {
  return level ? "$".repeat(level) : "";
}
