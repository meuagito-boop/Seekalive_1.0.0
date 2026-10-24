import app from "./app";
import { logger } from "./common/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (error) => {
  logger.error({ err: error }, "Error listening on port");
  process.exitCode = 1;
});

let shutdownStarted = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shutdownStarted) return;
  shutdownStarted = true;
  logger.info({ signal }, "Graceful shutdown started");

  const forceCloseTimer = setTimeout(() => {
    logger.error({ signal }, "Graceful shutdown timed out; closing remaining connections");
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);
  forceCloseTimer.unref();

  server.close((error) => {
    clearTimeout(forceCloseTimer);
    if (error) {
      logger.error({ err: error }, "HTTP server failed to close cleanly");
      process.exitCode = 1;
    }

    void pool
      .end()
      .then(() => {
        logger.info({ signal }, "Database pool closed");
      })
      .catch((poolError: unknown) => {
        logger.error({ err: poolError }, "Database pool failed to close cleanly");
        process.exitCode = 1;
      });
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
