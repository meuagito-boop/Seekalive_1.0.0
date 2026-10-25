import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSeekItems, defaultDiscoveryFilters, discoveryImage, filterDiscovery, itemMatchesLocation, validateDiscoveryFilters } from "../src/modules/seek/utils/seekDiscovery";
import type { DiscoveryLocation, SeekDiscoveryItem } from "../src/modules/seek/utils/seekDiscovery";
import { LocationError, locationErrorMessage, parseIBGECities, readRecentLocations, rememberManualLocation, requestDeviceLocation, searchCities } from "../src/modules/seek/services/seekLocationService";
import type { User } from "../src/modules/profile/types/user";
import { mockUsers } from "../src/modules/app/data/demo/mockRecords";
import { demoSeekAccounts, demoSeekReviews, withDemoSeekMedia } from "../src/modules/seek/data/demoSeekAccounts";
import { demoSeekEvents } from "../src/modules/seek/data/demoSeekEvents";

const sp: DiscoveryLocation = { id: "3550308", city: "São Paulo", state: "SP", label: "São Paulo, SP · Brasil", source: "manual" };
const santos: DiscoveryLocation = { id: "3548500", city: "Santos", state: "SP", label: "Santos, SP · Brasil", source: "manual" };
const baseItem: SeekDiscoveryItem = {
  id: "work", kind: "provider", name: "Ana · pedreira", category: "Pedreiro", categoryKey: "servicos", description: "Reformas e construção",
  href: "/profile/ana", region: "São Paulo, SP", cityId: sp.id, reviewCount: 0, tags: ["pedreiro"], isExample: false,
};
const fixtureUser: User = {
  id: "account-test", username: "profissional_teste", displayName: "Profissional de teste", bio: "Pedreiro e pintura",
  avatarUrl: "", coverUrl: "", location: "São Paulo, SP", joinedAt: "2026-01-01", accountType: "commercial",
  commercialProfile: { categoryKey: "servicos", category: "Serviços", address: "", tags: ["pedreiro"], cityId: sp.id },
  stats: { posts: 0, followers: 0, following: 0, circles: 0 },
};

test("prévia contém lugares, serviços e eventos navegáveis com imagens ilustrativas e cidades", () => {
  const users = [...mockUsers.map(withDemoSeekMedia), ...demoSeekAccounts];
  const items = buildSeekItems(users, demoSeekReviews, demoSeekEvents.map(event => ({ ...event, isExample: true })),
    new Set(users.map(user => user.id)));
  assert.ok(items.filter(item => item.kind === "provider").length >= 4);
  assert.ok(items.filter(item => item.kind === "place").length >= 6);
  assert.equal(items.filter(item => item.kind === "event").length, 6);
  assert.ok(items.some(item => item.image?.includes("/demo-seek/")));
  assert.ok(items.every(item => item.isExample));
  assert.ok(items.filter(item => item.kind === "event").every(item => item.cityId && item.startsAt && Number.isFinite(Date.parse(item.startsAt))));
  for (const account of demoSeekAccounts) {
    assert.equal(account.accountType, "commercial");
    assert.ok(items.some(item => item.accountId === account.id && item.href === `/profile/${account.username}`));
  }
  const matches = filterDiscovery(items, { ...defaultDiscoveryFilters, query: "pedreiro", minimumRating: 4 }, sp);
  assert.ok(matches.some(item => item.id === "demo_marcos_reformas"));
});

