import { spawnSync } from "node:child_process";

const isolatedSchema = process.env.SEEKALIVE_DB_SCHEMA;
if (
  process.env.NODE_ENV !== "test" ||
  !/^seekalive_test_[0-9a-f]{32}$/i.test(isolatedSchema ?? "") ||
  process.env.SEEKALIVE_DB_MIGRATION_TARGET !== "replit"
) {
  console.error(
    "Database push is restricted to an isolated development test schema.",
  );
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  ["exec", "drizzle-kit", "push", "--config", "./drizzle.push.config.ts"],
  {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("Could not start Drizzle push:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
