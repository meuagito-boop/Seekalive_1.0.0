import path from "node:path";
import { resolveDatabaseConnectionUrl } from "./src/connection";

const migrationTracks = {
  accounts: {
    schema: "accounts",
    source: "./src/schema/accounts/*.ts",
    ledgerTable: "accounts_migrations",
  },
  security: {
    schema: "security",
    source: "./src/schema/security/*.ts",
    ledgerTable: "security_migrations",
  },
  profiles: {
    schema: "profiles",
    source: "./src/schema/profiles/*.ts",
    ledgerTable: "profiles_migrations",
  },
} as const;

type MigrationTrack = keyof typeof migrationTracks;

function getMigrationTrack(): {
  name: MigrationTrack;
  definition: (typeof migrationTracks)[MigrationTrack];
} {
  const name = process.env.SEEKALIVE_DB_MIGRATION_TRACK;
  if (!name || !Object.hasOwn(migrationTracks, name)) {
    throw new Error(
      "Set SEEKALIVE_DB_MIGRATION_TRACK to one active domain: accounts, security, or profiles.",
    );
  }

  const trackName = name as MigrationTrack;
  return { name: trackName, definition: migrationTracks[trackName] };
}

export function getTrackGenerationConfig() {
  const { name, definition } = getMigrationTrack();

  return {
    dialect: "postgresql" as const,
    schema: path.join(__dirname, definition.source),
    out: `./migrations/${name}`,
    schemaFilter: [definition.schema],
    migrations: {
      schema: "drizzle",
      table: definition.ledgerTable,
    },
  };
}

export function getTrackMigrationConfig() {
  return {
    ...getTrackGenerationConfig(),
    dbCredentials: {
      url: resolveDatabaseConnectionUrl(process.env, "migration"),
    },
  };
}
