import { readdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "../../../..");
const backendRoot = path.join(projectRoot, "Aplicativo/back/src/modules");
const typescript = createRequire(
  new URL("../../../../package.json", import.meta.url),
)("typescript");
const methods = new Set(["post", "put", "patch", "delete"]);
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(entryPath);
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(entryPath);
  }
}

await collect(backendRoot);
const routes = [];
for (const filename of files.sort()) {
  if (!filename.includes(`${path.sep}presentation${path.sep}`)) continue;
  const sourceText = await (await import("node:fs/promises")).readFile(
    filename,
    "utf8",
  );
  const source = typescript.createSourceFile(
    filename,
    sourceText,
    typescript.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (
      typescript.isCallExpression(node) &&
      typescript.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text.toLowerCase();
      if (methods.has(method)) {
        const firstArgument = node.arguments[0];
        const routePath =
          firstArgument && typescript.isStringLiteral(firstArgument)
            ? firstArgument.text
            : "<path not a string literal>";
        const usesCsrf = node.arguments.some((argument) =>
          argument.getText(source).includes("requireCsrf"),
        );
        const position = source.getLineAndCharacterOfPosition(
          node.getStart(source),
        );
        routes.push({
          file: path.relative(projectRoot, filename),
          line: position.line + 1,
          method: method.toUpperCase(),
          path: routePath,
          requireCsrf: usesCsrf,
        });
      }
    }
    typescript.forEachChild(node, visit);
  }
  visit(source);
}

console.log(JSON.stringify({ mutationRouteCount: routes.length, routes }));
