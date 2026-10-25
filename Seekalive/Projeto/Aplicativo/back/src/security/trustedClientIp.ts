import { isIP } from "node:net";
import type { Request, RequestHandler } from "express";

export const TRUSTED_CLIENT_IP_HEADER = "x-seekalive-client-ip";

export function isLoopbackProxyAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.trim().toLowerCase();
  if (normalized === "::1") return true;

  const ipv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  return isIP(ipv4) === 4 && ipv4.startsWith("127.");
}

export function getTrustedClientIp(
  request: Pick<Request, "socket" | "get">,
): string | null {
  if (!isLoopbackProxyAddress(request.socket.remoteAddress)) return null;

  const candidate = request.get(TRUSTED_CLIENT_IP_HEADER)?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

export const requireTrustedClientIp: RequestHandler = (request, response, next) => {
  if (!getTrustedClientIp(request)) {
    response.status(503).json({
      error: {
        code: "CLIENT_IP_UNAVAILABLE",
        message: "Não foi possível validar a origem da conexão. Atualize a página e tente novamente.",
        requestId: response.locals.requestId ?? "unknown",
      },
    });
    return;
  }

  next();
};
