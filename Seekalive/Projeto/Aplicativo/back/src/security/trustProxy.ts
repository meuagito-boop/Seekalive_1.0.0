import { createRequire } from "node:module";

type TrustProxy = false | ((address: string, hopIndex: number) => boolean);

type ProxyAddressModule = {
  compile: (subnets: string[]) => (address: string, hopIndex: number) => boolean;
};

const require = createRequire(import.meta.url);
const proxyAddress = require("proxy-addr") as ProxyAddressModule;

/**
 * Trust forwarding headers only when the connecting proxy is in an explicit
 * operator-configured CIDR allowlist. An empty setting trusts no proxy.
 */
export function createTrustProxy(
  configuredCidrs: string | undefined = process.env.TRUSTED_PROXY_CIDRS,
): TrustProxy {
  const cidrs = configuredCidrs
    ?.split(",")
    .map((cidr) => cidr.trim())
    .filter(Boolean);

  if (!cidrs?.length) {
    return false;
  }

  // proxy-addr validates the CIDRs here and throws during startup for invalid
  // configuration rather than silently trusting a broader range.
  return proxyAddress.compile(cidrs);
}
