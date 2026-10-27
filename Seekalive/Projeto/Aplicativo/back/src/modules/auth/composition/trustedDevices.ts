import { createTrustedDeviceManagement } from "../application/trustedDevices/deviceManagement";
import { trustedDeviceManagementRepository } from "../infrastructure/trustedDeviceManagementRepository";

export const trustedDeviceOperations = createTrustedDeviceManagement(
  trustedDeviceManagementRepository,
);
