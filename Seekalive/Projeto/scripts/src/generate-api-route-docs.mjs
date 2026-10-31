import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildApiRouteInventory,
  renderEndpointsMarkdown,
  renderRoutesGeneratedMarkdown,
} from "./api-route-inventory.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const docsDirectory = resolve(projectRoot, "docs/api/backend");
const checkOnly = process.argv.includes("--check");
const inventory = await buildApiRouteInventory();

if (
  inventory.diff.missingFromContract.length > 0 ||
  inventory.diff.withoutRuntimeRoute.length > 0 ||
  inventory.diff.duplicateRuntimeRoutes.length > 0 ||
  inventory.diff.csrfContractMismatches.length > 0
) {
  throw new Error(
    `OpenAPI route mismatch: ${JSON.stringify(inventory.diff, null, 2)}`,
  );
}

const outputs = [
  {
    path: resolve(docsDirectory, "routes.generated.md"),
    content: renderRoutesGeneratedMarkdown(inventory),
  },
  {
    path: resolve(docsDirectory, "endpoints.md"),
    content: renderEndpointsMarkdown(inventory),
  },
];

if (checkOnly) {
  for (const output of outputs) {
    const current = await readFile(output.path, "utf8");
    if (current !== output.content) {
      throw new Error(
        `Generated API documentation is stale: ${output.path}. Run docs:api-routes.`,
      );
    }
  }
} else {
  await Promise.all(
    outputs.map(({ path, content }) => writeFile(path, content)),
  );
}

console.log(
  JSON.stringify(
    {
      mode: checkOnly ? "check" : "generate",
      routes: inventory.routes.length,
      outputFiles: [
        "docs/api/backend/routes.generated.md",
        "docs/api/backend/endpoints.md",
      ],
    },
    null,
    2,
  ),
);
