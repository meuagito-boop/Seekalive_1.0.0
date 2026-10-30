import { createCommercialProfileDetailsReader } from "../application/commercialProfileDetails";
import { findCommercialProfileDetailsByAccountId } from "../infrastructure/commercialProfileRepository";

export const readCommercialProfileDetails =
  createCommercialProfileDetailsReader(findCommercialProfileDetailsByAccountId);
