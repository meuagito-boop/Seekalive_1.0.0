import { defineConfig } from "drizzle-kit";
import path from "path";
import { resolveDatabaseConnectionUrl } from "./src/connection";
import { databaseSchemaFilter } from "./src/schema/config";

export default defineConfig({
  schema: [
    path.join(__dirname, "./src/schema/accounts/*.ts"),
    path.join(__dirname, "./src/schema/security/*.ts"),
    path.join(__dirname, "./src/schema/profiles/*.ts"),
    path.join(__dirname, "./src/schema/feed/*.ts"),
    path.join(__dirname, "./src/schema/media/*.ts"),
    path.join(__dirname, "./src/schema/seek/*.ts"),
  ],
  dialect: "postgresql",
  schemaFilter: databaseSchemaFilter,
  dbCredentials: {
    url: resolveDatabaseConnectionUrl(process.env, "migration"),
  },
});
