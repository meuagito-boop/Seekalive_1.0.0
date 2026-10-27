export type CommercialProfileRegistrationData = {
  categoryKey: string;
  discoveryKind: "place" | "provider";
  address: string;
  postalCode: string;
  cityName: string;
  stateName: string;
  countryName: string;
};
