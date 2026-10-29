import { z } from "zod";

const SEEKALIVE_USERNAME_PATTERN =
  /[s5]+[-_0-9]*[e3]+[-_0-9]*[e3]+[-_0-9]*k+[-_0-9]*[a4]+[-_0-9]*[l1]+[-_0-9]*[i1]+[-_0-9]*v+[-_0-9]*[e3]+/;

export const usernameFormatSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O nome de usuário deve ter pelo menos 3 caracteres.")
  .max(20, "O nome de usuário deve ter no máximo 20 caracteres.")
  .regex(
    /^[a-z0-9_-]+$/,
    "Use letras sem acento, números, hífen e sublinhado.",
  );

export function isSeekaliveReservedUsername(username: string): boolean {
  return SEEKALIVE_USERNAME_PATTERN.test(username.trim().toLowerCase());
}

export const usernameSchema = usernameFormatSchema.refine(
  (username) => !isSeekaliveReservedUsername(username),
  "Esse nome de usuário está reservado para o sistema Seekalive.",
);
