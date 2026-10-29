import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_editorial_list_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_source" AS ENUM('newest', 'handpicked');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_source" AS ENUM('newest', 'handpicked');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TABLE "pages_blocks_editorial_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_editorial_list_variant" DEFAULT 'standard',
  	"source" "enum_pages_blocks_editorial_list_source" DEFAULT 'newest',
  	"limit" numeric DEFAULT 3,
  	"show_link" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_editorial_list_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_editorial_list_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_editorial_list_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_editorial_list_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_editorial_list_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_editorial_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_editorial_list_variant" DEFAULT 'standard',
  	"source" "enum__pages_v_blocks_editorial_list_source" DEFAULT 'newest',
  	"limit" numeric DEFAULT 3,
  	"show_link" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_editorial_list_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_editorial_list_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_editorial_list_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_editorial_list_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_editorial_list_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"author" varchar,
  	"hero_id" integer,
  	"seed_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_locales" (
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_author" varchar,
  	"version_hero_id" integer,
  	"version_seed_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__posts_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_posts_v_locales" (
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "pages_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "pages_blocks_editorial_list" ADD CONSTRAINT "pages_blocks_editorial_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_editorial_list_locales" ADD CONSTRAINT "pages_blocks_editorial_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_editorial_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_editorial_list" ADD CONSTRAINT "_pages_v_blocks_editorial_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_editorial_list_locales" ADD CONSTRAINT "_pages_v_blocks_editorial_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_editorial_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_hero_id_media_id_fk" FOREIGN KEY ("version_hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_editorial_list_order_idx" ON "pages_blocks_editorial_list" USING btree ("_order");
  CREATE INDEX "pages_blocks_editorial_list_parent_id_idx" ON "pages_blocks_editorial_list" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_editorial_list_path_idx" ON "pages_blocks_editorial_list" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_editorial_list_locales_locale_parent_id_unique" ON "pages_blocks_editorial_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_editorial_list_locales_parent_id_idx" ON "pages_blocks_editorial_list_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_editorial_list_order_idx" ON "_pages_v_blocks_editorial_list" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_editorial_list_parent_id_idx" ON "_pages_v_blocks_editorial_list" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_editorial_list_path_idx" ON "_pages_v_blocks_editorial_list" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_editorial_list_locales_locale_parent_id_uniq" ON "_pages_v_blocks_editorial_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_editorial_list_locales_parent_id_idx" ON "_pages_v_blocks_editorial_list_locales" USING btree ("_parent_id");
  CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");
  CREATE INDEX "posts_hero_idx" ON "posts" USING btree ("hero_id");
  CREATE UNIQUE INDEX "posts_seed_key_idx" ON "posts" USING btree ("seed_key");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_slug_idx" ON "posts_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_locales_parent_id_idx" ON "posts_locales" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_version_hero_idx" ON "_posts_v" USING btree ("version_hero_id");
  CREATE INDEX "_posts_v_version_version_seed_key_idx" ON "_posts_v" USING btree ("version_seed_key");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_snapshot_idx" ON "_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "_posts_v" USING btree ("published_locale");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_autosave_idx" ON "_posts_v" USING btree ("autosave");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v_locales" USING btree ("version_slug","_locale");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_locales_parent_id_idx" ON "_posts_v_locales" USING btree ("_parent_id");
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_posts_id_idx" ON "pages_rels" USING btree ("posts_id");
  CREATE INDEX "_pages_v_rels_posts_id_idx" ON "_pages_v_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_editorial_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_editorial_list_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_editorial_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_editorial_list_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_editorial_list" CASCADE;
  DROP TABLE "pages_blocks_editorial_list_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_editorial_list" CASCADE;
  DROP TABLE "_pages_v_blocks_editorial_list_locales" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_locales" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_locales" CASCADE;
  ALTER TABLE "pages_rels" DROP CONSTRAINT IF EXISTS "pages_rels_posts_fk";
  
  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT IF EXISTS "_pages_v_rels_posts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_posts_fk";
  
  DROP INDEX "pages_rels_posts_id_idx";
  DROP INDEX "_pages_v_rels_posts_id_idx";
  DROP INDEX "payload_locked_documents_rels_posts_id_idx";
  ALTER TABLE "pages_rels" DROP COLUMN "posts_id";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "posts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "posts_id";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_variant";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_source";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_ss_container";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_variant";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_source";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_ss_visibility";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum__posts_v_published_locale";`)
}
