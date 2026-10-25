import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(directory, "../contracts/src/index.ts");
const allowedGeneratedExports = new Set([
  'export * from "./generated/api";',
  'export * from "./generated/types";',
  "export * from './generated/api';",
  "export * from './generated/types';",
]);
const allowedPackageExports = new Set([
  'export * from "./auth";',
  'export * from "./social";',
  'export * from "./errorCodes";',
  'export * as GeneratedTypes from "./generated/types";',
]);
const existingLines = (await readFile(indexPath, "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const unexpectedLines = existingLines.filter(
  (line) => !allowedGeneratedExports.has(line) && !allowedPackageExports.has(line),
);

if (unexpectedLines.length > 0) {
  throw new Error(
    `Unexpected API contract barrel content; review Orval output before normalizing: ${unexpectedLines.join(" | ")}`,
  );
}

await Promise.all([
  access(path.resolve(directory, "../contracts/src/generated/api.ts")),
  access(path.resolve(directory, "../contracts/src/generated/types/index.ts")),
]);

// Orval's split Zod output appends a star export for generated/types. Those
// types can share names with Zod schema values in generated/api, so keep them
// discoverable under a namespace and fail if generator output changes.
const exports = [
  'export * from "./generated/api";',
  'export * as GeneratedTypes from "./generated/types";',
  'export * from "./auth";',
  'export * from "./social";',
  'export * from "./errorCodes";',
  "",
].join("\n");

await writeFile(indexPath, exports, "utf8");
