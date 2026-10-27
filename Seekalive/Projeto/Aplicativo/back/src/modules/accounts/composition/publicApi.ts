import {
  getAccountSocialStats,
  getAccountSocialSummariesByIds,
  getRelationshipFor,
} from "../../social/composition/publicApi";
import {
  findActiveAccountById as readActiveAccountById,
  findActiveAccountByUsername as readActiveAccountByUsername,
  findActiveAccountsByIds,
} from "../infrastructure/accountReadRepository";
import { lockUsernameClaims as lockUsernameClaimsAdapter } from "../infrastructure/usernameClaimLock";
import type {
  AccountReadPort,
  AccountSocialViewPort,
} from "../application/ports";
import { createAccountViews } from "../application/accountViews";

const accountReads: AccountReadPort = {
  findActiveAccountById: readActiveAccountById,
  findActiveAccountByUsername: readActiveAccountByUsername,
  findActiveAccountsByIds,
};

const socialViews: AccountSocialViewPort = {
  getRelationshipFor,
  getAccountSocialStats,
  getAccountSocialSummariesByIds,
};

export const {
  accountView,
  accountViewsByIds,
  findActiveAccountById,
  findActiveAccountByUsername,
} = createAccountViews(accountReads, socialViews);

export const usernameClaimLocks = Object.freeze({
  lock: lockUsernameClaimsAdapter,
});

export type { PublicAccountRow } from "../domain/publicAccount";
