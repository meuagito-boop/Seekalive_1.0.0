import { Router, type IRouter, type Request, type Response } from "express";
import type { Readable } from "node:stream";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import { loadActiveSession } from "../../../security/activeSession";
import type { MediaType, StagedMediaAsset } from "../domain/mediaAsset";
import {
  InvalidMediaDeclarationError,
  MediaUploadTooLargeError,
  UnsupportedMediaSignatureError,
} from "../domain/mediaAsset";
import type { MediaFileStore } from "../domain/mediaAsset";
import type { ReadPost } from "../../feed/application/readPost";
import { sendApiError } from "../../../common/apiErrors";
import type { ApiErrorKey, HttpStatusCode } from "@workspace/api-zod";

type UploadMedia = (
  ownerAccountId: string,
  source: Readable,
  declaredType: MediaType,
) => Promise<{
  id: string;
  type: MediaType;
  contentType: string;
  sizeBytes: number;
  url: string;
  expiresAt: string;
}>;

type MediaRoutesDependencies = {
  uploadMedia: UploadMedia;
  store: MediaFileStore;
  findAsset: (id: string) => Promise<StagedMediaAsset | null>;
  deleteStagedAsset: (
    id: string,
    ownerAccountId: string,
  ) => Promise<{ storageKey: string } | null>;
  readPost: ReadPost;
};

function sendMediaError(
  response: Response,
  status: HttpStatusCode,
  key: ApiErrorKey,
  message: string,
) {
  sendApiError(response, status, key, message);
}

async function viewerId(request: Request): Promise<string | null> {
  const session = await loadActiveSession(request);
  return session?.accountId ?? null;
}

function parseRange(rangeHeader: string | undefined, size: number) {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match || (!match[1] && !match[2])) return false;

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return false;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return false;
  }
  return { start, end: Math.min(end, size - 1) };
}

