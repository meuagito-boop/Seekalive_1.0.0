import { readFile } from "node:fs/promises";

export async function assertGeneratedFilesCurrent(outputs) {
  for (const output of outputs) {
    let current;
    try {
      current = await readFile(output.path, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    if (current !== output.content) {
      throw new Error(
        `Generated API documentation is stale: ${output.path}. Run docs:api-routes.`,
      );
    }
  }
}
