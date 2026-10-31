import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertApiRouteInventoryMatchesContract,
  buildApiRouteInventory,
  renderEndpointsMarkdown,
  renderRoutesGeneratedMarkdown,
} from "./api-route-inventory.mjs";
import { assertGeneratedFilesCurrent } from "./generated-files-check.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const docsDirectory = resolve(projectRoot, "docs/api/backend");
const checkOnly = process.argv.includes("--check");
const inventory = await buildApiRouteInventory();
assertApiRouteInventoryMatchesContract(inventory);

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
  await assertGeneratedFilesCurrent(outputs);
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
