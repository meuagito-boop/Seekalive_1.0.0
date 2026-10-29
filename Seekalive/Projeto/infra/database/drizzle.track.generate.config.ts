import { defineConfig } from "drizzle-kit";
import { getTrackGenerationConfig } from "./migrationTrackConfig";

export default defineConfig(getTrackGenerationConfig());
