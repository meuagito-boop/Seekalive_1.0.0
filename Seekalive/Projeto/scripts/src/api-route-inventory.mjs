import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { parseDocument } from "yaml";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const backendRoot = resolve(projectRoot, "Aplicativo/back");
const appEntry = resolve(backendRoot, "src/app.ts");
const apiSpecPath = resolve(projectRoot, "shared/api-spec/openapi.yaml");
const expressRequire = createRequire(resolve(backendRoot, "package.json"));

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
];
const EXPRESS_ROUTE_METHODS = [...HTTP_METHODS, "all"];

function isPathArgument(value) {
  if (typeof value === "string" || value instanceof RegExp) return true;
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) => typeof item === "string" || item instanceof RegExp,
    )
  );
}

function flatten(values) {
  return values.flat(Infinity);
}

function pathVariants(value, context) {
  const candidates = Array.isArray(value) ? value.flat(Infinity) : [value];
  return candidates.map((candidate) => {
    if (typeof candidate !== "string") {
      throw new Error(
        `Cannot map Express ${context} path ${String(candidate)} to OpenAPI.`,
      );
    }
    return candidate;
  });
}

function joinRoutePath(prefix, segment) {
  const left = prefix.replace(/\/+$/, "");
  const right = segment.replace(/^\/+/, "");
  const joined = `${left}/${right}`.replace(/\/{2,}/g, "/");
  return joined || "/";
}

function expressPathToOpenApi(path) {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function normalizeBasePath(value) {
  const pathname = new URL(value, "http://seekalive.invalid").pathname;
  return pathname === "/" ? "" : pathname.replace(/\/+$/, "");
}

function relativeOpenApiPath(runtimePath, basePath) {
  if (!basePath) return runtimePath;
  if (runtimePath !== basePath && !runtimePath.startsWith(`${basePath}/`)) {
    throw new Error(
      `Mounted API route ${runtimePath} is outside OpenAPI server base ${basePath}.`,
    );
  }
  return runtimePath.slice(basePath.length) || "/";
}

function localReference(document, reference) {
  if (typeof reference !== "string" || !reference.startsWith("#/")) {
    throw new Error(`Unsupported OpenAPI reference: ${String(reference)}`);
  }

  return reference
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, key) => {
      if (!value || typeof value !== "object" || !(key in value)) {
        throw new Error(`Unresolved OpenAPI reference: ${reference}`);
      }
      return value[key];
    }, document);
}

function resolveReference(document, value) {
  if (value && typeof value === "object" && "$ref" in value) {
    return localReference(document, value.$ref);
  }
  return value;
}

function schemaLabel(document, rawSchema) {
  if (!rawSchema) return "sem schema";
  if (rawSchema.$ref) return rawSchema.$ref.split("/").at(-1);

  const schema = resolveReference(document, rawSchema);
  if (schema.oneOf) return `oneOf(${schema.oneOf.map((item) => schemaLabel(document, item)).join("|")})`;
  if (schema.anyOf) return `anyOf(${schema.anyOf.map((item) => schemaLabel(document, item)).join("|")})`;
  if (schema.allOf) return `allOf(${schema.allOf.map((item) => schemaLabel(document, item)).join("&")})`;
  if (schema.type === "array") return `array<${schemaLabel(document, schema.items)}>`;
  if (schema.type === "object" || schema.properties) {
    const properties = Object.keys(schema.properties ?? {});
    return properties.length
      ? `objeto inline {${properties.slice(0, 8).join(", ")}${properties.length > 8 ? ", …" : ""}}`
      : "objeto inline";
  }
  if (schema.type) {
    const type = Array.isArray(schema.type) ? schema.type.join("|") : schema.type;
    return schema.format ? `${type} (${schema.format})` : type;
  }
  return "schema inline";
}

