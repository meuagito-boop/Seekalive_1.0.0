import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: [process.env.SEEKALIVE_DB_SCHEMA?.trim() || "public"],
});
