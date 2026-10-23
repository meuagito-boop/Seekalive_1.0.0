import { accountStorageKey } from "@/data/accountScopedStorage";

import type { DiscoveryLocation } from "@/lib/seekDiscovery";
import { normalizeSeekText } from "@/lib/seekFilters";

/** Source of the bundled official catalogue; not contacted during user searches. */
export const IBGE_CITIES_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado&orderBy=nome";
export const CITY_CATALOGUE_PATH = "data/ibge-cities-20261022.json";
const RECENTS_KEY = "seekalive-seek-recent-cities";
let citiesCache: DiscoveryLocation[] | undefined;
const capitalIds = new Set(["3550308", "3304557", "3106200", "2927408", "2304400", "5300108", "4106902", "2611606", "4314902", "1302603", "1501402", "5208707", "2111300", "2704302", "2408102", "5002704", "2211001", "2507507", "2800308", "5103403", "4205407", "3205309", "1100205", "1600303", "1200401", "1400100", "1721000"]);

export class LocationError extends Error {
  constructor(public readonly code: "network" | "denied" | "unavailable" | "timeout" | "invalid", message: string) {
    super(message);
    this.name = "LocationError";
  }
}

export function parseIBGECities(rows: unknown): DiscoveryLocation[] {
  if (!Array.isArray(rows)) throw new LocationError("invalid", "Resposta de cidades inválida.");
  const cities = rows.flatMap(row => {
    if (!row || typeof row !== "object") return [];
    const id = row["municipio-id"], city = row["municipio-nome"], state = row["UF-sigla"];
    if (!Number.isInteger(id) || typeof city !== "string" || !city.trim() || typeof state !== "string" || !/^[A-Z]{2}$/.test(state)) return [];
    return [{ id: String(id), city, state, label: `${city}, ${state} · Brasil`, source: "manual" as const }];
  });
  if (!cities.length) throw new LocationError("invalid", "O catálogo de cidades está indisponível.");
  return cities;
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<DiscoveryLocation[]> {
  signal?.throwIfAborted();
  if (!citiesCache) {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new LocationError("timeout", "A pesquisa de cidades demorou demais.")), 15000);
    const abort = () => timeout.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(`${import.meta.env?.BASE_URL ?? "/"}${CITY_CATALOGUE_PATH}`, { signal: timeout.signal, credentials: "omit" });
      if (!response.ok) throw new LocationError("network", "Não foi possível consultar o catálogo oficial de cidades desta versão.");
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("cities" in payload) || !Array.isArray(payload.cities)) {
        throw new LocationError("invalid", "O catálogo de cidades está inválido.");
      }
      const result = parseIBGECities(payload.cities.map((row: unknown) => {
        if (!Array.isArray(row)) return {};
        return { "municipio-id": row[0], "municipio-nome": row[1], "UF-sigla": row[2] };
      }));
      signal?.throwIfAborted();
      citiesCache = result;
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error;
      if (timeout.signal.aborted) throw timeout.signal.reason;
      throw error instanceof LocationError ? error : new LocationError("network", "Não foi possível consultar o catálogo de cidades. Verifique a conexão e tente novamente.");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  const needle = normalizeSeekText(query);
  if (!needle) return citiesCache.filter(city => capitalIds.has(city.id)).slice(0, 12);
  const terms = needle.split(" ").filter(Boolean);
  return citiesCache.filter(city => {
    const name = normalizeSeekText(`${city.city} ${city.state}`);
    return terms.every(term => name.includes(term));
  }).slice(0, 30);
}

export function validManualLocation(value: unknown): value is DiscoveryLocation {
  if (!value || typeof value !== "object") return false;
  const location = value as Partial<DiscoveryLocation>;
  return location.source === "manual" && typeof location.id === "string" && /^\d{7}$/.test(location.id)
    && typeof location.city === "string" && location.city.length > 0 && location.city.length <= 120
    && typeof location.state === "string" && /^[A-Z]{2}$/.test(location.state);
}

export function readRecentLocations(accountId?: string): DiscoveryLocation[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(accountStorageKey(RECENTS_KEY, accountId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(validManualLocation).slice(0, 5)
      .map(({ id, city, state }) => ({ id, city, state, source: "manual", label: `${city}, ${state} · Brasil` })) : [];
  } catch {
    return [];
  }
}

export function rememberManualLocation(location: DiscoveryLocation, accountId?: string) {
  if (!validManualLocation(location)) return;
  const key = accountStorageKey(RECENTS_KEY, accountId);
  const previous = readRecentLocations(accountId);
  // Explicitly omit coordinates; only city preference is kept for this browser tab.
  sessionStorage.setItem(key, JSON.stringify([
    { id: location.id, city: location.city, state: location.state, label: `${location.city}, ${location.state} · Brasil`, source: "manual" },
    ...previous.filter(city => city.id !== location.id),
  ].slice(0, 5)));
}

export async function requestDeviceLocation(signal?: AbortSignal): Promise<DiscoveryLocation> {
  signal?.throwIfAborted();
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new LocationError("unavailable", "Este navegador não oferece localização. Escolha uma cidade manualmente.");
  }
  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") throw new LocationError("denied", "A localização está bloqueada. Para liberá-la, use as configurações de permissão deste site no navegador. Você também pode escolher uma cidade.");
    } catch (error) {
      if (error instanceof LocationError) throw error;
      // Some browsers expose Permissions but do not implement geolocation queries.
    }
  }
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      action();
    };
    const abort = () => finish(() => reject(signal?.reason ?? new DOMException("Cancelado", "AbortError")));
    const timer = setTimeout(() => finish(() => reject(new LocationError("timeout", "Não foi possível obter sua localização a tempo. Tente novamente ou escolha uma cidade."))), 13000);
    signal?.addEventListener("abort", abort, { once: true });
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        finish(() => reject(new LocationError("invalid", "O dispositivo não retornou uma localização válida.")));
        return;
      }
      finish(() => resolve({ id: "device", label: "Localização aproximada do dispositivo", city: "", state: "", source: "device", latitude, longitude }));
    }, error => {
      const code = error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable";
      finish(() => reject(new LocationError(code, code === "denied"
        ? "Permissão de localização negada. Você pode liberá-la nas configurações deste site ou escolher uma cidade manualmente."
        : code === "timeout" ? "A localização demorou demais. Tente novamente ou escolha uma cidade."
          : "Localização indisponível. Verifique se o serviço está ativado no dispositivo ou escolha uma cidade.")));
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  });
}

export function locationErrorMessage(error: unknown) {
  return error instanceof LocationError ? error.message : "Não foi possível concluir a localização. Tente novamente ou escolha uma cidade.";
}
