import argon2 from "argon2";

const ARGON2ID_OPTIONS = {
  // argon2.argon2id is runtime value 2; the package type widens it to number.
  type: argon2.argon2id as 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2ID_OPTIONS);
}

export const fallbackPasswordHashPromise = hashPassword("seekalive-invalid-user-placeholder");
