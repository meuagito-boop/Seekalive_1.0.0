import type { AccountIdentityRecord } from "../domain/accountIdentity";

export interface AccountReadPort {
  findActiveAccountById(id: string): Promise<AccountIdentityRecord | null>;
  findActiveAccountByUsername(
    username: string,
  ): Promise<AccountIdentityRecord | null>;
  findActiveAccountsByIds(ids: string[]): Promise<AccountIdentityRecord[]>;
}
