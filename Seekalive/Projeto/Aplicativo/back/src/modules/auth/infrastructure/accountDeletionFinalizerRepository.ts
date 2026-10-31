import { purgeOneExpiredAccountRetention } from "./accountDeletionPurgeRepository";
import { retainOneDueAccountDeletion } from "./accountDeletionRetentionRepository";

export async function finalizeDueAccountDeletions(
  purgeAccountMediaFiles: (accountId: string) => Promise<void>,
  now = new Date(),
  batchSize = 50,
): Promise<number> {
  let processed = 0;
  while (processed < batchSize) {
    const purged = await purgeOneExpiredAccountRetention(
      now,
      purgeAccountMediaFiles,
    );
    if (purged) {
      processed += 1;
      continue;
    }

    const retained = await retainOneDueAccountDeletion(now);
    if (!retained) break;
    processed += 1;
  }
  return processed;
}
