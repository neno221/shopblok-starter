-- One Postgres instance, two databases (SPEC §5): Medusa and Payload.
--
-- The Postgres image runs this file only when it starts with an empty data
-- directory, that is, on a new volume. Editing it later changes nothing for an
-- existing volume: run `pnpm infra:reset` to recreate it (this deletes the data).

CREATE DATABASE medusa;
CREATE DATABASE payload;

-- Medusa's `db:migrate` also creates both extensions, so this is a safety net.
\connect medusa
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
