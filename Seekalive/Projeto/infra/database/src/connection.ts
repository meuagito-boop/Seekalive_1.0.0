export type DatabaseConnectionPurpose = "runtime" | "migration";

type Environment = Record<string, string | undefined>;

function resolveTarget(value: string | undefined, settingName: string) {
  const target = value?.trim().toLowerCase() || "replit";
  if (target !== "replit" && target !== "external") {
    throw new Error(`${settingName} must be either "replit" or "external".`);
  }
  return target;
}

export function resolveDatabaseConnectionUrl(
  environment: Environment,
  purpose: DatabaseConnectionPurpose,
) {
  const targetSetting =
    purpose === "runtime"
      ? "SEEKALIVE_DATABASE_TARGET"
      : "SEEKALIVE_DB_MIGRATION_TARGET";
  const target = resolveTarget(environment[targetSetting], targetSetting);
  const urlSetting =
    target === "external" ? "SEEKALIVE_EXTERNAL_DATABASE_URL" : "DATABASE_URL";
  const connectionUrl = environment[urlSetting]?.trim();

  if (!connectionUrl) {
    throw new Error(`${urlSetting} is required for the ${target} ${purpose} target.`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionUrl);
  } catch {
    throw new Error(`${urlSetting} must be a valid PostgreSQL connection URL.`);
  }

  if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
    throw new Error(`${urlSetting} must use the postgres or postgresql protocol.`);
  }

  return connectionUrl;
}
