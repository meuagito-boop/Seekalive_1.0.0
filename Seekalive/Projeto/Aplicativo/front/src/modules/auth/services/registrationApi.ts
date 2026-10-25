import { postJson } from "./http";
import type { Registration } from "../types";

export function registerAccount(payload: Registration) {
  return postJson<{ status: "verification_required"; message: string }>("/auth/register", payload);
}
