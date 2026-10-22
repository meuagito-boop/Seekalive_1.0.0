import type { MediaType } from "@/types/content";
import { ContentServiceError } from "./contentValidation";

export interface PreparedMedia { url: string; type: MediaType; name: string }
export interface MediaService {
  prepareFiles(files: File[], type: MediaType): Promise<PreparedMedia[]>;
  release(url: string): void;
}
// Browser object URLs only; they are not uploaded and do not survive a reload.
export const mediaService: MediaService = {
  async prepareFiles(files, type) {
    if (files.length > 8) throw new ContentServiceError("Escolha até 8 mídias.", 422);
    const maxBytes = (type === "image" ? 10 : 100) * 1024 * 1024;
    if (files.some(file => !file.type.startsWith(`${type}/`) || file.size > maxBytes))
      throw new ContentServiceError(type === "image" ? "Selecione fotos de até 10 MB." : "Selecione vídeos de até 100 MB.", 422);
    return files.map(file => ({ url: URL.createObjectURL(file), name: file.name, type }));
  },
  release(url) { URL.revokeObjectURL(url); },
};
