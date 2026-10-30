import {
  findActiveAccountById as readActiveAccountById,
  findActiveAccountByUsername as readActiveAccountByUsername,
  findActiveAccountsByIds,
} from "../../accounts/infrastructure/accountReadRepository";
import {
  getAccountSocialStats,
  getAccountSocialSummariesByIds,
  getRelationshipFor,
} from "../../social/composition/profileSocialViews";
import { createProfileViews } from "../application/profileViews";
import type {
  AccountIdentityReader,
  ProfilePresentationReader,
  ProfileSocialViewReader,
} from "../application/profileViews";
import {
  findProfilePresentationByAccountId,
  findProfilePresentationsByAccountIds,
} from "../infrastructure/profilePresentationRepository";

const accountIdentityReader: AccountIdentityReader = {
  findActiveAccountById: readActiveAccountById,
  findActiveAccountByUsername: readActiveAccountByUsername,
  findActiveAccountsByIds,
};

const profilePresentationReader: ProfilePresentationReader = {
  findByAccountId: findProfilePresentationByAccountId,
  findByAccountIds: findProfilePresentationsByAccountIds,
};

const socialViewReader: ProfileSocialViewReader = {
  getRelationshipFor,
  getAccountSocialStats,
  getAccountSocialSummariesByIds,
};

export const {
  accountView,
  accountViewsByIds,
  findActiveAccountById,
  findActiveAccountByUsername,
} = createProfileViews(
  accountIdentityReader,
  profilePresentationReader,
  socialViewReader,
);
