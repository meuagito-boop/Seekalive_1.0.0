import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfileView } from "../src/modules/profiles/application/profileViewMapper.ts";
import { canViewPrivateProfileContent } from "../src/modules/profiles/domain/profileVisibility.ts";
import { createCommercialProfileDetailsReader } from "../src/modules/profiles/application/commercialProfileDetails.ts";
import { getPublicProfileByUsername } from "../src/modules/profiles/application/publicProfile.ts";

const account = {
  id: "account",
  username: "test_user",
  displayName: "Test User",
  bio: "Private biography",
  locationLabel: "São Paulo",
  websiteUrl: "https://example.test",
  accountType: "personal",
  isPrivate: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  version: 1,
};

const relationship = {
  following: "none",
  inCircle: false,
  blockedByMe: false,
  blockedByThem: false,
  mutedByMe: false,
};

const stats = {
  posts: 2,
  followers: 3,
  following: 4,
  circles: 1,
};

test("Profiles validates and returns canonical commercial profile details", async () => {
  const details = {
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Rua de Teste, 100",
    postalCode: "01001000",
    cityName: "São Paulo",
    stateName: "SP",
    countryName: "Brasil",
  };
  const readDetails = createCommercialProfileDetailsReader(async () => details);

  assert.deepEqual(await readDetails("account"), details);
});

test("Profiles rejects incomplete or unsupported commercial profile details", async () => {
  const invalidKind = createCommercialProfileDetailsReader(async () => ({
    categoryKey: "cafes",
    discoveryKind: "unknown",
    address: "Rua de Teste, 100",
    postalCode: "01001000",
    cityName: "São Paulo",
    stateName: "SP",
    countryName: "Brasil",
  }));
  const incomplete = createCommercialProfileDetailsReader(async () => ({
    categoryKey: "cafes",
    discoveryKind: "place",
    address: " ",
    postalCode: "01001000",
    cityName: "São Paulo",
    stateName: "SP",
    countryName: "Brasil",
  }));

  await assert.rejects(invalidKind("account"), /unsupported discovery kind/);
  await assert.rejects(
    incomplete("account"),
    /missing required public details/,
  );
});

test("public profiles remain visible to signed-out visitors", () => {
  assert.equal(
    canViewPrivateProfileContent(false, null, "account", "none"),
    true,
  );
});

test("private profile visibility is limited to the owner and accepted followers", () => {
  assert.equal(
    canViewPrivateProfileContent(true, null, "account", "none"),
    false,
  );
  assert.equal(
    canViewPrivateProfileContent(true, "account", "account", "none"),
    true,
  );
  assert.equal(
    canViewPrivateProfileContent(true, "follower", "account", "accepted"),
    true,
  );
  assert.equal(
    canViewPrivateProfileContent(true, "requester", "account", "pending"),
    false,
  );
});

