import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(directory, "../contracts/src/index.ts");
const exports = [
  'export * from "./generated/api";',
  'export * as GeneratedTypes from "./generated/types";',
  'export * from "./auth";',
  'export * from "./social";',
  "",
].join("\n");

await writeFile(indexPath, exports, "utf8");
