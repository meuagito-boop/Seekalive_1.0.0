import { createWriteStream, createReadStream, existsSync } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  detectMediaSignature,
  InvalidMediaDeclarationError,
  MEDIA_ASSET_LIMITS,
  MediaUploadTooLargeError,
  UnsupportedMediaSignatureError,
  type MediaFileStore,
  type MediaType,
} from "../domain/mediaAsset";

const storageKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function findProjectRoot(startDirectory: string): string {
  let current = startDirectory;
  for (let depth = 0; depth < 10; depth += 1) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Could not locate the Seekalive project root for local media storage.");
}

const projectRoot = findProjectRoot(
  path.dirname(fileURLToPath(import.meta.url)),
);
const defaultStorageRoot = path.join(
  projectRoot,
  "generated-artifacts",
  "social-media",
);

function isExplicitIsolatedTestRun(): boolean {
  return (
    process.env.NODE_ENV === "test" &&
    !process.env.REPLIT_DEPLOYMENT?.trim() &&
    process.env.SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS === "1" &&
    process.env.SEEKALIVE_DATABASE_TARGET === "replit" &&
    process.env.SEEKALIVE_DB_MIGRATION_TARGET === "replit" &&
    /^seekalive_test_[0-9a-f]{32}$/i.test(
      process.env.SEEKALIVE_DB_SCHEMA ?? "",
    )
  );
}

function safePath(root: string, storageKey: string): string {
  if (!storageKeyPattern.test(storageKey)) {
    throw new Error("Invalid local media storage key.");
  }
  return path.join(root, storageKey);
}

async function removeIfPresent(filePath: string): Promise<void> {
  await rm(filePath, { force: true });
}

export function createLocalMediaFileStore(
  root = defaultStorageRoot,
): MediaFileStore {
  return {
    async writeUpload(source, declaredType) {
      if (
        process.env.NODE_ENV !== "development" &&
        !isExplicitIsolatedTestRun()
      ) {
        throw new Error("Local media uploads are enabled only in development.");
      }

      const storageKey = randomUUID();
      const finalPath = safePath(root, storageKey);
      const temporaryPath = `${finalPath}.tmp`;
      const maximumBytes = declaredType === "image"
        ? MEDIA_ASSET_LIMITS.maxImageBytes
        : MEDIA_ASSET_LIMITS.maxVideoBytes;
      let sizeBytes = 0;
      let header = Buffer.alloc(0);

      await mkdir(root, { recursive: true, mode: 0o700 });

      const inputGuard = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          sizeBytes += chunk.length;
          if (sizeBytes > maximumBytes) {
            callback(new MediaUploadTooLargeError());
            return;
          }
          if (header.length < 32) {
            header = Buffer.concat([
              header,
              chunk.subarray(0, 32 - header.length),
            ]);
          }
          callback(null, chunk);
        },
      });

      try {
        await pipeline(
          source,
          inputGuard,
          createWriteStream(temporaryPath, { flags: "wx", mode: 0o600 }),
        );
        if (sizeBytes === 0) throw new UnsupportedMediaSignatureError();

        const detected = detectMediaSignature(header);
        if (!detected) throw new UnsupportedMediaSignatureError();
        if (detected.type !== declaredType) {
          throw new InvalidMediaDeclarationError();
        }

        await rename(temporaryPath, finalPath);
        return {
          storageKey,
          type: detected.type,
          contentType: detected.contentType,
          sizeBytes,
        };
      } catch (error) {
        const cleanupErrors: unknown[] = [];
        for (const filePath of [temporaryPath, finalPath]) {
          try {
            await removeIfPresent(filePath);
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
        }
        if (cleanupErrors.length > 0) {
          throw new AggregateError(
            [error, ...cleanupErrors],
            "Media upload failed and one or more partial files could not be removed.",
            { cause: error },
          );
        }
        throw error;
      }
    },

    async stat(storageKey) {
      const file = await stat(safePath(root, storageKey));
      return { sizeBytes: file.size };
    },

    createReadStream(storageKey, range) {
      const filePath = safePath(root, storageKey);
      return range
        ? createReadStream(filePath, { start: range.start, end: range.end })
        : createReadStream(filePath);
    },

    async remove(storageKey) {
      await rm(safePath(root, storageKey), { force: true });
    },
  };
}

export const localMediaFileStore = createLocalMediaFileStore();
