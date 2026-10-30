export type CommercialProfileDetails = {
  categoryKey: string;
  discoveryKind: "place" | "provider";
  address: string;
  postalCode: string;
  cityName: string;
  stateName: string;
  countryName: string;
};

type CommercialProfileDetailsRecord = Omit<
  CommercialProfileDetails,
  "discoveryKind"
> & {
  discoveryKind: string;
};

export type CommercialProfileDetailsReader = (
  accountId: string,
) => Promise<CommercialProfileDetails | null>;

type CommercialProfileDetailsLookup = (
  accountId: string,
) => Promise<CommercialProfileDetailsRecord | null>;

export function createCommercialProfileDetailsReader(
  findByAccountId: CommercialProfileDetailsLookup,
): CommercialProfileDetailsReader {
  return async (accountId) => {
    const record = await findByAccountId(accountId);
    if (!record) return null;

    if (
      record.discoveryKind !== "place" &&
      record.discoveryKind !== "provider"
    ) {
      throw new Error("Commercial profile has an unsupported discovery kind.");
    }

    const requiredValues = [
      record.categoryKey,
      record.address,
      record.postalCode,
      record.cityName,
      record.stateName,
      record.countryName,
    ];
    if (requiredValues.some((value) => value.trim().length === 0)) {
      throw new Error("Commercial profile is missing required public details.");
    }

    return {
      categoryKey: record.categoryKey,
      discoveryKind: record.discoveryKind,
      address: record.address,
      postalCode: record.postalCode,
      cityName: record.cityName,
      stateName: record.stateName,
      countryName: record.countryName,
    };
  };
}
