import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { isIP } from "node:net";

const requireFromProject = createRequire(new URL("../../../../package.json", import.meta.url));
const typescript = requireFromProject("typescript");
const source = readFileSync(
  new URL("../../../../Aplicativo/back/src/security/trustedClientIp.ts", import.meta.url),
  "utf8",
);
const compiled = typescript.transpileModule(source, {
  compilerOptions: {
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
const sandbox = {
  module,
  exports: module.exports,
  require(specifier) {
    if (specifier === "node:net") return { isIP };
    if (specifier === "../common/apiErrors") return { sendApiError() {} };
    throw new Error(`Unexpected import in trusted-client-IP module: ${specifier}`);
  },
};
vm.runInNewContext(compiled, sandbox, { filename: "trustedClientIp.ts" });
const { getTrustedClientIp } = module.exports;

const cases = [
  {
    name: "trusted loopback proxy with a valid private header",
    remoteAddress: "127.0.0.1",
    headers: { "x-seekalive-client-ip": "203.0.113.42", "x-forwarded-for": "198.51.100.24" },
    expected: "203.0.113.42",
  },
  {
    name: "loopback proxy with only spoofable forwarded-for header",
    remoteAddress: "::1",
    headers: { "x-forwarded-for": "203.0.113.42" },
    expected: null,
  },
  {
    name: "non-loopback peer cannot supply trusted client header",
    remoteAddress: "198.51.100.24",
    headers: { "x-seekalive-client-ip": "203.0.113.42" },
    expected: null,
  },
  {
    name: "malformed trusted header is rejected",
    remoteAddress: "::ffff:127.0.0.1",
    headers: { "x-seekalive-client-ip": "not-an-ip" },
    expected: null,
  },
  {
    name: "loopback proxy without client header returns no trusted IP",
    remoteAddress: "127.0.0.1",
    headers: {},
    expected: null,
  },
];

for (const testCase of cases) {
  const request = {
    socket: { remoteAddress: testCase.remoteAddress },
    get: (name) => testCase.headers[name.toLowerCase()],
  };
  const actual = getTrustedClientIp(request);
  assert.equal(actual, testCase.expected, testCase.name);
  console.log(`PASS ${testCase.name}`);
}

const forwardedSource = readFileSync(
  new URL("../../../../Aplicativo/front/src/server/forwarded-client-ip.ts", import.meta.url),
  "utf8",
);
const forwardedCompiled = typescript.transpileModule(forwardedSource, {
  compilerOptions: {
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText;
const forwardedModule = { exports: {} };
vm.runInNewContext(
  forwardedCompiled,
  {
    module: forwardedModule,
    exports: forwardedModule.exports,
    require(specifier) {
      if (specifier === "node:net") return { isIP };
      throw new Error(`Unexpected import in forwarded-client-IP module: ${specifier}`);
    },
  },
  { filename: "forwarded-client-ip.ts" },
);
const { extractForwardedClientIp } = forwardedModule.exports;
const forwardedCases = [
  { name: "single forwarded address", input: "203.0.113.42", expected: "203.0.113.42" },
  { name: "chain selects rightmost valid address", input: "203.0.113.42, 198.51.100.24", expected: "198.51.100.24" },
  { name: "invalid entries are skipped", input: "not-an-ip, 203.0.113.42", expected: "203.0.113.42" },
  { name: "missing forwarded header", input: undefined, expected: null },
];

for (const testCase of forwardedCases) {
  assert.equal(extractForwardedClientIp(testCase.input), testCase.expected, testCase.name);
  console.log(`PASS ${testCase.name}`);
}

const matrixRows = [];
const forwardedChains = [
  ["1 salto", "203.0.113.42"],
  ["2 saltos", "203.0.113.42, 198.51.100.24"],
  ["3 saltos", "203.0.113.42, 198.51.100.24, 192.0.2.10"],
];
function syntheticRequest(remoteAddress, internalIp, forwardedFor) {
  const headers = {};
  if (internalIp !== undefined) headers["x-seekalive-client-ip"] = internalIp;
  if (forwardedFor !== undefined) headers["x-forwarded-for"] = forwardedFor;
  return {
    socket: { remoteAddress },
    ip: remoteAddress,
    get(name) {
      return headers[name.toLowerCase()];
    },
  };
}
function recordMatrixCase(name, request, expectedBucket) {
  const bucket =
    getTrustedClientIp(request) ?? request.ip ?? "unknown";
  assert.equal(bucket, expectedBucket, name);
  matrixRows.push({ scenario: name, bucket });
}

for (const [hopCount, chain] of forwardedChains) {
  recordMatrixCase(
    `API loopback; no internal header; XFF ${hopCount} ignored`,
    syntheticRequest("127.0.0.1", undefined, chain),
    "127.0.0.1",
  );
  recordMatrixCase(
    `API loopback; trusted internal header; XFF ${hopCount} ignored`,
    syntheticRequest("127.0.0.1", "203.0.113.77", chain),
    "203.0.113.77",
  );
  recordMatrixCase(
    `API external peer; forged internal header; XFF ${hopCount} ignored`,
    syntheticRequest("192.0.2.20", "203.0.113.77", chain),
    "192.0.2.20",
  );

  const internalIp = extractForwardedClientIp(chain);
  recordMatrixCase(
    `Vite loopback proxy; XFF ${hopCount} becomes internal header`,
    syntheticRequest("127.0.0.1", internalIp ?? undefined, chain),
    internalIp ?? "127.0.0.1",
  );
}

const forgedForwardedFor = "198.51.100.99";
const forgedInternalIp = extractForwardedClientIp(forgedForwardedFor);
recordMatrixCase(
  "Vite loopback proxy; client-forged single XFF if not rewritten upstream",
  syntheticRequest("127.0.0.1", forgedInternalIp ?? undefined, forgedForwardedFor),
  "198.51.100.99",
);
console.log(`PASS ${matrixRows.length} synthetic proxy/IP decision cases`);
console.log(JSON.stringify(matrixRows));