function parameterLabels(document, pathItem, operation) {
  const parameters = [
    ...(pathItem.parameters ?? []),
    ...(operation.parameters ?? []),
  ].map((parameter) => resolveReference(document, parameter));

  return parameters.map((parameter) => {
    const rawSchema = parameter.schema ?? {};
    const schema = resolveReference(document, rawSchema);
    const bounds = [
      schema.minimum !== undefined ? `min ${schema.minimum}` : null,
      schema.maximum !== undefined ? `max ${schema.maximum}` : null,
      schema.minLength !== undefined ? `mín. ${schema.minLength}` : null,
      schema.maxLength !== undefined ? `máx. ${schema.maxLength}` : null,
    ].filter(Boolean);
    const required = parameter.required ? " obrigatório" : "";
    const details = [schemaLabel(document, rawSchema), ...bounds].join(", ");
    return `${parameter.name} (${parameter.in}${required}; ${details})`;
  });
}

function requestLabels(document, operation) {
  const body = resolveReference(document, operation.requestBody);
  if (!body) return [];

  return Object.entries(body.content ?? {}).map(([contentType, content]) => {
    return `${contentType}: ${schemaLabel(document, content.schema ?? {})}`;
  });
}

function responseLabels(document, operation) {
  return Object.entries(operation.responses ?? {})
    .filter(([status]) => status.startsWith("2"))
    .map(([status, rawResponse]) => {
      const response = resolveReference(document, rawResponse);
      const content = Object.entries(response.content ?? {}).map(
        ([contentType, media]) => {
          return `${contentType}: ${schemaLabel(document, media.schema ?? {})}`;
        },
      );
      return `${status}${content.length ? ` (${content.join("; ")})` : " (sem corpo)"}`;
    });
}

function securityLabel(operation, document) {
  const requirements = operation.security ?? document.security ?? [];
  if (requirements.length === 0) return "Não declarado";

  const alternatives = requirements.map((requirement) => {
    const names = Object.keys(requirement);
    if (names.length === 0) return "visitante";
    return names
      .map((name) => document.components?.securitySchemes?.[name]?.name ?? name)
      .join(" + ");
  });
  return alternatives.join(" ou ");
}

function securityDeclaresScheme(operation, schemeName) {
  return (operation.security ?? []).some((requirement) =>
    Object.hasOwn(requirement, schemeName),
  );
}

function operationInventory(document) {
  const operations = new Map();
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      operations.set(`${method.toUpperCase()} ${path}`, {
        method: method.toUpperCase(),
        path,
        operation,
        pathItem,
        auth: securityLabel(operation, document),
        input: [
          ...parameterLabels(document, pathItem, operation),
          ...requestLabels(document, operation),
        ],
        output: responseLabels(document, operation),
        statuses: Object.keys(operation.responses ?? {}).sort(),
      });
    }
  }
  return operations;
}

export async function readOpenApiDocument() {
  const source = await readFile(apiSpecPath, "utf8");
  const parsed = parseDocument(source, { uniqueKeys: true });
  if (parsed.errors.length > 0) {
    throw new AggregateError(parsed.errors, `Invalid OpenAPI YAML: ${apiSpecPath}`);
  }
  const document = parsed.toJS();
  assert.equal(document.openapi, "3.1.0");
  return document;
}

