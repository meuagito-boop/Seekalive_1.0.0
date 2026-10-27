import type { Registration } from "../types";
import type { RegistrationFormValues } from "./registrationFormSchema";

export function toRegistrationPayload(
  values: RegistrationFormValues,
): Registration {
  const common = {
    age: Number(values.age),
    username: values.username.trim().replace(/^@/, "").toLowerCase(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    passwordConfirmation: values.confirmPassword,
    acceptedTermsVersion: "v1",
  };

  if (values.accountType === "personal") {
    return {
      ...common,
      accountType: "personal",
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
    };
  }

  return {
    ...common,
    accountType: "commercial",
    businessName: values.businessName.trim(),
    categoryKey: values.businessCategory,
    discoveryKind: values.discoveryKind,
    address: values.address.trim(),
    postalCode: values.postalCode.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    country: values.country.trim(),
  };
}
