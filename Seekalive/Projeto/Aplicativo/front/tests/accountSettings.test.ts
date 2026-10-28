import assert from "node:assert/strict";
import test from "node:test";
import { currentUser } from "../src/data/mockData";
import {
  accountDraftFromUser,
  emptyAccountDraft,
} from "../src/modules/settings/application/accountDraft";

test("o rascunho da conta pessoal preserva nome e endereço opcionais", () => {
  const user = {
    ...currentUser,
    firstName: "Ana",
    lastName: "Silva",
    displayName: "Ana Silva",
    address: undefined,
    postalCode: undefined,
    city: undefined,
    state: undefined,
    country: undefined,
  };

  assert.deepEqual(accountDraftFromUser(user), {
    firstName: "Ana",
    lastName: "Silva",
    businessName: "Ana Silva",
    address: "",
    postalCode: "",
    cityName: "",
    stateName: "",
    countryName: "",
  });
});

test("o rascunho comercial mapeia o nome público e os dados do endereço", () => {
  const user = {
    ...currentUser,
    accountType: "commercial" as const,
    displayName: "Café Central",
    address: "Rua Augusta, 210",
    postalCode: "01305-000",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
  };

  assert.deepEqual(accountDraftFromUser(user), {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    businessName: "Café Central",
    address: "Rua Augusta, 210",
    postalCode: "01305-000",
    cityName: "São Paulo",
    stateName: "SP",
    countryName: "Brasil",
  });
});

test("uma conta ainda não carregada começa com o rascunho vazio", () => {
  assert.deepEqual(accountDraftFromUser(null), emptyAccountDraft);
});
