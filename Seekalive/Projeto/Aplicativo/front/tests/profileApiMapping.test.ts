import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProfileResponse } from "@workspace/api-client-react";
import { profileResponseToUser } from "../src/modules/social/services/socialGraphApi";

const personalAccount: ProfileResponse["account"] = {
  id: "5d7e0d74-4fd2-4a78-9861-5113a70be8de",
  username: "perfil_teste",
  displayName: "Perfil Teste",
  bio: "Bio pública",
  avatarUrl: null,
  coverUrl: null,
  location: null,
  website: null,
  accountType: "personal",
  isPrivate: false,
  joinedAt: "2026-10-24T00:00:00.000Z",
  relationship: {
    following: "none",
    inCircle: false,
    blockedByMe: false,
    blockedByThem: false,
    mutedByMe: false,
  },
  stats: { posts: 0, followers: 0, following: 0, circles: 0 },
  version: 1,
};

function makeProfileResponse(
  account: ProfileResponse["account"],
  commercialProfile: ProfileResponse["commercialProfile"],
): ProfileResponse {
  return {
    account,
    commercialProfile,
    visibility: {
      canViewPublicContent: true,
      canViewCircleContent: false,
    },
    posts: { items: [], nextCursor: null },
    articles: { items: [], nextCursor: null },
    media: { items: [], nextCursor: null },
  };
}

test("mapeia detalhes comerciais visíveis da resposta pública", () => {
  const profile = makeProfileResponse(
    {
      ...personalAccount,
      accountType: "commercial",
      displayName: "Café Teste",
    },
    {
      categoryKey: "cafes",
      discoveryKind: "place",
      address: "Rua de Teste, 100",
      postalCode: "01001000",
      cityName: "São Paulo",
      stateName: "SP",
      countryName: "Brasil",
    },
  );

  const user = profileResponseToUser(profile);

  assert.equal(user.accountType, "commercial");
  assert.equal(user.displayName, "Café Teste");
  assert.equal(user.address, "Rua de Teste, 100");
  assert.equal(user.postalCode, "01001000");
  assert.equal(user.city, "São Paulo");
  assert.equal(user.state, "SP");
  assert.equal(user.country, "Brasil");
  assert.equal(user.location, "São Paulo, SP");
  assert.equal("email" in user, false);
  assert.equal("age" in user, false);
  assert.deepEqual(user.commercialProfile, {
    categoryKey: "cafes",
    category: "Cafés",
    discoveryKind: "place",
    address: "Rua de Teste, 100",
    cityName: "São Paulo",
    cityState: "SP",
    tags: [],
  });
});

test("não inventa detalhes comerciais quando a API os oculta", () => {
  const profile = makeProfileResponse(
    {
      ...personalAccount,
      accountType: "commercial",
      isPrivate: true,
      displayName: "Café Privado",
    },
    null,
  );

  const user = profileResponseToUser(profile);

  assert.equal(user.accountType, "commercial");
  assert.equal(user.commercialProfile, undefined);
  assert.equal(user.address, undefined);
  assert.equal(user.city, undefined);
});

test("perfil pessoal não recebe detalhes comerciais", () => {
  const user = profileResponseToUser(
    makeProfileResponse(personalAccount, null),
  );

  assert.equal(user.accountType, "personal");
  assert.equal(user.commercialProfile, undefined);
  assert.equal(user.address, undefined);
});
