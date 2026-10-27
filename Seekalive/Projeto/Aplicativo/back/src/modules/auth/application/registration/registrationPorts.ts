import type { CommercialProfileRegistrationData } from "../../../profiles/domain/commercialProfileRegistration";

type PendingAccountFields = {
  username: string;
  email: string;
  passwordHash: string;
  age: number;
  acceptedTermsVersion: string;
  displayName: string;
};

export type PendingAccountInput =
  | (PendingAccountFields & {
      accountType: "personal";
      firstName: string;
      lastName: string;
    })
  | (PendingAccountFields & {
      accountType: "commercial";
      firstName: null;
      lastName: null;
      commercialProfile: CommercialProfileRegistrationData;
    });

export type CreatedPendingAccount = {
  id: string;
  username: string;
  displayName: string;
};

export type RegistrationAccountWriter = {
  createPendingAccount(
    input: PendingAccountInput,
  ): Promise<CreatedPendingAccount | null>;
};

export type RegistrationIdentity = {
  username: string;
  email: string;
  passwordHash: string;
  acceptedTermsVersion: string;
};
