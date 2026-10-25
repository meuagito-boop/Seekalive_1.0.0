import assert from "node:assert/strict";
import test from "node:test";
import type { MyAccountResponse } from "@workspace/api-client-react";
import type { User } from "@/data/mockData";
import type { ProfileEditFormValues } from "@/pages/profile-edit/profileEditSchema";
import {
  buildCommercialPreviewUser,
  buildCommercialProfilePatch,
} from "@/pages/profile-edit/commercialProfileEdit";
import {
  buildPersonalPreviewUser,
  buildPersonalProfilePatch,
  validatePersonalProfileName,
} from "@/pages/profile-edit/personalProfileEdit";
import { profileEditSchema } from "@/pages/profile-edit/profileEditSchema";

const values: ProfileEditFormValues = {
  firstName: "Ana",
  lastName: "Silva",
  displayName: "Café Central",
  username: "cafe_central",
  bio: "Café de bairro",
  location: "São Paulo, SP",
  website: "https://cafe.example",
  businessAddress: "Rua Augusta, 210",
  priceLevel: "2",
  serviceDelivery: "yes",
  serviceDineIn: "unknown",
  serviceTableService: "no",
  serviceReservations: "unknown",
  serviceAppointments: "unknown",
  serviceTakeout: "yes",
};

function accountFixture(): MyAccountResponse {
  return {
    account: {
      version: 4,
      username: "cafe_old",
      bio: "Bio antiga",
      location: "São Paulo",
      website: null,
      displayName: "Café Central antigo",
    },
    firstName: "Ana",
    lastName: "Silva",
    commercialProfile: {
      address: "Rua anterior",
      postalCode: "01310-100",
      cityName: "São Paulo",
      stateName: "SP",
      countryName: "Brasil",
    },
  } as unknown as MyAccountResponse;
}

test("website aceita HTTP/HTTPS e rejeita outros protocolos usados em links", () => {
  assert.equal(profileEditSchema.safeParse({ ...values, website: "https://cafe.example" }).success, true);
  assert.equal(profileEditSchema.safeParse({ ...values, website: "http://cafe.example" }).success, true);
  assert.equal(profileEditSchema.safeParse({ ...values, website: "ftp://cafe.example/menu" }).success, false);
  assert.equal(profileEditSchema.safeParse({ ...values, website: "" }).success, true);
});

test("validação do perfil pessoal exige nome e sobrenome", () => {
  assert.equal(validatePersonalProfileName(values), null);
  assert.equal(validatePersonalProfileName({ ...values, firstName: " A " }), "firstName");
  assert.equal(validatePersonalProfileName({ ...values, lastName: " " }), "lastName");
});

test("alteração pessoal monta patch somente com campos modificados e versão", () => {
  const current = accountFixture();
  const patch = buildPersonalProfilePatch(
    { ...values, username: " @Ana_Silva " },
    current,
    true,
  );

  assert.deepEqual(patch, {
    version: 4,
    username: "ana_silva",
    bio: "Café de bairro",
    location: "São Paulo, SP",
    website: "https://cafe.example",
  });
});

test("alteração comercial separa nome público dos campos da unidade", () => {
  const current = accountFixture();
  const patch = buildCommercialProfilePatch(values, current, {
    id: "sp-capital",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
  }, true);

  assert.deepEqual(patch, {
    version: 4,
    username: "cafe_central",
    displayName: "Café Central",
    bio: "Café de bairro",
    location: "São Paulo, SP",
    website: "https://cafe.example",
    commercialProfile: {
      address: "Rua Augusta, 210",
      postalCode: "01310-100",
      cityName: "São Paulo",
      stateName: "SP",
      countryName: "Brasil",
    },
  });
});

test("alteração pessoal local preserva o tipo da conta e monta o nome de exibição", () => {
  const current = {
    id: "account-1",
    username: "ana",
    displayName: "Ana Silva",
    firstName: "Ana",
    lastName: "Silva",
    bio: "",
    avatarUrl: "",
    coverUrl: "",
    joinedAt: "2026-01-01T00:00:00.000Z",
    accountType: "personal",
    stats: { posts: 0, followers: 0, following: 0, circles: 0 },
  } as User;

  const updated = buildPersonalPreviewUser(values, current);
  assert.equal(updated.accountType, "personal");
  assert.equal(updated.username, "cafe_central");
  assert.equal(updated.displayName, "Ana Silva");
  assert.equal(updated.bio, "Café de bairro");
});

test("alteração comercial local atualiza endereço, faixa de preço e serviços", () => {
  const current = {
    id: "account-2",
    username: "cafe_central",
    displayName: "Café Central antigo",
    bio: "",
    avatarUrl: "",
    coverUrl: "",
    joinedAt: "2026-01-01T00:00:00.000Z",
    accountType: "commercial",
    stats: { posts: 0, followers: 0, following: 0, circles: 0 },
    commercialProfile: {
      categoryKey: "cafes",
      category: "Cafés",
      address: "Rua anterior",
      priceLevel: 1 as const,
      serviceOptions: { delivery: false },
    },
  } as User;

  const updated = buildCommercialPreviewUser(
    values,
    current,
    { id: "sp-capital", city: "São Paulo", state: "SP", country: "Brasil" },
    undefined,
    undefined,
  );

  assert.equal(updated.accountType, "commercial");
  assert.equal(updated.displayName, "Café Central");
  assert.equal(updated.commercialProfile?.address, "Rua Augusta, 210");
  assert.equal(updated.commercialProfile?.cityName, "São Paulo");
  assert.equal(updated.commercialProfile?.priceLevel, 2);
  assert.equal(updated.commercialProfile?.serviceOptions?.delivery, true);
  assert.equal(updated.commercialProfile?.serviceOptions?.dineIn, undefined);
});
