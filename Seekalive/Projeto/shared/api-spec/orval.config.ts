import { defineConfig, InputTransformerFn } from "orval";
import path from "path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(configDirectory, "..", "..");
const apiClientReactSrc = path.resolve(
  root,
  "shared",
  "api-client-react",
  "src",
);
const apiZodSrc = path.resolve(root, "shared", "contracts", "src");

/**
 * The API spec is versioned locally. Reject remote and file-based references
 * before Orval processes them so code generation cannot fetch arbitrary input.
 */
export function assertLocalReferences(value: unknown, location = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertLocalReferences(item, `${location}[${index}]`),
    );
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "$ref") {
      if (typeof nestedValue !== "string" || !nestedValue.startsWith("#/")) {
        throw new Error(
          `External or non-pointer OpenAPI $ref is not allowed at ${location}.`,
        );
      }
    }

    assertLocalReferences(nestedValue, `${location}.${key}`);
  }
}

// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer: InputTransformerFn = (config) => {
  assertLocalReferences(config);
  const existingInfo = config.info;
  config.info = {
    ...(existingInfo ?? {}),
    title: "Api",
    version: existingInfo?.version ?? "0.0.0",
  };

  return config;
};

export default defineConfig({
  "api-client-react": {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiClientReactSrc,
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      override: {
        query: {
          version: 5,
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiZodSrc,
      client: "zod",
      target: "generated",
      schemas: { path: "generated/types", type: "typescript" },
      mode: "split",
      clean: true,
      override: {
        zod: {
          coerce: {
            query: ['boolean', 'number', 'string'],
            param: ['boolean', 'number', 'string'],
            body: ['bigint', 'date'],
            response: ['bigint', 'date'],
          },
        },
        useDates: true,
        useBigInt: true,
      },
    },
  },
});
