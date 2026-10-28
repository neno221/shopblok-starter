import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_exports_format" AS ENUM('csv', 'json');
  CREATE TYPE "public"."enum_exports_sort_order" AS ENUM('asc', 'desc');
  CREATE TYPE "public"."enum_exports_locale" AS ENUM('all', 'en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_exports_drafts" AS ENUM('yes', 'no');
  CREATE TYPE "public"."enum_imports_import_mode" AS ENUM('create', 'update', 'upsert');
  CREATE TYPE "public"."enum_imports_status" AS ENUM('pending', 'completed', 'partial', 'failed');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'createCollectionExport' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'createCollectionImport' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'createCollectionExport' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'createCollectionImport' BEFORE 'schedulePublish';
  CREATE TABLE "ui_strings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"namespace" varchar,
  	"source_message" varchar,
  	"source_arguments" varchar,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ui_strings_locales" (
  	"value" varchar,
  	"seeded" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "exports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"format" "enum_exports_format" DEFAULT 'csv' NOT NULL,
  	"limit" numeric,
  	"page" numeric DEFAULT 1,
  	"sort" varchar,
  	"sort_order" "enum_exports_sort_order",
  	"locale" "enum_exports_locale" DEFAULT 'all',
  	"drafts" "enum_exports_drafts" DEFAULT 'yes',
  	"collection_slug" varchar DEFAULT 'ui-strings' NOT NULL,
  	"where" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "exports_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "imports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection_slug" varchar DEFAULT 'ui-strings' NOT NULL,
  	"import_mode" "enum_imports_import_mode" DEFAULT 'update',
  	"match_field" varchar DEFAULT 'key',
  	"status" "enum_imports_status" DEFAULT 'pending',
  	"summary_imported" numeric,
  	"summary_updated" numeric,
  	"summary_total" numeric,
  	"summary_issues" numeric,
  	"summary_issue_details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ui_strings_id" integer;
  ALTER TABLE "ui_strings_locales" ADD CONSTRAINT "ui_strings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ui_strings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exports_texts" ADD CONSTRAINT "exports_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "ui_strings_key_idx" ON "ui_strings" USING btree ("key");
  CREATE INDEX "ui_strings_namespace_idx" ON "ui_strings" USING btree ("namespace");
  CREATE INDEX "ui_strings_updated_at_idx" ON "ui_strings" USING btree ("updated_at");
  CREATE INDEX "ui_strings_created_at_idx" ON "ui_strings" USING btree ("created_at");
  CREATE UNIQUE INDEX "ui_strings_locales_locale_parent_id_unique" ON "ui_strings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ui_strings_locales_parent_id_idx" ON "ui_strings_locales" USING btree ("_parent_id");
  CREATE INDEX "exports_updated_at_idx" ON "exports" USING btree ("updated_at");
  CREATE INDEX "exports_created_at_idx" ON "exports" USING btree ("created_at");
  CREATE UNIQUE INDEX "exports_filename_idx" ON "exports" USING btree ("filename");
  CREATE INDEX "exports_texts_order_parent" ON "exports_texts" USING btree ("order","parent_id");
  CREATE INDEX "imports_updated_at_idx" ON "imports" USING btree ("updated_at");
  CREATE INDEX "imports_created_at_idx" ON "imports" USING btree ("created_at");
  CREATE UNIQUE INDEX "imports_filename_idx" ON "imports" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ui_strings_fk" FOREIGN KEY ("ui_strings_id") REFERENCES "public"."ui_strings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ui_strings_id_idx" ON "payload_locked_documents_rels" USING btree ("ui_strings_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ui_strings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ui_strings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "exports" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "exports_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "imports" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ui_strings" CASCADE;
  DROP TABLE "ui_strings_locales" CASCADE;
  DROP TABLE "exports" CASCADE;
  DROP TABLE "exports_texts" CASCADE;
  DROP TABLE "imports" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ui_strings_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_ui_strings_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ui_strings_id";
  DROP TYPE "public"."enum_exports_format";
  DROP TYPE "public"."enum_exports_sort_order";
  DROP TYPE "public"."enum_exports_locale";
  DROP TYPE "public"."enum_exports_drafts";
  DROP TYPE "public"."enum_imports_import_mode";
  DROP TYPE "public"."enum_imports_status";`);
}
