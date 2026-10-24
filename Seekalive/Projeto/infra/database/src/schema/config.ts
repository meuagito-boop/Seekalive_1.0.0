import { pgSchema, pgTable } from "drizzle-orm/pg-core";

const isolatedSchema = process.env.SEEKALIVE_DB_SCHEMA?.trim();

if (isolatedSchema && (
  process.env.NODE_ENV !== "test"
  || !/^seekalive_test_[0-9a-f]{32}$/i.test(isolatedSchema)
)) {
  throw new Error("SEEKALIVE_DB_SCHEMA is reserved for isolated test schemas.");
}

const isolatedNamespace = isolatedSchema ? pgSchema(isolatedSchema) : undefined;

export const applicationTable: typeof pgTable = isolatedNamespace
  ? isolatedNamespace.table.bind(isolatedNamespace) as unknown as typeof pgTable
  : pgTable;
