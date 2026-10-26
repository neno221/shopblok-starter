import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "markets_countries" ADD COLUMN "time_zone" varchar;`);
  // D65 (T52): a shop bootstrapped before this column gets the seed's zones for the six seeded
  // countries (the capital's); any other country stays empty, which is UTC.
  await db.execute(sql`
   UPDATE "markets_countries" SET "time_zone" = CASE "code"
     WHEN 'cy' THEN 'Europe/Nicosia'
     WHEN 'us' THEN 'America/New_York'
     WHEN 'gb' THEN 'Europe/London'
     WHEN 'de' THEN 'Europe/Berlin'
     WHEN 'fr' THEN 'Europe/Paris'
     WHEN 'ch' THEN 'Europe/Zurich'
   END
   WHERE "time_zone" IS NULL AND "code" IN ('cy', 'us', 'gb', 'de', 'fr', 'ch');`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "markets_countries" DROP COLUMN "time_zone";`);
}
