import { and, eq, isNotNull } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import type { ApiErrorKey, HttpStatusCode } from "@workspace/api-zod";
import { nextIdentityChangeAt } from "../../accounts/application/usernamePolicy";
import { accountView, findActiveAccountById } from "./accountViews";

export type OwnerProfileFailure = {
  ok: false;
  status: HttpStatusCode;
  code: ApiErrorKey;
  message: string;
};

export type OwnerProfileIdentity = {
  ok: true;
  accountType: "personal" | "commercial";
  data: {
    account: Awaited<ReturnType<typeof accountView>>;
    email: string;
    firstName: string | null;
    lastName: string | null;
    publicNameChangeAvailableAt: string;
    usernameChangeAvailableAt: string;
  };
};

export async function loadOwnerProfileIdentity(
  accountId: string,
): Promise<OwnerProfileIdentity | OwnerProfileFailure> {
  const row = await findActiveAccountById(accountId);
  if (!row) {
    return {
      ok: false,
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "Conta não encontrada.",
    };
  }

  const [ownerDetails] = await db
    .select({
      accountType: accounts.accountType,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      publicNameChangedAt: accounts.publicNameChangedAt,
      usernameChangedAt: accounts.usernameChangedAt,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  const [verifiedEmail] = await db
    .select({ email: accountEmails.emailNormalized })
    .from(accountEmails)
    .where(and(
      eq(accountEmails.accountId, accountId),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);

  if (!ownerDetails) {
    return {
      ok: false,
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "Conta não encontrada.",
    };
  }
  if (ownerDetails.accountType !== "personal" && ownerDetails.accountType !== "commercial") {
    return {
      ok: false,
      status: 500,
      code: "ACCOUNT_TYPE_INVALID",
      message: "Não foi possível identificar o tipo desta conta.",
    };
  }
  if (!verifiedEmail) {
    return {
      ok: false,
      status: 500,
      code: "ACCOUNT_EMAIL_MISSING",
      message: "Não foi possível carregar o e-mail verificado desta conta.",
    };
  }

  return {
    ok: true,
    accountType: ownerDetails.accountType,
    data: {
      account: await accountView(row, accountId),
      email: verifiedEmail.email,
      firstName: ownerDetails.firstName,
      lastName: ownerDetails.lastName,
      publicNameChangeAvailableAt: nextIdentityChangeAt(
        ownerDetails.publicNameChangedAt,
        row.createdAt,
      ).toISOString(),
      usernameChangeAvailableAt: nextIdentityChangeAt(
        ownerDetails.usernameChangedAt,
        row.createdAt,
      ).toISOString(),
    },
  };
}