test("profile view mapper redacts private profile details from non-followers", () => {
  const view = buildProfileView(account, null, relationship, stats);

  assert.equal(view.bio, "");
  assert.equal(view.location, null);
  assert.equal(view.website, null);
  assert.equal(view.joinedAt, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(view.stats, stats);
});

test("profile view mapper shows private profile details to the owner", () => {
  const view = buildProfileView(account, "account", relationship, stats);

  assert.equal(view.bio, "Private biography");
  assert.equal(view.location, "São Paulo");
  assert.equal(view.website, "https://example.test");
});

test("public profile composition hides a blocked profile before loading its content", async () => {
  let contentWasLoaded = false;
  let commercialDetailsWereLoaded = false;
  const result = await getPublicProfileByUsername("blocked_user", "viewer", {
    accountView: async () => ({}),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({
      ...account,
      id: "blocked-account",
      accountType: "commercial",
    }),
    readCommercialProfileDetails: async () => {
      commercialDetailsWereLoaded = true;
      return null;
    },
    getRelationshipFor: async () => relationship,
    isBlockedBetween: async () => true,
    listProfilePosts: async () => {
      contentWasLoaded = true;
      return { items: [], nextCursor: null };
    },
  });

  assert.deepEqual(result, { kind: "not_found" });
  assert.equal(contentWasLoaded, false);
  assert.equal(commercialDetailsWereLoaded, false);
});

test("public profile composition delegates private-content access to the visibility policy", async () => {
  const result = await getPublicProfileByUsername("private_user", null, {
    accountView: async () => ({ id: "account", isPrivate: true }),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({ ...account, id: "account" }),
    readCommercialProfileDetails: async () => null,
    getRelationshipFor: async () => relationship,
    isBlockedBetween: async () => false,
    listProfilePosts: async () => ({ items: [], nextCursor: null }),
  });

  assert.equal(result.kind, "found");
  assert.equal(result.data.visibility.canViewPublicContent, false);
  assert.equal(result.data.visibility.canViewCircleContent, false);
  assert.equal(result.data.commercialProfile, null);
});

test("visible commercial profiles include persisted business details", async () => {
  const commercialProfile = {
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Rua de Teste, 100",
    postalCode: "01001000",
    cityName: "São Paulo",
    stateName: "São Paulo",
    countryName: "Brasil",
  };
  const result = await getPublicProfileByUsername("test_user", null, {
    accountView: async () => ({ id: "account", isPrivate: false }),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({
      ...account,
      accountType: "commercial",
      isPrivate: false,
    }),
    readCommercialProfileDetails: async () => commercialProfile,
    getRelationshipFor: async () => relationship,
    isBlockedBetween: async () => false,
    listProfilePosts: async () => ({ items: [], nextCursor: null }),
  });

  assert.equal(result.kind, "found");
  assert.deepEqual(result.data.commercialProfile, commercialProfile);
});

test("public personal profiles never read or expose commercial details", async () => {
  let commercialDetailsLookups = 0;
  const result = await getPublicProfileByUsername("personal_user", null, {
    accountView: async () => ({ id: "personal-account", isPrivate: false }),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({
      ...account,
      id: "personal-account",
      accountType: "personal",
      isPrivate: false,
    }),
    readCommercialProfileDetails: async () => {
      commercialDetailsLookups += 1;
      return null;
    },
    getRelationshipFor: async () => relationship,
    isBlockedBetween: async () => false,
    listProfilePosts: async () => ({ items: [], nextCursor: null }),
  });

  assert.equal(result.kind, "found");
  assert.equal(result.data.commercialProfile, null);
  assert.equal(commercialDetailsLookups, 0);
});

test("private commercial details stay hidden from an unapproved visitor", async () => {
  let detailsWereLoaded = false;
  const result = await getPublicProfileByUsername("test_user", null, {
    accountView: async () => ({ id: "account", isPrivate: true }),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({
      ...account,
      accountType: "commercial",
      isPrivate: true,
    }),
    readCommercialProfileDetails: async () => {
      detailsWereLoaded = true;
      return null;
    },
    getRelationshipFor: async () => relationship,
    isBlockedBetween: async () => false,
    listProfilePosts: async () => ({ items: [], nextCursor: null }),
  });

  assert.equal(result.kind, "found");
  assert.equal(result.data.commercialProfile, null);
  assert.equal(detailsWereLoaded, false);
});

test("an approved follower can view a private commercial profile's details", async () => {
  const commercialProfile = {
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Rua de Teste, 100",
    postalCode: "01001000",
    cityName: "São Paulo",
    stateName: "São Paulo",
    countryName: "Brasil",
  };
  const result = await getPublicProfileByUsername("test_user", "follower", {
    accountView: async () => ({ id: "account", isPrivate: true }),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({
      ...account,
      accountType: "commercial",
      isPrivate: true,
    }),
    readCommercialProfileDetails: async () => commercialProfile,
    getRelationshipFor: async () => ({
      ...relationship,
      following: "accepted",
    }),
    isBlockedBetween: async () => false,
    listProfilePosts: async () => ({ items: [], nextCursor: null }),
  });

  assert.equal(result.kind, "found");
  assert.equal(result.data.visibility.canViewPublicContent, true);
  assert.equal(result.data.visibility.canViewCircleContent, false);
  assert.deepEqual(result.data.commercialProfile, commercialProfile);
});

test("a visible commercial profile with missing required details fails explicitly", async () => {
  await assert.rejects(
    getPublicProfileByUsername("test_user", null, {
      accountView: async () => ({ id: "account" }),
      findActiveAccountById: async () => null,
      findActiveAccountByUsername: async () => ({
        ...account,
        accountType: "commercial",
        isPrivate: false,
      }),
      readCommercialProfileDetails: async () => null,
      getRelationshipFor: async () => relationship,
      isBlockedBetween: async () => false,
      listProfilePosts: async () => ({ items: [], nextCursor: null }),
    }),
    /Visible commercial account is missing profile details/,
  );
});
