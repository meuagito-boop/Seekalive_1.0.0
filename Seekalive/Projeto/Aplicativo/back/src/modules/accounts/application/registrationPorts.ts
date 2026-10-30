export type PendingAccountIdentityInput = {
  username: string;
  email: string;
  age: number;
  acceptedTermsVersion: string;
  accountType: "personal" | "commercial";
};

export type CreatedPendingAccountIdentity = {
  id: string;
  username: string;
};
