import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_redirects_to_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_redirects_type" AS ENUM('301', '302', '308');
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_type" "enum_redirects_to_type" DEFAULT 'reference',
  	"to_url" varchar,
  	"type" "enum_redirects_type" DEFAULT '301' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer
  );
  
  ALTER TABLE "pages_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_description" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_image_id" integer;
  ALTER TABLE "posts_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_meta_description" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_meta_image_id" integer;
  ALTER TABLE "products_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "products_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "products_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "categories_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "categories_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "categories_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "collections_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "collections_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "collections_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" integer;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "redirects_rels_order_idx" ON "redirects_rels" USING btree ("order");
  CREATE INDEX "redirects_rels_parent_idx" ON "redirects_rels" USING btree ("parent_id");
  CREATE INDEX "redirects_rels_path_idx" ON "redirects_rels" USING btree ("path");
  CREATE INDEX "redirects_rels_pages_id_idx" ON "redirects_rels" USING btree ("pages_id");
  CREATE INDEX "redirects_rels_posts_id_idx" ON "redirects_rels" USING btree ("posts_id");
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_locales" ADD CONSTRAINT "collections_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE INDEX "posts_meta_meta_image_idx" ON "posts_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "_posts_v_version_meta_version_meta_image_idx" ON "_posts_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE INDEX "products_meta_meta_image_idx" ON "products_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "categories_meta_meta_image_idx" ON "categories_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "collections_meta_meta_image_idx" ON "collections_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "redirects_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "redirects_rels" CASCADE;
  ALTER TABLE "pages_locales" DROP CONSTRAINT IF EXISTS "pages_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_locales" DROP CONSTRAINT IF EXISTS "_pages_v_locales_version_meta_image_id_media_id_fk";
  
  ALTER TABLE "posts_locales" DROP CONSTRAINT IF EXISTS "posts_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "_posts_v_locales" DROP CONSTRAINT IF EXISTS "_posts_v_locales_version_meta_image_id_media_id_fk";
  
  ALTER TABLE "products_locales" DROP CONSTRAINT IF EXISTS "products_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "categories_locales" DROP CONSTRAINT IF EXISTS "categories_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "collections_locales" DROP CONSTRAINT IF EXISTS "collections_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_redirects_fk";
  
  DROP INDEX "pages_meta_meta_image_idx";
  DROP INDEX "_pages_v_version_meta_version_meta_image_idx";
  DROP INDEX "posts_meta_meta_image_idx";
  DROP INDEX "_posts_v_version_meta_version_meta_image_idx";
  DROP INDEX "products_meta_meta_image_idx";
  DROP INDEX "categories_meta_meta_image_idx";
  DROP INDEX "collections_meta_meta_image_idx";
  DROP INDEX "payload_locked_documents_rels_redirects_id_idx";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_title";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_description";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_title";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_description";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_image_id";
  ALTER TABLE "posts_locales" DROP COLUMN "meta_title";
  ALTER TABLE "posts_locales" DROP COLUMN "meta_description";
  ALTER TABLE "posts_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_meta_title";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_meta_description";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_meta_image_id";
  ALTER TABLE "products_locales" DROP COLUMN "meta_title";
  ALTER TABLE "products_locales" DROP COLUMN "meta_description";
  ALTER TABLE "products_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "categories_locales" DROP COLUMN "meta_title";
  ALTER TABLE "categories_locales" DROP COLUMN "meta_description";
  ALTER TABLE "categories_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "collections_locales" DROP COLUMN "meta_title";
  ALTER TABLE "collections_locales" DROP COLUMN "meta_description";
  ALTER TABLE "collections_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  DROP TYPE "public"."enum_redirects_to_type";
  DROP TYPE "public"."enum_redirects_type";`)
}
