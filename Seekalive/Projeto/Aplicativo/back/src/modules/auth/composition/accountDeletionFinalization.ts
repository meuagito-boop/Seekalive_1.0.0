import { purgeAccountMediaFiles } from "../../media/composition/accountMediaPurge";
import {
  finalizeDueAccountDeletions as finalizeDueAccountDeletionsInInfrastructure,
} from "../infrastructure/accountDeletionFinalizerRepository";

export function finalizeDueAccountDeletions(
  now = new Date(),
  batchSize = 50,
) {
  return finalizeDueAccountDeletionsInInfrastructure(
    purgeAccountMediaFiles,
    now,
    batchSize,
  );
}
