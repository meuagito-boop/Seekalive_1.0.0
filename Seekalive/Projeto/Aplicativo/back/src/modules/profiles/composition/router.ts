import { Router, type IRouter } from "express";
import {
  accountView,
  accountViewsByIds,
  findActiveAccountById,
  findActiveAccountByUsername,
} from "./publicApi";
import {
  isBlockedBetween,
  getRelationshipFor,
} from "../../social/composition/publicApi";
import { createProfilePostListApi } from "../../feed/composition/publicApi";
import { createCommercialProfileLoader } from "../application/commercialProfile";
import { createOwnerProfileLoader } from "../application/ownerProfile";
import { createOwnerProfileIdentityLoader } from "../application/ownerProfileCommon";
import { createPrivacySettingsService } from "../application/privacySettings";
import {
  getPublicAccountById,
  getPublicProfileByUsername,
  type PublicProfileDependencies,
} from "../application/publicProfile";
import { createOwnerProfileUpdater } from "../application/updateOwnerProfile";
import { createUsernameAvailabilityChecker } from "../application/usernameAvailability";
import { createCommercialProfileDetailsReader } from "../application/commercialProfileDetails";
import { findCommercialProfileDetailsByAccountId } from "../infrastructure/commercialProfileDetailsRepository";
import { findOwnerProfileIdentity } from "../infrastructure/ownerProfileRepository";
import { persistOwnerProfileUpdate } from "../infrastructure/ownerProfileUpdateRepository";
import {
  findPrivacySettings,
  savePrivacySettings,
} from "../infrastructure/privacySettingsRepository";
import { isUsernameClaimedOrReserved } from "../infrastructure/usernameAvailabilityRepository";
import { createAccountAvailabilityRouter } from "../presentation/accountAvailabilityRoutes";
import { createOwnerProfileRouter } from "../presentation/ownerProfileRoutes";
import { createPrivacyRouter } from "../presentation/privacyRoutes";
import { createPublicProfileRouter } from "../presentation/publicProfileRoutes";

const loadOwnerProfileIdentity = createOwnerProfileIdentityLoader({
  accountView,
  findActiveAccountById,
  findOwnerProfileIdentity,
});
const readCommercialProfileDetails = createCommercialProfileDetailsReader(
  findCommercialProfileDetailsByAccountId,
);
const loadCommercialProfile = createCommercialProfileLoader(
  readCommercialProfileDetails,
);
const loadOwnerProfile = createOwnerProfileLoader({
  loadIdentity: loadOwnerProfileIdentity,
  loadCommercialProfile,
});
const updateOwnerProfile = createOwnerProfileUpdater(persistOwnerProfileUpdate);
const checkUsernameAvailability = createUsernameAvailabilityChecker(
  isUsernameClaimedOrReserved,
);
const privacySettings = createPrivacySettingsService({
  findPrivacySettings,
  savePrivacySettings,
});
const listProfilePosts = createProfilePostListApi(accountViewsByIds);

const publicProfileDependencies: PublicProfileDependencies = {
  accountView,
  findActiveAccountById,
  findActiveAccountByUsername,
  readCommercialProfileDetails,
  getRelationshipFor,
  isBlockedBetween,
  listProfilePosts,
};

const router: IRouter = Router();
router.use(createAccountAvailabilityRouter(checkUsernameAvailability));
router.use(createOwnerProfileRouter(loadOwnerProfile, updateOwnerProfile));
router.use(createPrivacyRouter(privacySettings));
router.use(
  createPublicProfileRouter(
    (username, viewerId) =>
      getPublicProfileByUsername(username, viewerId, publicProfileDependencies),
    (accountId, viewerId) =>
      getPublicAccountById(accountId, viewerId, publicProfileDependencies),
  ),
);

export default router;
