-- Execute somente com a conexão do banco de desenvolvimento.
-- Consulta apenas metadados do catálogo PostgreSQL; não lê linhas de negócio
-- nem executa DDL, migrations ou alterações.
WITH application_relations AS (
  SELECT
    n.oid AS schema_oid,
    n.nspname AS schema_name,
    c.oid AS relation_oid,
    c.relname AS relation_name,
    CASE c.relkind
      WHEN 'r' THEN 'table'
      WHEN 'p' THEN 'partitioned_table'
      WHEN 'v' THEN 'view'
      WHEN 'm' THEN 'materialized_view'
      WHEN 'f' THEN 'foreign_table'
      ELSE c.relkind::text
    END AS relation_type
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
),
catalog_entries AS (
  SELECT
    current_database() AS database_name,
    'relation'::text AS object_kind,
    r.schema_name,
    r.relation_name AS object_name,
    r.relation_type AS object_type,
    NULL::text AS definition,
    NULL::text AS on_delete,
    NULL::text AS on_update
  FROM application_relations AS r

  UNION ALL

  SELECT
    current_database(),
    'index',
    r.schema_name,
    index_class.relname,
    CASE WHEN index_data.indisunique THEN 'unique_index' ELSE 'index' END,
    pg_get_indexdef(index_data.indexrelid),
    NULL::text,
    NULL::text
  FROM application_relations AS r
  JOIN pg_index AS index_data ON index_data.indrelid = r.relation_oid
  JOIN pg_class AS index_class ON index_class.oid = index_data.indexrelid

  UNION ALL

  SELECT
    current_database(),
    'constraint',
    r.schema_name,
    constraint_data.conname,
    CASE constraint_data.contype
      WHEN 'p' THEN 'primary_key'
      WHEN 'f' THEN 'foreign_key'
      WHEN 'u' THEN 'unique'
      WHEN 'c' THEN 'check'
      WHEN 'x' THEN 'exclusion'
      ELSE constraint_data.contype::text
    END,
    pg_get_constraintdef(constraint_data.oid, true),
    CASE constraint_data.confdeltype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE NULL
    END,
    CASE constraint_data.confupdtype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE NULL
    END
  FROM application_relations AS r
  JOIN pg_constraint AS constraint_data
    ON constraint_data.conrelid = r.relation_oid
)
SELECT
  database_name,
  object_kind,
  schema_name,
  object_name,
  object_type,
  definition,
  on_delete,
  on_update
FROM catalog_entries
ORDER BY schema_name, object_kind, object_name;
