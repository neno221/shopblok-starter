import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_templates_cart_picks_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_templates_cart_picks_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__templates_v_version_cart_picks_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__templates_v_version_cart_picks_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  ALTER TYPE "public"."enum_templates_cart_variant" ADD VALUE 'table';
  ALTER TYPE "public"."enum_templates_cart_variant" ADD VALUE 'sticky-summary';
  ALTER TYPE "public"."enum_templates_cart_variant" ADD VALUE 'focused';
  ALTER TYPE "public"."enum_templates_cart_mini_cart" ADD VALUE 'drawer-picks' BEFORE 'page';
  ALTER TYPE "public"."enum__templates_v_version_cart_variant" ADD VALUE 'table';
  ALTER TYPE "public"."enum__templates_v_version_cart_variant" ADD VALUE 'sticky-summary';
  ALTER TYPE "public"."enum__templates_v_version_cart_variant" ADD VALUE 'focused';
  ALTER TYPE "public"."enum__templates_v_version_cart_mini_cart" ADD VALUE 'drawer-picks' BEFORE 'page';
  CREATE TABLE "templates_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "_templates_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  ALTER TABLE "templates" ADD COLUMN "cart_picks_mode" "enum_templates_cart_picks_ps_mode" DEFAULT 'newest';
  ALTER TABLE "templates" ADD COLUMN "cart_picks_collection_id" integer;
  ALTER TABLE "templates" ADD COLUMN "cart_picks_category_id" integer;
  ALTER TABLE "templates" ADD COLUMN "cart_picks_descendants" boolean DEFAULT true;
  ALTER TABLE "templates" ADD COLUMN "cart_picks_tag" varchar;
  ALTER TABLE "templates" ADD COLUMN "cart_picks_type" varchar;
  ALTER TABLE "templates" ADD COLUMN "cart_picks_limit" numeric DEFAULT 4;
  ALTER TABLE "templates" ADD COLUMN "cart_picks_sort" "enum_templates_cart_picks_ps_sort" DEFAULT 'newest';
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_mode" "enum__templates_v_version_cart_picks_ps_mode" DEFAULT 'newest';
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_collection_id" integer;
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_category_id" integer;
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_descendants" boolean DEFAULT true;
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_tag" varchar;
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_type" varchar;
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_limit" numeric DEFAULT 4;
  ALTER TABLE "_templates_v" ADD COLUMN "version_cart_picks_sort" "enum__templates_v_version_cart_picks_ps_sort" DEFAULT 'newest';
  ALTER TABLE "templates_rels" ADD CONSTRAINT "templates_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_rels" ADD CONSTRAINT "templates_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_rels" ADD CONSTRAINT "_templates_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_rels" ADD CONSTRAINT "_templates_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "templates_rels_order_idx" ON "templates_rels" USING btree ("order");
  CREATE INDEX "templates_rels_parent_idx" ON "templates_rels" USING btree ("parent_id");
  CREATE INDEX "templates_rels_path_idx" ON "templates_rels" USING btree ("path");
  CREATE INDEX "templates_rels_products_id_idx" ON "templates_rels" USING btree ("products_id");
  CREATE INDEX "_templates_v_rels_order_idx" ON "_templates_v_rels" USING btree ("order");
  CREATE INDEX "_templates_v_rels_parent_idx" ON "_templates_v_rels" USING btree ("parent_id");
  CREATE INDEX "_templates_v_rels_path_idx" ON "_templates_v_rels" USING btree ("path");
  CREATE INDEX "_templates_v_rels_products_id_idx" ON "_templates_v_rels" USING btree ("products_id");
  ALTER TABLE "templates" ADD CONSTRAINT "templates_cart_picks_collection_id_collections_id_fk" FOREIGN KEY ("cart_picks_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates" ADD CONSTRAINT "templates_cart_picks_category_id_categories_id_fk" FOREIGN KEY ("cart_picks_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v" ADD CONSTRAINT "_templates_v_version_cart_picks_collection_id_collections_id_fk" FOREIGN KEY ("version_cart_picks_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v" ADD CONSTRAINT "_templates_v_version_cart_picks_category_id_categories_id_fk" FOREIGN KEY ("version_cart_picks_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "templates_cart_picks_cart_picks_collection_idx" ON "templates" USING btree ("cart_picks_collection_id");
  CREATE INDEX "templates_cart_picks_cart_picks_category_idx" ON "templates" USING btree ("cart_picks_category_id");
  CREATE INDEX "_templates_v_version_cart_picks_version_cart_picks_colle_idx" ON "_templates_v" USING btree ("version_cart_picks_collection_id");
  CREATE INDEX "_templates_v_version_cart_picks_version_cart_picks_categ_idx" ON "_templates_v" USING btree ("version_cart_picks_category_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "templates_rels" CASCADE;
  DROP TABLE "_templates_v_rels" CASCADE;
  ALTER TABLE "templates" DROP CONSTRAINT "templates_cart_picks_collection_id_collections_id_fk";
  
  ALTER TABLE "templates" DROP CONSTRAINT "templates_cart_picks_category_id_categories_id_fk";
  
  ALTER TABLE "_templates_v" DROP CONSTRAINT "_templates_v_version_cart_picks_collection_id_collections_id_fk";
  
  ALTER TABLE "_templates_v" DROP CONSTRAINT "_templates_v_version_cart_picks_category_id_categories_id_fk";
  
  ALTER TABLE "templates" ALTER COLUMN "cart_variant" SET DATA TYPE text;
  ALTER TABLE "templates" ALTER COLUMN "cart_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_templates_cart_variant";
  CREATE TYPE "public"."enum_templates_cart_variant" AS ENUM('default');
  ALTER TABLE "templates" ALTER COLUMN "cart_variant" SET DEFAULT 'default'::"public"."enum_templates_cart_variant";
  ALTER TABLE "templates" ALTER COLUMN "cart_variant" SET DATA TYPE "public"."enum_templates_cart_variant" USING "cart_variant"::"public"."enum_templates_cart_variant";
  ALTER TABLE "templates" ALTER COLUMN "cart_mini_cart" SET DATA TYPE text;
  ALTER TABLE "templates" ALTER COLUMN "cart_mini_cart" SET DEFAULT 'drawer'::text;
  DROP TYPE "public"."enum_templates_cart_mini_cart";
  CREATE TYPE "public"."enum_templates_cart_mini_cart" AS ENUM('drawer', 'page');
  ALTER TABLE "templates" ALTER COLUMN "cart_mini_cart" SET DEFAULT 'drawer'::"public"."enum_templates_cart_mini_cart";
  ALTER TABLE "templates" ALTER COLUMN "cart_mini_cart" SET DATA TYPE "public"."enum_templates_cart_mini_cart" USING "cart_mini_cart"::"public"."enum_templates_cart_mini_cart";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_variant" SET DATA TYPE text;
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum__templates_v_version_cart_variant";
  CREATE TYPE "public"."enum__templates_v_version_cart_variant" AS ENUM('default');
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_variant" SET DEFAULT 'default'::"public"."enum__templates_v_version_cart_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_variant" SET DATA TYPE "public"."enum__templates_v_version_cart_variant" USING "version_cart_variant"::"public"."enum__templates_v_version_cart_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_mini_cart" SET DATA TYPE text;
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_mini_cart" SET DEFAULT 'drawer'::text;
  DROP TYPE "public"."enum__templates_v_version_cart_mini_cart";
  CREATE TYPE "public"."enum__templates_v_version_cart_mini_cart" AS ENUM('drawer', 'page');
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_mini_cart" SET DEFAULT 'drawer'::"public"."enum__templates_v_version_cart_mini_cart";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_cart_mini_cart" SET DATA TYPE "public"."enum__templates_v_version_cart_mini_cart" USING "version_cart_mini_cart"::"public"."enum__templates_v_version_cart_mini_cart";
  DROP INDEX "templates_cart_picks_cart_picks_collection_idx";
  DROP INDEX "templates_cart_picks_cart_picks_category_idx";
  DROP INDEX "_templates_v_version_cart_picks_version_cart_picks_colle_idx";
  DROP INDEX "_templates_v_version_cart_picks_version_cart_picks_categ_idx";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_mode";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_collection_id";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_category_id";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_descendants";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_tag";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_type";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_limit";
  ALTER TABLE "templates" DROP COLUMN "cart_picks_sort";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_mode";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_collection_id";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_category_id";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_descendants";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_tag";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_type";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_limit";
  ALTER TABLE "_templates_v" DROP COLUMN "version_cart_picks_sort";
  DROP TYPE "public"."enum_templates_cart_picks_ps_mode";
  DROP TYPE "public"."enum_templates_cart_picks_ps_sort";
  DROP TYPE "public"."enum__templates_v_version_cart_picks_ps_mode";
  DROP TYPE "public"."enum__templates_v_version_cart_picks_ps_sort";`)
}