test("Seek é alimentado pelas contas comerciais do Social e respeita bloqueio/privacidade", () => {
  const users: User[] = [fixtureUser, { ...fixtureUser, id: "personal", accountType: "personal" },
    { ...fixtureUser, id: "blocked", isBlocked: true }, { ...fixtureUser, id: "private", isPrivate: true }];
  const items = buildSeekItems(users, [], []);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "provider");
  assert.equal(items[0].rating, undefined);
  assert.equal(items[0].reviewCount, 0);
  assert.equal(items[0].href, "/profile/profissional_teste");
});
test("notas derivam apenas de avaliações válidas, sem zero fictício", () => {
  const reviews = [4, 5, 0, NaN].map((rating, index) => ({
    id: String(index), businessAccountId: fixtureUser.id, reviewerId: "reviewer", rating: rating as 4,
    comment: "Teste", createdAt: "2026-01-01",
  }));
  const item = buildSeekItems([fixtureUser], reviews, [])[0];
  assert.equal(item.rating, 4.5);
  assert.equal(item.reviewCount, 2);
});
test("exemplos são identificados e fotos de placeholders não substituem imagens reais", () => {
  assert.equal(discoveryImage("https://picsum.photos/200"), undefined);
  assert.equal(discoveryImage("https://i.pravatar.cc/150"), undefined);
  assert.equal(discoveryImage("javascript:alert(1)"), undefined);
  assert.equal(discoveryImage("https://merchant.example/foto.jpg"), "https://merchant.example/foto.jpg");
  const item = buildSeekItems([fixtureUser], [], [], new Set([fixtureUser.id]))[0];
  assert.equal(item.isExample, true);
  assert.equal(item.image, undefined);
});
test("cidade é aplicada por ID/declaração, sem inventar distância ou confundir GPS com preferência", () => {
  assert.equal(itemMatchesLocation(baseItem, sp), true);
  assert.equal(itemMatchesLocation(baseItem, santos), false);
  assert.equal(itemMatchesLocation({ ...baseItem, cityId: undefined }, sp), true);
  assert.equal(itemMatchesLocation({ ...baseItem, cityId: undefined, region: "São Paulo do Potengi, RN" }, sp), false);
  assert.equal(itemMatchesLocation({ ...baseItem, cityId: undefined, cityName: sp.city, cityState: "RS" }, sp), false);
  assert.equal(itemMatchesLocation(baseItem, { ...sp, source: "device", latitude: -23.5, longitude: -46.6 }), false);
});
test("busca encontra pedreiro sem percorrer categorias e não altera a cidade global", () => {
  assert.equal(filterDiscovery([baseItem], { ...defaultDiscoveryFilters, query: "pedreiro perto de mim" }, sp).length, 1);
  assert.equal(filterDiscovery([baseItem], { ...defaultDiscoveryFilters, query: "REFORMAS construcao" }, sp).length, 1);
  assert.equal(filterDiscovery([baseItem], { ...defaultDiscoveryFilters, query: "pedreiro em Santos" }, sp).length, 0);
  assert.equal(sp.city, "São Paulo");
  assert.equal(filterDiscovery([baseItem], { ...defaultDiscoveryFilters, tab: "places" }, null).length, 0);
});
test("filtros e ordenações mudam os resultados e excluem notas desconhecidas quando necessário", () => {
  const items = [baseItem, { ...baseItem, id: "two", name: "Zé", rating: 4.8, reviewCount: 10, open: true }];
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, minimumRating: 4 }, null)[0].id, "two");
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, onlyOpen: true }, null).length, 1);
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, category: "cafes" }, null).length, 0);
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, sort: "rating" }, null)[0].id, "two");
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, sort: "name" }, null)[0].id, "work");
});
test("eventos respeitam gratuidade, data válida, período e organizador existente", () => {
  const events = [{ id: "event", name: "Evento teste", categoryKey: "lazer", date: "Sábado", venue: "Local de teste",
    interested: 0, img: "", price: "Gratuito", startsAt: "2026-10-24T20:00:00-03:00", cityId: sp.id },
  { id: "removed", name: "Removido", categoryKey: "lazer", date: "", venue: "", interested: 0, img: "", price: "", organizerId: "missing" }];
  const items = buildSeekItems([], [], events);
  assert.equal(items.length, 1);
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, eventPrice: "free" }, sp).length, 1);
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, eventPrice: "paid" }, sp).length, 0);
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, eventPeriod: "weekend" }, sp, new Date("2026-10-22T18:00:00Z")).length, 1);
  assert.equal(filterDiscovery(items, { ...defaultDiscoveryFilters, eventPeriod: "upcoming" }, sp, new Date("2026-10-26T18:00:00Z")).length, 0);
  assert.equal(filterDiscovery([{ ...items[0], startsAt: undefined }], { ...defaultDiscoveryFilters, eventPeriod: "upcoming" }, sp).length, 0);
});
test("filtros restaurados são validados e entradas corrompidas não quebram a descoberta", () => {
  const filters = validateDiscoveryFilters({ tab: "invalid", query: "x".repeat(999), minimumRating: 999, onlyOpen: "yes", sort: "distance" });
  assert.equal(filters.tab, "explore");
  assert.equal(filters.query.length, 160);
  assert.equal(filters.minimumRating, 0);
  assert.equal(filters.onlyOpen, false);
  assert.equal(filters.sort, "relevance");
});
test("IBGE valida sugestões reais; pesquisa trata erro, cancelamento, acentos e cache", async () => {
  const rows = [{ "municipio-id": 3550308, "municipio-nome": "São Paulo", "UF-sigla": "SP" },
    { "municipio-id": 3548500, "municipio-nome": "Santos", "UF-sigla": "SP" }];
  assert.equal(parseIBGECities(rows)[0].id, sp.id);
  assert.throws(() => parseIBGECities([{ name: "cidade inventada" }]), LocationError);
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return new Response("", { status: 503 }); };
    await assert.rejects(searchCities("sao"), (error: unknown) => error instanceof LocationError && error.code === "network");
    const controller = new AbortController(); controller.abort();
    await assert.rejects(searchCities("sao", controller.signal), { name: "AbortError" });
    globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ cities: rows.map(row => [row["municipio-id"], row["municipio-nome"], row["UF-sigla"]]) })); };
    assert.equal((await searchCities("SAO PAULO"))[0].label, "São Paulo, SP · Brasil");
    assert.equal((await searchCities("Santós"))[0].city, "Santos");
    assert.equal((await searchCities("sem correspondencia")).length, 0);
    assert.equal((await searchCities(""))[0].city, "São Paulo");
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test("GPS só é obtido quando solicitado; permissão negada mantém orientação manual", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let requested = 0;
  try {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
      permissions: { query: async () => ({ state: "denied" }) },
      geolocation: { getCurrentPosition: () => { requested++; } },
    } });
    assert.equal(requested, 0);
    await assert.rejects(requestDeviceLocation(), (error: unknown) => error instanceof LocationError && error.code === "denied");
    assert.equal(requested, 0);
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
      permissions: { query: async () => ({ state: "granted" }) },
      geolocation: { getCurrentPosition: (ok: (position: unknown) => void) => { requested++; ok({ coords: { latitude: -23.5, longitude: -46.6 } }); } },
    } });
    const position = await requestDeviceLocation();
    assert.equal(requested, 1);
    assert.equal(position.source, "device");
    assert.equal(position.city, "");
    assert.doesNotMatch(position.label, /23\.5|46\.6/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
test("GPS trata indisponibilidade, timeout, precisão inválida e cancelamento sem travar", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  try {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
    await assert.rejects(requestDeviceLocation(), (error: unknown) => error instanceof LocationError && error.code === "unavailable");
    for (const [code, expected] of [[2, "unavailable"], [3, "timeout"]] as const) {
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
        geolocation: { getCurrentPosition: (_: unknown, fail: (error: unknown) => void) => fail({ code }) },
      } });
      await assert.rejects(requestDeviceLocation(), (error: unknown) => error instanceof LocationError && error.code === expected);
    }
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
      geolocation: { getCurrentPosition: (ok: (value: unknown) => void) => ok({ coords: { latitude: NaN, longitude: 200 } }) },
    } });
    await assert.rejects(requestDeviceLocation(), (error: unknown) => error instanceof LocationError && error.code === "invalid");
    const abort = new AbortController(); abort.abort();
    await assert.rejects(requestDeviceLocation(abort.signal), { name: "AbortError" });
    assert.match(locationErrorMessage(new LocationError("timeout", "Tente novamente")), /Tente novamente/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
test("preferências manuais não armazenam coordenadas, endereços nem localização física", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    rememberManualLocation({ ...sp, latitude: -23.5, longitude: -46.6 });
    rememberManualLocation(santos);
    rememberManualLocation({ ...sp, source: "device" });
    assert.equal(readRecentLocations()[0].id, santos.id);
    assert.equal(readRecentLocations().length, 2);
    assert.doesNotMatch([...values.values()].join(""), /latitude|longitude|23\.5|46\.6/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "sessionStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
