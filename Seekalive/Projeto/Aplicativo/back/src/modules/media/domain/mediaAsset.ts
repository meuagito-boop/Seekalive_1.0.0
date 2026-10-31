import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

export const MEDIA_ASSET_LIMITS = {
  maxAttachmentsPerPost: 8,
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  stagedLifetimeMs: 24 * 60 * 60 * 1000,
} as const;

export type MediaType = "image" | "video";
export type MediaContentType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/avif"
  | "video/mp4"
  | "video/webm";

export type DetectedMedia = {
  type: MediaType;
  contentType: MediaContentType;
  extension: string;
};

export type StagedMediaAsset = Omit<DetectedMedia, "type" | "extension"> & {
  id: string;
  ownerAccountId: string;
  storageKey: string;
  mediaType: MediaType;
  sizeBytes: number;
  postId: string | null;
  position: number | null;
  state: "staged" | "attached";
  expiresAt: Date;
};

export class MediaUploadTooLargeError extends Error {
  constructor() {
    super("Uploaded media exceeds the configured size limit.");
    this.name = "MediaUploadTooLargeError";
  }
}

export class UnsupportedMediaSignatureError extends Error {
  constructor() {
    super("Uploaded file signature is not supported.");
    this.name = "UnsupportedMediaSignatureError";
  }
}

export class InvalidMediaDeclarationError extends Error {
  constructor() {
    super("Declared media type does not match the file signature.");
    this.name = "InvalidMediaDeclarationError";
  }
}

export interface MediaFileStore {
  writeUpload(
    source: Readable,
    declaredType: MediaType,
  ): Promise<{
    storageKey: string;
    type: MediaType;
    contentType: MediaContentType;
    sizeBytes: number;
  }>;
  stat(storageKey: string): Promise<{ sizeBytes: number }>;
  createReadStream(
    storageKey: string,
    range?: { start: number; end: number },
  ): Readable;
  remove(storageKey: string): Promise<void>;
}

export function createMediaAssetId(): string {
  return randomUUID();
}

export function detectMediaSignature(header: Uint8Array): DetectedMedia | null {
  const bytes = Buffer.from(header);
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { type: "image", contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { type: "image", contentType: "image/png", extension: "png" };
  }
  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))
  ) {
    return { type: "image", contentType: "image/gif", extension: "gif" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { type: "image", contentType: "image/webp", extension: "webp" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(bytes.toString("ascii", 8, 12))
  ) {
    return { type: "image", contentType: "image/avif", extension: "avif" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 4, 8) === "ftyp"
  ) {
    return { type: "video", contentType: "video/mp4", extension: "mp4" };
  }
  if (
    bytes.length >= 4 &&
    bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  ) {
    return { type: "video", contentType: "video/webm", extension: "webm" };
  }
  return null;
}
