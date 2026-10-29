import { logger } from "../../../common/logger";
import { finalizeDueAccountDeletions } from "./accountDeletionFinalizerRepository";
import { isAccountDeletionSchemaReady } from "./accountDeletionSchemaStatus";

const INTERVAL_MS = 60_000;

export async function startAccountDeletionWorker(): Promise<() => void> {
  if (!(await isAccountDeletionSchemaReady())) {
    logger.warn(
      { feature: "account-deletion" },
      "Account deletion worker is waiting for its database migration",
    );
    return () => undefined;
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const finalizedCount = await finalizeDueAccountDeletions();
      if (finalizedCount > 0) {
        logger.info({ finalizedCount }, "Due account deletions finalized");
      }
    } catch (error) {
      logger.error(
        { err: error, feature: "account-deletion" },
        "Account deletion finalization failed",
      );
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
