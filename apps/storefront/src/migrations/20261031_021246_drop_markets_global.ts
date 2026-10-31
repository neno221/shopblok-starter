import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "markets_countries_languages" CASCADE;
  DROP TABLE IF EXISTS "markets_countries" CASCADE;
  DROP TABLE IF EXISTS "markets_languages" CASCADE;
  DROP TABLE IF EXISTS "markets_synced_regions" CASCADE;
  DROP TABLE IF EXISTS "markets" CASCADE;
  DROP TABLE IF EXISTS "markets_texts" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_markets_countries_languages";
  DROP TYPE IF EXISTS "public"."enum_markets_languages_code";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_markets_countries_languages" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_markets_languages_code" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TABLE "markets_countries_languages" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_markets_countries_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "markets_countries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"domain" varchar,
  	"time_zone" varchar
  );
  
  CREATE TABLE "markets_languages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" "enum_markets_languages_code" NOT NULL,
  	"medusa_locale" varchar NOT NULL,
  	"html_lang" varchar
  );
  
  CREATE TABLE "markets_synced_regions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"medusa_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"currency" varchar NOT NULL
  );
  
  CREATE TABLE "markets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_country" varchar,
  	"fallback_market" varchar,
  	"synced_default_currency" varchar,
  	"synced_synced_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "markets_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "markets_countries_languages" ADD CONSTRAINT "markets_countries_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."markets_countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "markets_countries" ADD CONSTRAINT "markets_countries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "markets_languages" ADD CONSTRAINT "markets_languages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "markets_synced_regions" ADD CONSTRAINT "markets_synced_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "markets_texts" ADD CONSTRAINT "markets_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "markets_countries_languages_order_idx" ON "markets_countries_languages" USING btree ("order");
  CREATE INDEX "markets_countries_languages_parent_idx" ON "markets_countries_languages" USING btree ("parent_id");
  CREATE INDEX "markets_countries_order_idx" ON "markets_countries" USING btree ("_order");
  CREATE INDEX "markets_countries_parent_id_idx" ON "markets_countries" USING btree ("_parent_id");
  CREATE INDEX "markets_languages_order_idx" ON "markets_languages" USING btree ("_order");
  CREATE INDEX "markets_languages_parent_id_idx" ON "markets_languages" USING btree ("_parent_id");
  CREATE INDEX "markets_synced_regions_order_idx" ON "markets_synced_regions" USING btree ("_order");
  CREATE INDEX "markets_synced_regions_parent_id_idx" ON "markets_synced_regions" USING btree ("_parent_id");
  CREATE INDEX "markets_texts_order_parent" ON "markets_texts" USING btree ("order","parent_id");`)
}
