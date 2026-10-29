export type PendingAccountIdentityInput = {
  username: string;
  email: string;
  age: number;
  acceptedTermsVersion: string;
  displayName: string;
  accountType: "personal" | "commercial";
  firstName: string | null;
  lastName: string | null;
};

export type CreatedPendingAccountIdentity = {
  id: string;
  username: string;
  displayName: string;
};
