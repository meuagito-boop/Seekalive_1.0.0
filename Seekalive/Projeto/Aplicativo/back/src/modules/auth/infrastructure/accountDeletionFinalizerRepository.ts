import { and, eq, lte } from "drizzle-orm";
import { accountUsernameReservations, accounts, db } from "@workspace/db";
import { USERNAME_RESERVATION_MS } from "../../accounts/domain/usernamePolicy";

export async function finalizeOneDueAccountDeletion(
  now: Date,
): Promise<{ accountId: string } | null> {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: accounts.id,
        username: accounts.username,
        deletionRequestedAt: accounts.deletionRequestedAt,
        deletionScheduledFor: accounts.deletionScheduledFor,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.status, "deletion_pending"),
          lte(accounts.deletionScheduledFor, now),
        ),
      )
      .orderBy(accounts.deletionScheduledFor)
      .for("update", { skipLocked: true })
      .limit(1);

    if (
      !account ||
      !account.deletionRequestedAt ||
      !account.deletionScheduledFor
    ) {
      return null;
    }

    const reservationExpiresAt = new Date(
      account.deletionRequestedAt.getTime() + USERNAME_RESERVATION_MS,
    );
    if (reservationExpiresAt.getTime() > now.getTime()) {
      const [existingReservation] = await tx
        .select({
          accountId: accountUsernameReservations.accountId,
          reservedUntil: accountUsernameReservations.reservedUntil,
        })
        .from(accountUsernameReservations)
        .where(eq(accountUsernameReservations.username, account.username))
        .for("update")
        .limit(1);

      if (
        existingReservation &&
        existingReservation.reservedUntil.getTime() > now.getTime() &&
        existingReservation.accountId !== account.id
      ) {
        throw new Error(
          "Account deletion username reservation conflicts with an active reservation.",
        );
      }

      if (existingReservation) {
        await tx
          .update(accountUsernameReservations)
          .set({
            accountId: account.id,
            reservedUntil: reservationExpiresAt,
            createdAt: now,
          })
          .where(eq(accountUsernameReservations.username, account.username));
      } else {
        await tx.insert(accountUsernameReservations).values({
          username: account.username,
          accountId: account.id,
          reservedUntil: reservationExpiresAt,
          createdAt: now,
        });
      }
    }

    const [deleted] = await tx
      .delete(accounts)
      .where(
        and(
          eq(accounts.id, account.id),
          eq(accounts.status, "deletion_pending"),
          lte(accounts.deletionScheduledFor, now),
        ),
      )
      .returning({ id: accounts.id });

    return deleted ? { accountId: deleted.id } : null;
  });
}

export async function finalizeDueAccountDeletions(
  now = new Date(),
  batchSize = 50,
): Promise<number> {
  let processed = 0;
  while (processed < batchSize) {
    const finalized = await finalizeOneDueAccountDeletion(now);
    if (!finalized) break;
    processed += 1;
  }
  return processed;
}
