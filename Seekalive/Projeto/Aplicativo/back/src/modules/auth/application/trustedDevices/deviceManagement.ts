export type TrustedDeviceSummary = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
};

export type TrustedDeviceManagementRepository = {
  listTrustedDevices(accountId: string): Promise<TrustedDeviceSummary[]>;
  revokeOtherTrustedDevices(
    accountId: string,
    currentDeviceId: string,
    now: Date,
  ): Promise<string[]>;
  revokeTrustedDevice(
    accountId: string,
    deviceId: string,
    currentDeviceId: string,
    now: Date,
  ): Promise<{ isCurrent: boolean } | null>;
};

export function createTrustedDeviceManagement(
  repository: TrustedDeviceManagementRepository,
) {
  return {
    listTrustedDevices(accountId: string) {
      return repository.listTrustedDevices(accountId);
    },
    revokeOtherTrustedDevices(
      accountId: string,
      currentDeviceId: string,
      now = new Date(),
    ) {
      return repository.revokeOtherTrustedDevices(
        accountId,
        currentDeviceId,
        now,
      );
    },
    revokeTrustedDevice(
      accountId: string,
      deviceId: string,
      currentDeviceId: string,
      now = new Date(),
    ) {
      return repository.revokeTrustedDevice(
        accountId,
        deviceId,
        currentDeviceId,
        now,
      );
    },
  };
}
