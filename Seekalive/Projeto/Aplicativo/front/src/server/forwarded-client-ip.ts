import { isIP } from "node:net";

export function extractForwardedClientIp(
  value: string | string[] | undefined,
): string | null {
  const values = (Array.isArray(value) ? value.join(",") : value ?? "").split(",");

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const candidate = values[index]?.trim();
    if (candidate && isIP(candidate)) return candidate;
  }

  return null;
}
