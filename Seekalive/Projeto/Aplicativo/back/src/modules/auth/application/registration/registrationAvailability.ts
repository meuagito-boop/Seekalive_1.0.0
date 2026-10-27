export type RegistrationEmailAccount = {
  id: string;
  displayName: string;
  status: string;
};

export type RegistrationAvailabilityRepository = {
  accountExistsByUsername(username: string): Promise<boolean>;
  activeUsernameReservationExists(username: string, at: Date): Promise<boolean>;
  findAccountByEmail(email: string): Promise<RegistrationEmailAccount | null>;
};

export function createRegistrationAvailability(
  repository: RegistrationAvailabilityRepository,
) {
  return {
    async isRegistrationUsernameUnavailable(
      username: string,
    ): Promise<boolean> {
      const at = new Date();
      if (await repository.accountExistsByUsername(username)) return true;
      return repository.activeUsernameReservationExists(username, at);
    },
    findRegistrationEmail(email: string) {
      return repository.findAccountByEmail(email);
    },
  };
}
