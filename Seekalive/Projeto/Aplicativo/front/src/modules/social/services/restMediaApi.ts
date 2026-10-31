import { z } from "zod";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";
import { apiRequest } from "@/modules/social/services/socialHttp";
import type { MediaType } from "@/modules/social/types/posts";

const mediaUploadResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["image", "video"]),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  url: z.string().startsWith("/api/v1/social/media/"),
  expiresAt: z.string().datetime(),
}).strict();

export async function uploadSocialMedia(file: File, type: MediaType) {
  const result = await apiRequest("/api/v1/social/media", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Seekalive-Media-Type": type,
    },
    body: file,
  });
  const parsed = mediaUploadResponseSchema.safeParse(result);
  if (!parsed.success || parsed.data.type !== type) {
    throw new ContentServiceError(
      "O servidor não confirmou o envio da mídia. Tente novamente.",
      502,
    );
  }
  return parsed.data;
}

export async function discardStagedSocialMedia(assetId: string): Promise<void> {
  await apiRequest(
    `/api/v1/social/media/${encodeURIComponent(assetId)}`,
    { method: "DELETE" },
  );
}
