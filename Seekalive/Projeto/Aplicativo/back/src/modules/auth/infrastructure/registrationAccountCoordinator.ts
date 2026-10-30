import type { DatabaseTransaction } from "@workspace/db";
import type { CommercialProfileRegistrationData } from "../../profiles/domain/commercialProfileRegistration";
import type { AccountProfileRegistrationData } from "../../profiles/domain/accountProfileRegistration";
import type {
  CreatedPendingAccountIdentity,
  PendingAccountIdentityInput,
} from "../../accounts/application/registrationPorts";
import type { PendingAccountInput } from "../application/registration/registrationPorts";

type PendingAccountIdentityWriter = (
  transaction: DatabaseTransaction,
  input: PendingAccountIdentityInput,
) => Promise<CreatedPendingAccountIdentity | null>;

type PasswordCredentialWriter = (
  transaction: DatabaseTransaction,
  accountId: string,
  passwordHash: string,
) => Promise<void>;

type CommercialProfileInitializer = (
  transaction: DatabaseTransaction,
  accountId: string,
  profile: CommercialProfileRegistrationData,
) => Promise<void>;

type AccountProfileInitializer = (
  transaction: DatabaseTransaction,
  accountId: string,
  profile: AccountProfileRegistrationData,
) => Promise<void>;

type RegistrationTransactionRunner = <T>(
  work: (transaction: DatabaseTransaction) => Promise<T>,
) => Promise<T>;

export function createRegistrationAccountCoordinator(dependencies: {
  runInTransaction: RegistrationTransactionRunner;
  createPendingAccountIdentity: PendingAccountIdentityWriter;
  createInitialPasswordCredential: PasswordCredentialWriter;
  initializeAccountProfile: AccountProfileInitializer;
  initializeCommercialProfile: CommercialProfileInitializer;
}) {
  return {
    async createPendingAccount(input: PendingAccountInput) {
      return dependencies.runInTransaction(async (transaction) => {
        const account = await dependencies.createPendingAccountIdentity(
          transaction,
          {
            username: input.username,
            email: input.email,
            age: input.age,
            acceptedTermsVersion: input.acceptedTermsVersion,
            accountType: input.accountType,
          },
        );
        if (!account) return null;

        await dependencies.createInitialPasswordCredential(
          transaction,
          account.id,
          input.passwordHash,
        );

        await dependencies.initializeAccountProfile(transaction, account.id, {
          displayName: input.displayName,
          firstName: input.firstName,
          lastName: input.lastName,
        });

        if (input.accountType === "commercial") {
          await dependencies.initializeCommercialProfile(
            transaction,
            account.id,
            input.commercialProfile,
          );
        }

        return { ...account, displayName: input.displayName };
      });
    },
  };
}
