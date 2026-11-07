import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_product_collection_tabs_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_tabs_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_tabs_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_tabs_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  ALTER TYPE "public"."enum_pages_blocks_category_showcase_variant" ADD VALUE 'circles';
  ALTER TYPE "public"."enum_pages_blocks_category_showcase_variant" ADD VALUE 'bento';
  ALTER TYPE "public"."enum_pages_blocks_category_showcase_variant" ADD VALUE 'carousel';
  ALTER TYPE "public"."enum_pages_blocks_category_showcase_variant" ADD VALUE 'list';
  ALTER TYPE "public"."enum_pages_blocks_category_showcase_variant" ADD VALUE 'banner';
  ALTER TYPE "public"."enum_pages_blocks_product_collection_variant" ADD VALUE 'featured-first';
  ALTER TYPE "public"."enum_pages_blocks_product_collection_variant" ADD VALUE 'editorial';
  ALTER TYPE "public"."enum_pages_blocks_product_collection_variant" ADD VALUE 'tabs';
  ALTER TYPE "public"."enum_pages_blocks_product_collection_variant" ADD VALUE 'ranked';
  ALTER TYPE "public"."enum_pages_blocks_product_collection_variant" ADD VALUE 'with-banner';
  ALTER TYPE "public"."enum_pages_blocks_product_collection_variant" ADD VALUE 'compact';
  ALTER TYPE "public"."enum_pages_blocks_product_collection_variant" ADD VALUE 'lookbook';
  ALTER TYPE "public"."enum_pages_blocks_featured_product_variant" ADD VALUE 'overlay';
  ALTER TYPE "public"."enum_pages_blocks_featured_product_variant" ADD VALUE 'gallery';
  ALTER TYPE "public"."enum_pages_blocks_bundle_variant" ADD VALUE 'list';
  ALTER TYPE "public"."enum_pages_blocks_collection_spotlight_variant" ADD VALUE 'stacked';
  ALTER TYPE "public"."enum__pages_v_blocks_category_showcase_variant" ADD VALUE 'circles';
  ALTER TYPE "public"."enum__pages_v_blocks_category_showcase_variant" ADD VALUE 'bento';
  ALTER TYPE "public"."enum__pages_v_blocks_category_showcase_variant" ADD VALUE 'carousel';
  ALTER TYPE "public"."enum__pages_v_blocks_category_showcase_variant" ADD VALUE 'list';
  ALTER TYPE "public"."enum__pages_v_blocks_category_showcase_variant" ADD VALUE 'banner';
  ALTER TYPE "public"."enum__pages_v_blocks_product_collection_variant" ADD VALUE 'featured-first';
  ALTER TYPE "public"."enum__pages_v_blocks_product_collection_variant" ADD VALUE 'editorial';
  ALTER TYPE "public"."enum__pages_v_blocks_product_collection_variant" ADD VALUE 'tabs';
  ALTER TYPE "public"."enum__pages_v_blocks_product_collection_variant" ADD VALUE 'ranked';
  ALTER TYPE "public"."enum__pages_v_blocks_product_collection_variant" ADD VALUE 'with-banner';
  ALTER TYPE "public"."enum__pages_v_blocks_product_collection_variant" ADD VALUE 'compact';
  ALTER TYPE "public"."enum__pages_v_blocks_product_collection_variant" ADD VALUE 'lookbook';
  ALTER TYPE "public"."enum__pages_v_blocks_featured_product_variant" ADD VALUE 'overlay';
  ALTER TYPE "public"."enum__pages_v_blocks_featured_product_variant" ADD VALUE 'gallery';
  ALTER TYPE "public"."enum__pages_v_blocks_bundle_variant" ADD VALUE 'list';
  ALTER TYPE "public"."enum__pages_v_blocks_collection_spotlight_variant" ADD VALUE 'stacked';
  CREATE TABLE "pages_blocks_product_collection_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_source_mode" "enum_pages_blocks_product_collection_tabs_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_pages_blocks_product_collection_tabs_ps_sort" DEFAULT 'newest'
  );
  
  CREATE TABLE "pages_blocks_product_collection_tabs_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_source_mode" "enum__pages_v_blocks_product_collection_tabs_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum__pages_v_blocks_product_collection_tabs_ps_sort" DEFAULT 'newest',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection_tabs_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "pages_blocks_product_collection" ADD COLUMN "media_id" integer;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD COLUMN "media_id" integer;
  ALTER TABLE "pages_blocks_product_collection_tabs" ADD CONSTRAINT "pages_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_tabs" ADD CONSTRAINT "pages_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_tabs" ADD CONSTRAINT "pages_blocks_product_collection_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_tabs_locales" ADD CONSTRAINT "pages_blocks_product_collection_tabs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_collection_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs_locales" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_collection_tabs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_product_collection_tabs_order_idx" ON "pages_blocks_product_collection_tabs" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_collection_tabs_parent_id_idx" ON "pages_blocks_product_collection_tabs" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_collection_tabs_product_source_prod_idx" ON "pages_blocks_product_collection_tabs" USING btree ("product_source_collection_id");
  CREATE INDEX "pages_blocks_product_collection_tabs_product_source_pr_1_idx" ON "pages_blocks_product_collection_tabs" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "pages_blocks_product_collection_tabs_locales_locale_parent_i" ON "pages_blocks_product_collection_tabs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_product_collection_tabs_locales_parent_id_idx" ON "pages_blocks_product_collection_tabs_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_tabs_order_idx" ON "_pages_v_blocks_product_collection_tabs" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_product_collection_tabs_parent_id_idx" ON "_pages_v_blocks_product_collection_tabs" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_tabs_product_source_p_idx" ON "_pages_v_blocks_product_collection_tabs" USING btree ("product_source_collection_id");
  CREATE INDEX "_pages_v_blocks_product_collection_tabs_product_source_1_idx" ON "_pages_v_blocks_product_collection_tabs" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_product_collection_tabs_locales_locale_paren" ON "_pages_v_blocks_product_collection_tabs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_tabs_locales_parent_i_idx" ON "_pages_v_blocks_product_collection_tabs_locales" USING btree ("_parent_id");
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_product_collection_media_idx" ON "pages_blocks_product_collection" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_product_collection_media_idx" ON "_pages_v_blocks_product_collection" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_product_collection_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_product_collection_tabs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_product_collection_tabs" CASCADE;
  DROP TABLE "pages_blocks_product_collection_tabs_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection_tabs" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection_tabs_locales" CASCADE;
  ALTER TABLE "pages_blocks_product_collection" DROP CONSTRAINT "pages_blocks_product_collection_media_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection" DROP CONSTRAINT "_pages_v_blocks_product_collection_media_id_media_id_fk";
  
  ALTER TABLE "pages_blocks_category_showcase" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_category_showcase" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum_pages_blocks_category_showcase_variant";
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_variant" AS ENUM('standard');
  ALTER TABLE "pages_blocks_category_showcase" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum_pages_blocks_category_showcase_variant";
  ALTER TABLE "pages_blocks_category_showcase" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_pages_blocks_category_showcase_variant" USING "variant"::"public"."enum_pages_blocks_category_showcase_variant";
  ALTER TABLE "pages_blocks_product_collection" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_product_collection" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum_pages_blocks_product_collection_variant";
  CREATE TYPE "public"."enum_pages_blocks_product_collection_variant" AS ENUM('standard');
  ALTER TABLE "pages_blocks_product_collection" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum_pages_blocks_product_collection_variant";
  ALTER TABLE "pages_blocks_product_collection" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_pages_blocks_product_collection_variant" USING "variant"::"public"."enum_pages_blocks_product_collection_variant";
  ALTER TABLE "pages_blocks_featured_product" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_featured_product" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum_pages_blocks_featured_product_variant";
  CREATE TYPE "public"."enum_pages_blocks_featured_product_variant" AS ENUM('standard');
  ALTER TABLE "pages_blocks_featured_product" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum_pages_blocks_featured_product_variant";
  ALTER TABLE "pages_blocks_featured_product" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_pages_blocks_featured_product_variant" USING "variant"::"public"."enum_pages_blocks_featured_product_variant";
  ALTER TABLE "pages_blocks_bundle" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_bundle" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum_pages_blocks_bundle_variant";
  CREATE TYPE "public"."enum_pages_blocks_bundle_variant" AS ENUM('standard');
  ALTER TABLE "pages_blocks_bundle" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum_pages_blocks_bundle_variant";
  ALTER TABLE "pages_blocks_bundle" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_pages_blocks_bundle_variant" USING "variant"::"public"."enum_pages_blocks_bundle_variant";
  ALTER TABLE "pages_blocks_collection_spotlight" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_collection_spotlight" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_variant";
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_variant" AS ENUM('standard');
  ALTER TABLE "pages_blocks_collection_spotlight" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum_pages_blocks_collection_spotlight_variant";
  ALTER TABLE "pages_blocks_collection_spotlight" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_pages_blocks_collection_spotlight_variant" USING "variant"::"public"."enum_pages_blocks_collection_spotlight_variant";
  ALTER TABLE "_pages_v_blocks_category_showcase" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_category_showcase" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_variant";
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_variant" AS ENUM('standard');
  ALTER TABLE "_pages_v_blocks_category_showcase" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum__pages_v_blocks_category_showcase_variant";
  ALTER TABLE "_pages_v_blocks_category_showcase" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__pages_v_blocks_category_showcase_variant" USING "variant"::"public"."enum__pages_v_blocks_category_showcase_variant";
  ALTER TABLE "_pages_v_blocks_product_collection" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_product_collection" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_variant";
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_variant" AS ENUM('standard');
  ALTER TABLE "_pages_v_blocks_product_collection" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum__pages_v_blocks_product_collection_variant";
  ALTER TABLE "_pages_v_blocks_product_collection" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__pages_v_blocks_product_collection_variant" USING "variant"::"public"."enum__pages_v_blocks_product_collection_variant";
  ALTER TABLE "_pages_v_blocks_featured_product" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_featured_product" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_variant";
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_variant" AS ENUM('standard');
  ALTER TABLE "_pages_v_blocks_featured_product" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum__pages_v_blocks_featured_product_variant";
  ALTER TABLE "_pages_v_blocks_featured_product" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__pages_v_blocks_featured_product_variant" USING "variant"::"public"."enum__pages_v_blocks_featured_product_variant";
  ALTER TABLE "_pages_v_blocks_bundle" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_bundle" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum__pages_v_blocks_bundle_variant";
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_variant" AS ENUM('standard');
  ALTER TABLE "_pages_v_blocks_bundle" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum__pages_v_blocks_bundle_variant";
  ALTER TABLE "_pages_v_blocks_bundle" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__pages_v_blocks_bundle_variant" USING "variant"::"public"."enum__pages_v_blocks_bundle_variant";
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_variant";
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_variant" AS ENUM('standard');
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum__pages_v_blocks_collection_spotlight_variant";
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__pages_v_blocks_collection_spotlight_variant" USING "variant"::"public"."enum__pages_v_blocks_collection_spotlight_variant";
  DROP INDEX "pages_blocks_product_collection_media_idx";
  DROP INDEX "_pages_v_blocks_product_collection_media_idx";
  ALTER TABLE "pages_blocks_product_collection" DROP COLUMN "media_id";
  ALTER TABLE "_pages_v_blocks_product_collection" DROP COLUMN "media_id";
  DROP TYPE "public"."enum_pages_blocks_product_collection_tabs_ps_mode";
  DROP TYPE "public"."enum_pages_blocks_product_collection_tabs_ps_sort";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_tabs_ps_mode";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_tabs_ps_sort";`)
}
