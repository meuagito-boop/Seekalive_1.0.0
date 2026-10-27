import type { ApiErrorKey, HttpStatusCode } from "@workspace/api-zod";
import { nextIdentityChangeAt } from "../../accounts/domain/usernamePolicy";
import type { AccountReadPort } from "../../accounts/application/ports";
import type { createAccountViews } from "../../accounts/application/accountViews";
import type { OwnerProfileIdentityReader } from "./ports";

type AccountViewReader = ReturnType<typeof createAccountViews>["accountView"];

export type OwnerProfileIdentityDependencies = {
  accountView: AccountViewReader;
  findActiveAccountById: AccountReadPort["findActiveAccountById"];
  findOwnerProfileIdentity: OwnerProfileIdentityReader;
};

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
    account: Awaited<ReturnType<AccountViewReader>>;
    email: string;
    firstName: string | null;
    lastName: string | null;
    publicNameChangeAvailableAt: string;
    usernameChangeAvailableAt: string;
  };
};

export function createOwnerProfileIdentityLoader(
  dependencies: OwnerProfileIdentityDependencies,
) {
  return async function loadOwnerProfileIdentity(
    accountId: string,
  ): Promise<OwnerProfileIdentity | OwnerProfileFailure> {
    const row = await dependencies.findActiveAccountById(accountId);
    if (!row) {
      return {
        ok: false,
        status: 404,
        code: "ACCOUNT_NOT_FOUND",
        message: "Conta não encontrada.",
      };
    }

    const ownerDetails = await dependencies.findOwnerProfileIdentity(accountId);

    if (!ownerDetails) {
      return {
        ok: false,
        status: 404,
        code: "ACCOUNT_NOT_FOUND",
        message: "Conta não encontrada.",
      };
    }
    if (
      ownerDetails.accountType !== "personal" &&
      ownerDetails.accountType !== "commercial"
    ) {
      return {
        ok: false,
        status: 500,
        code: "ACCOUNT_TYPE_INVALID",
        message: "Não foi possível identificar o tipo desta conta.",
      };
    }
    return {
      ok: true,
      accountType: ownerDetails.accountType,
      data: {
        account: await dependencies.accountView(row, accountId),
        email: ownerDetails.email,
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
  };
}

export type OwnerProfileIdentityLoader = ReturnType<
  typeof createOwnerProfileIdentityLoader
>;
