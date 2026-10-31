import type { MediaType } from "@/modules/social/types/posts";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";

export interface PreparedMedia {
  url: string;
  type: MediaType;
  name: string;
  sizeBytes: number;
  file: File;
}

export interface MediaService {
  prepareFiles(files: File[], type: MediaType): Promise<PreparedMedia[]>;
  release(url: string): void;
}

export const MEDIA_LIMITS = {
  count: 8,
  imageBytes: 10 * 1024 * 1024,
  videoBytes: 100 * 1024 * 1024,
};

const formats = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  video: ["video/mp4", "video/webm"],
};

export function validateMediaFiles(files: File[], type: MediaType) {
  if (files.length > MEDIA_LIMITS.count) throw new ContentServiceError("Escolha até 8 mídias.", 422);
  for (const file of files) {
    if (!formats[type].includes(file.type)) {
      throw new ContentServiceError(type === "image"
        ? "Formato de foto não suportado. Use JPEG, PNG, WebP, GIF ou AVIF."
        : "Formato de vídeo não suportado. Use MP4 ou WebM.", 422);
    }
    if (!file.size) throw new ContentServiceError("O arquivo está vazio. Escolha outro arquivo.", 422);
    if (file.size > (type === "image" ? MEDIA_LIMITS.imageBytes : MEDIA_LIMITS.videoBytes)) {
      throw new ContentServiceError(
        type === "image" ? "Selecione fotos de até 10 MB." : "Selecione vídeos de até 100 MB.",
        422,
      );
    }
  }
}

function verifyReadable(url: string, type: MediaType): Promise<void> {
  return new Promise((resolve, reject) => {
    const element = document.createElement(type === "image" ? "img" : "video");
    const finish = (error?: string) => {
      clearTimeout(timer);
      element.onload = element.onerror = null;
      if (element instanceof HTMLVideoElement) {
        element.onloadeddata = null;
        element.removeAttribute("src");
        element.load();
      }
      error ? reject(new ContentServiceError(error, 422)) : resolve();
    };
    const timer = setTimeout(() => finish("Não foi possível ler o arquivo. Escolha outro arquivo."), 15000);
    element.onerror = () => finish("Este arquivo está danificado ou não pode ser reproduzido neste navegador.");
    if (element instanceof HTMLVideoElement) {
      element.preload = "auto";
      element.onloadeddata = () => finish();
    } else {
      element.onload = () => finish();
    }
    element.src = url;
  });
}

// Browser object URLs only; they are not uploaded and do not survive a reload.
export const mediaService: MediaService = {
  async prepareFiles(files, type) {
    validateMediaFiles(files, type);
    const prepared: PreparedMedia[] = [];
    try {
      for (const file of files) {
        const url = URL.createObjectURL(file);
        prepared.push({
          url,
          name: file.name,
          type,
          sizeBytes: file.size,
          file,
        });
        await verifyReadable(url, type);
      }
      return prepared;
    } catch (error) {
      prepared.forEach((file) => URL.revokeObjectURL(file.url));
      throw error;
    }
  },
  release(url) {
    URL.revokeObjectURL(url);
  },
};