export function createMediaRoutes(dependencies: MediaRoutesDependencies): IRouter {
  const router: IRouter = Router();

  router.post(
    "/media",
    createAuthRateLimit("social-media-upload", 20, 60_000),
    requireCsrf,
    async (request, response) => {
      const accountId = await viewerId(request);
      if (!accountId) {
        sendMediaError(response, 401, "UNAUTHENTICATED", "Entre na sua conta para enviar mídias.");
        return;
      }

      const declaredType = request.header("x-seekalive-media-type");
      if (declaredType !== "image" && declaredType !== "video") {
        sendMediaError(response, 415, "CONTENT_VALIDATION_FAILED", "Informe se o arquivo enviado é uma foto ou um vídeo.");
        return;
      }
      if (request.header("content-type") !== "application/octet-stream") {
        sendMediaError(response, 415, "CONTENT_VALIDATION_FAILED", "Formato de envio não suportado.");
        return;
      }

      const contentLength = request.header("content-length");
      if (contentLength !== undefined) {
        const parsedLength = Number(contentLength);
        const maximum = declaredType === "image" ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
        if (!Number.isSafeInteger(parsedLength) || parsedLength <= 0) {
          sendMediaError(response, 400, "INVALID_REQUEST", "O tamanho do arquivo não é válido.");
          return;
        }
        if (parsedLength > maximum) {
          sendMediaError(response, 413, "PAYLOAD_TOO_LARGE", "O arquivo excede o limite permitido.");
          return;
        }
      }

      try {
        const result = await dependencies.uploadMedia(
          accountId,
          request,
          declaredType,
        );
        response.status(201).json(result);
      } catch (error) {
        if (error instanceof MediaUploadTooLargeError) {
          sendMediaError(response, 413, "PAYLOAD_TOO_LARGE", "O arquivo excede o limite permitido.");
          return;
        }
        if (
          error instanceof UnsupportedMediaSignatureError ||
          error instanceof InvalidMediaDeclarationError
        ) {
          sendMediaError(response, 415, "CONTENT_VALIDATION_FAILED", "O arquivo não corresponde a um formato de foto ou vídeo aceito.");
          return;
        }
        if (
          error instanceof Error &&
          error.message === "Local media uploads are enabled only in development."
        ) {
          sendMediaError(response, 503, "INTERNAL_ERROR", "O armazenamento local de teste está disponível somente no desenvolvimento.");
          return;
        }
        throw error;
      }
    },
  );

  router.get(
    "/media/:assetId",
    createAuthRateLimit("social-media-read", 120, 60_000),
    async (request, response) => {
      const rawAssetId = request.params.assetId;
      const assetId = Array.isArray(rawAssetId) ? rawAssetId[0] : rawAssetId;
      if (typeof assetId !== "string" || !/^[0-9a-f-]{36}$/i.test(assetId)) {
        sendMediaError(response, 404, "CONTENT_NOT_FOUND", "Mídia não encontrada.");
        return;
      }
      const asset = await dependencies.findAsset(assetId);
      if (!asset) {
        sendMediaError(response, 404, "CONTENT_NOT_FOUND", "Mídia não encontrada.");
        return;
      }

      const accountId = await viewerId(request);
      let canRead = false;
      if (asset.state === "staged") {
        canRead = accountId === asset.ownerAccountId && asset.expiresAt > new Date();
      } else if (asset.postId) {
        const post = await dependencies.readPost(asset.postId, accountId);
        canRead = Boolean(
          post &&
            post.mediaUrls?.includes(
              `/api/v1/social/media/${encodeURIComponent(asset.id)}`,
            ),
        );
      }
      if (!canRead) {
        sendMediaError(response, 404, "CONTENT_NOT_FOUND", "Mídia não encontrada.");
        return;
      }

      let file;
      try {
        file = await dependencies.store.stat(asset.storageKey);
      } catch {
        sendMediaError(response, 404, "CONTENT_NOT_FOUND", "Mídia não encontrada.");
        return;
      }
      const range = parseRange(request.header("range"), file.sizeBytes);
      if (range === false) {
        response.setHeader("Content-Range", `bytes */${file.sizeBytes}`);
        sendMediaError(response, 416, "INVALID_REQUEST", "O intervalo solicitado não é válido.");
        return;
      }

      const start = range?.start ?? 0;
      const end = range?.end ?? file.sizeBytes - 1;
      response.status(range ? 206 : 200);
      response.setHeader("Content-Type", asset.contentType);
      response.setHeader("Content-Length", String(end - start + 1));
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Content-Disposition", "inline; filename=\"media\"");
      response.setHeader("Accept-Ranges", "bytes");
      response.setHeader("Cache-Control", "private, no-store");
      if (range) {
        response.setHeader(
          "Content-Range",
          `bytes ${range.start}-${range.end}/${file.sizeBytes}`,
        );
      }
      dependencies.store
        .createReadStream(asset.storageKey, range ?? undefined)
        .on("error", () => response.destroy())
        .pipe(response);
    },
  );

  router.delete(
    "/media/:assetId",
    createAuthRateLimit("social-media-delete", 30, 60_000),
    requireCsrf,
    async (request, response) => {
      const accountId = await viewerId(request);
      if (!accountId) {
        sendMediaError(response, 401, "UNAUTHENTICATED", "Entre na sua conta para continuar.");
        return;
      }
      const rawAssetId = request.params.assetId;
      const assetId = Array.isArray(rawAssetId) ? rawAssetId[0] : rawAssetId;
      if (typeof assetId !== "string" || !/^[0-9a-f-]{36}$/i.test(assetId)) {
        sendMediaError(response, 404, "CONTENT_NOT_FOUND", "Mídia não encontrada.");
        return;
      }
      const asset = await dependencies.deleteStagedAsset(assetId, accountId);
      if (!asset) {
        sendMediaError(response, 404, "CONTENT_NOT_FOUND", "Mídia não encontrada.");
        return;
      }
      try {
        await dependencies.store.remove(asset.storageKey);
      } catch (error) {
        console.warn(JSON.stringify({
          event: "media.staged_file_cleanup_failed",
          assetId,
          error: error instanceof Error ? error.name : "UnknownError",
        }));
      }
      response.status(204).end();
    },
  );

  return router;
}
