import { defineConfig } from "drizzle-kit";
import { getTrackMigrationConfig } from "./migrationTrackConfig";

export default defineConfig(getTrackMigrationConfig());