export async function captureMountedExpressRoutes() {
  process.env.SESSION_SECRET ??= "route-inventory-test-session-secret-32-bytes";
  process.env.DATABASE_URL ??=
    "postgresql://route_inventory:route_inventory@127.0.0.1:1/route_inventory";

  const express = expressRequire("express");
  const originalRouterFactory = express.Router;
  const originalApplicationUse = express.application.use;
  const routerIds = new WeakMap();
  const registrations = [];
  let nextRouterId = 1;

  function instrumentRoute(route, owner, path) {
    for (const method of EXPRESS_ROUTE_METHODS) {
      const original = route[method];
      if (typeof original !== "function") continue;
      route[method] = function (...handlers) {
        registrations.push({
          owner,
          method,
          path,
          handlers: flatten(handlers).filter(
            (handler) => typeof handler === "function",
          ),
        });
        return original.apply(this, handlers);
      };
    }
    return route;
  }

  function instrumentRouter(router) {
    const existingId = routerIds.get(router);
    if (existingId) return router;

    const owner = nextRouterId++;
    routerIds.set(router, owner);

    const originalRoute = router.route;
    router.route = function (...args) {
      const [path] = args;
      const route = originalRoute.apply(this, args);
      return instrumentRoute(route, owner, path);
    };

    const originalUse = router.use;
    router.use = function (...args) {
      const hasPath = isPathArgument(args[0]);
      const path = hasPath ? args[0] : "";
      const handlers = hasPath ? args.slice(1) : args;
      registrations.push({
        owner,
        method: "use",
        path,
        children: flatten(handlers)
          .filter((handler) => typeof handler === "function")
          .map((handler) => routerIds.get(handler))
          .filter((id) => id !== undefined),
      });
      return originalUse.apply(this, args);
    };

    return router;
  }

  express.Router = (...args) =>
    instrumentRouter(originalRouterFactory(...args));
  express.application.use = function (...args) {
    const hasPath = isPathArgument(args[0]);
    const path = hasPath ? args[0] : "";
    const handlers = hasPath ? args.slice(1) : args;
    registrations.push({
      owner: 0,
      method: "use",
      path,
      children: flatten(handlers)
        .filter((handler) => typeof handler === "function")
        .map((handler) => routerIds.get(handler))
        .filter((id) => id !== undefined),
    });
    return originalApplicationUse.apply(this, args);
  };

  try {
    await import(pathToFileURL(appEntry).href);
  } finally {
    express.Router = originalRouterFactory;
    express.application.use = originalApplicationUse;
  }

  const routes = [];
  function walk(owner, prefix, ancestors) {
    if (ancestors.has(owner)) {
      throw new Error(`Express router mount cycle detected at router ${owner}.`);
    }
    const nextAncestors = new Set(ancestors).add(owner);
    for (const registration of registrations.filter(
      (item) => item.owner === owner,
    )) {
      if (registration.method === "use") {
        const mounts = pathVariants(registration.path, "mount");
        for (const child of registration.children ?? []) {
          for (const mount of mounts) {
            walk(child, joinRoutePath(prefix, mount), nextAncestors);
          }
        }
        continue;
      }

      const paths = pathVariants(registration.path, "route");
      for (const path of paths) {
        const handlers = registration.handlers ?? [];
        const rateLimits = handlers
          .map((handler) => handler.rateLimitMetadata)
          .filter(Boolean);
        routes.push({
          method: registration.method.toUpperCase(),
          path: joinRoutePath(prefix, path),
          csrf: handlers.some((handler) => handler.name === "requireCsrf"),
          rateLimits,
        });
      }
    }
  }

  for (const registration of registrations.filter(
    (item) => item.owner === 0 && item.method === "use",
  )) {
    for (const mount of pathVariants(registration.path, "application mount")) {
      for (const child of registration.children ?? []) {
        walk(child, mount, new Set());
      }
    }
  }

  return routes;
}

export async function buildApiRouteInventory() {
  const document = await readOpenApiDocument();
  const server = document.servers?.[0]?.url ?? "/";
  const basePath = normalizeBasePath(server);
  const runtimeRoutes = await captureMountedExpressRoutes();
  const operations = operationInventory(document);

  const routes = runtimeRoutes.map((route) => {
    const path = expressPathToOpenApi(
      relativeOpenApiPath(route.path, basePath),
    );
    const key = `${route.method} ${path}`;
    const contract = operations.get(key);
    return {
      ...route,
      path,
      key,
      contract,
    };
  });

  const runtimeKeys = routes.map((route) => route.key);
  const runtimeUnique = new Set(runtimeKeys);
  const contractKeys = [...operations.keys()];
  const contractUnique = new Set(contractKeys);
  const diff = {
    duplicateRuntimeRoutes: runtimeKeys.filter(
      (key, index) => runtimeKeys.indexOf(key) !== index,
    ),
    missingFromContract: [...runtimeUnique]
      .filter((key) => !contractUnique.has(key))
      .sort(),
    withoutRuntimeRoute: [...contractUnique]
      .filter((key) => !runtimeUnique.has(key))
      .sort(),
    csrfContractMismatches: routes
      .filter(
        (route) =>
          route.contract &&
          route.csrf !==
            securityDeclaresScheme(route.contract.operation, "csrfToken"),
      )
      .map((route) => ({
        route: route.key,
        csrfRegistered: route.csrf,
        csrfDeclared: securityDeclaresScheme(
          route.contract.operation,
          "csrfToken",
        ),
      }))
      .sort((left, right) => left.route.localeCompare(right.route)),
  };

  return {
    routes: routes.sort((left, right) => left.key.localeCompare(right.key)),
    operations,
    diff,
  };
}

function markdownCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function routeRateLimitLabel(rateLimits) {
  if (rateLimits.length === 0) return "Nenhum limitador de rota registrado";
  return rateLimits
    .map(({ name, maxRequests, windowMs }) => `${name}: ${maxRequests}/${windowMs / 1000}s`)
    .join("; ");
}

export function renderRoutesGeneratedMarkdown(inventory) {
  const lines = [
    "# Rotas Express montadas — inventário gerado",
    "",
    "> Fonte: chamadas de registro efetivamente executadas ao importar `Aplicativo/back/src/app.ts`, interceptadas pelos métodos públicos `Express.Router`, `Router.route`, `Router.use` e `Application.use`. O inventário não consulta propriedades internas do Express. A autenticação, schemas e DTOs abaixo são declarações OpenAPI; CSRF e rate limit são extraídos dos handlers realmente registrados.",
    "",
    `Operações montadas: **${inventory.routes.length}**. Divergências com OpenAPI: **${inventory.diff.missingFromContract.length + inventory.diff.withoutRuntimeRoute.length + inventory.diff.duplicateRuntimeRoutes.length + inventory.diff.csrfContractMismatches.length}**.`,
    "",
    "| Método | Caminho | Autenticação declarada | CSRF registrado | Rate limit registrado | Entrada OpenAPI | DTO/resposta OpenAPI | HTTP de resposta |",
    "|---|---|---|---|---|---|---|---|",
  ];

  for (const route of inventory.routes) {
    const contract = route.contract;
    lines.push(
      `| ${route.method} | \`${route.path}\` | ${markdownCell(contract?.auth ?? "SEM CONTRATO")} | ${route.csrf ? "Sim" : "Não"} | ${markdownCell(routeRateLimitLabel(route.rateLimits))} | ${markdownCell(contract?.input.join("; ") || "—")} | ${markdownCell(contract?.output.join("; ") || "—")} | ${markdownCell(contract?.statuses.join(", ") || "—")} |`,
    );
  }
  lines.push(
    "",
    "Este arquivo comprova o registro das rotas e documenta o contrato declarado. Não comprova a execução de cada handler, autorização em banco, persistência ou comportamento HTTP; essas evidências pertencem aos testes correspondentes.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

export function renderEndpointsMarkdown(inventory) {
  const lines = [
    "# Endpoints da API",
    "",
    "Este inventário é gerado a partir do grafo de routers Express realmente montado e comparado com `shared/api-spec/openapi.yaml`. `ATIVA EM CÓDIGO` significa que o método HTTP foi registrado na aplicação; não afirma que todos os fluxos foram exercitados ou que há implantação em produção.",
    "",
    `Rotas montadas: **${inventory.routes.length}**. Rotas sem contrato: **${inventory.diff.missingFromContract.length}**. Contratos sem rota montada: **${inventory.diff.withoutRuntimeRoute.length}**. Divergências de CSRF: **${inventory.diff.csrfContractMismatches.length}**.`,
    "",
    "| Método | Endpoint | Acesso declarado | Entrada | Saída | Estado |",
    "|---|---|---|---|---|---|",
  ];

  for (const route of inventory.routes) {
    const contract = route.contract;
    lines.push(
      `| ${route.method} | \`${route.path}\` | ${markdownCell(contract?.auth ?? "SEM CONTRATO")} | ${markdownCell(contract?.input.join("; ") || "—")} | ${markdownCell(contract?.output.join("; ") || "—")} | ${contract ? "ATIVA EM CÓDIGO" : "SEM CONTRATO"} |`,
    );
  }
  lines.push(
    "",
    "O teste `pnpm --filter @workspace/scripts run test:api-route-contract` falha se houver método/caminho registrado sem operação OpenAPI, operação OpenAPI sem registro Express, registro duplicado ou diferença entre middleware CSRF e declaração `csrfToken`.",
    "",
  );
  return `${lines.join("\n")}\n`;
}
