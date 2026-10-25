import { defineConfig } from "drizzle-kit";
import path from "path";
import { databaseSchemaFilter } from "./src/schema/config";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: databaseSchemaFilter,
});
