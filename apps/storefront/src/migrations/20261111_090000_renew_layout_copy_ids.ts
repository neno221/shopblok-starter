import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * W7 review item 1: data only, no schema change (so no snapshot beside it). Before the W7 fixes,
 * switching a page's own layout per language on (D105) copied its shared blocks into each language
 * with new ids only for ids of 24 hex digits, so the seed's blocks (`seed-privacy-text`,
 * `seed-home-hero`) kept one id in every language's copy. The drafts saved (a version's rows have
 * keys of their own), but publishing wrote the languages' rows into `pages_blocks_*_2`, whose key
 * is the id alone, and Payload refused it ("Value must be unique"), with the switch on or off,
 * since the copies stay in the document. This gives each such row of `localizedLayout` in the
 * versions (the `_2` tables and their arrays, which publishing reads from) an id in Payload's own
 * shape, so every language's copy has its own. Ids already in that shape are unique (the copies
 * got new ones), so they stay. The published tables cannot hold such a clash (their key refused
 * it), so they are left as they are.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  DECLARE
    copy_table text;
  BEGIN
    FOR copy_table IN
      SELECT columns.table_name
      FROM information_schema.columns AS columns
      WHERE columns.table_schema = current_schema()
        AND columns.column_name = '_uuid'
        AND columns.table_name LIKE '\\_pages\\_v\\_blocks\\_%'
        AND columns.table_name ~ '_2(_|$)'
    LOOP
      EXECUTE format(
        'UPDATE %I SET _uuid = substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 24) WHERE _uuid IS NOT NULL AND _uuid !~ ''^[0-9a-f]{24}$''',
        copy_table
      );
    END LOOP;
  END $$;`)
}

/** Nothing to undo: the old ids clashed, and the new ones draw the same blocks. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
