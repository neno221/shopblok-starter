import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pages_blocks_hero_variant" ADD VALUE 'overlay';
  ALTER TYPE "public"."enum_pages_blocks_hero_variant" ADD VALUE 'centered';
  ALTER TYPE "public"."enum_pages_blocks_hero_variant" ADD VALUE 'editorial';
  ALTER TYPE "public"."enum_pages_blocks_hero_variant" ADD VALUE 'bento';
  ALTER TYPE "public"."enum_pages_blocks_hero_variant" ADD VALUE 'collection-switcher';
  ALTER TYPE "public"."enum_pages_blocks_hero_variant" ADD VALUE 'product';
  ALTER TYPE "public"."enum_pages_blocks_hero_variant" ADD VALUE 'text';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_variant" ADD VALUE 'overlay';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_variant" ADD VALUE 'centered';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_variant" ADD VALUE 'editorial';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_variant" ADD VALUE 'bento';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_variant" ADD VALUE 'collection-switcher';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_variant" ADD VALUE 'product';
  ALTER TYPE "public"."enum__pages_v_blocks_hero_variant" ADD VALUE 'text';
  ALTER TYPE "public"."enum_header_design" ADD VALUE 'transparent';
  ALTER TYPE "public"."enum__header_v_version_design" ADD VALUE 'transparent';
  CREATE TABLE "pages_blocks_hero_collections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"collection_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_hero_collections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection_id" integer,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "second_media_id" integer;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "second_media_id" integer;
  ALTER TABLE "pages_blocks_hero_collections" ADD CONSTRAINT "pages_blocks_hero_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_collections" ADD CONSTRAINT "pages_blocks_hero_collections_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_collections" ADD CONSTRAINT "pages_blocks_hero_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_collections" ADD CONSTRAINT "_pages_v_blocks_hero_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_collections" ADD CONSTRAINT "_pages_v_blocks_hero_collections_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_collections" ADD CONSTRAINT "_pages_v_blocks_hero_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_collections_order_idx" ON "pages_blocks_hero_collections" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_collections_parent_id_idx" ON "pages_blocks_hero_collections" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_collections_collection_idx" ON "pages_blocks_hero_collections" USING btree ("collection_id");
  CREATE INDEX "pages_blocks_hero_collections_media_idx" ON "pages_blocks_hero_collections" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_hero_collections_order_idx" ON "_pages_v_blocks_hero_collections" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_collections_parent_id_idx" ON "_pages_v_blocks_hero_collections" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_collections_collection_idx" ON "_pages_v_blocks_hero_collections" USING btree ("collection_id");
  CREATE INDEX "_pages_v_blocks_hero_collections_media_idx" ON "_pages_v_blocks_hero_collections" USING btree ("media_id");
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_second_media_id_media_id_fk" FOREIGN KEY ("second_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_second_media_id_media_id_fk" FOREIGN KEY ("second_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_second_media_idx" ON "pages_blocks_hero" USING btree ("second_media_id");
  CREATE INDEX "_pages_v_blocks_hero_second_media_idx" ON "_pages_v_blocks_hero" USING btree ("second_media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero_collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_collections" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_hero_collections" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_collections" CASCADE;
  ALTER TABLE "pages_blocks_hero" DROP CONSTRAINT "pages_blocks_hero_second_media_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_second_media_id_media_id_fk";
  
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum_pages_blocks_hero_variant";
  CREATE TYPE "public"."enum_pages_blocks_hero_variant" AS ENUM('standard');
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum_pages_blocks_hero_variant";
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_pages_blocks_hero_variant" USING "variant"::"public"."enum_pages_blocks_hero_variant";
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum__pages_v_blocks_hero_variant";
  CREATE TYPE "public"."enum__pages_v_blocks_hero_variant" AS ENUM('standard');
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'standard'::"public"."enum__pages_v_blocks_hero_variant";
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__pages_v_blocks_hero_variant" USING "variant"::"public"."enum__pages_v_blocks_hero_variant";
  ALTER TABLE "header" ALTER COLUMN "design" SET DATA TYPE text;
  ALTER TABLE "header" ALTER COLUMN "design" SET DEFAULT 'classic'::text;
  DROP TYPE "public"."enum_header_design";
  CREATE TYPE "public"."enum_header_design" AS ENUM('classic', 'centered', 'two-tier', 'mega-menu', 'minimal');
  ALTER TABLE "header" ALTER COLUMN "design" SET DEFAULT 'classic'::"public"."enum_header_design";
  ALTER TABLE "header" ALTER COLUMN "design" SET DATA TYPE "public"."enum_header_design" USING "design"::"public"."enum_header_design";
  ALTER TABLE "_header_v" ALTER COLUMN "version_design" SET DATA TYPE text;
  ALTER TABLE "_header_v" ALTER COLUMN "version_design" SET DEFAULT 'classic'::text;
  DROP TYPE "public"."enum__header_v_version_design";
  CREATE TYPE "public"."enum__header_v_version_design" AS ENUM('classic', 'centered', 'two-tier', 'mega-menu', 'minimal');
  ALTER TABLE "_header_v" ALTER COLUMN "version_design" SET DEFAULT 'classic'::"public"."enum__header_v_version_design";
  ALTER TABLE "_header_v" ALTER COLUMN "version_design" SET DATA TYPE "public"."enum__header_v_version_design" USING "version_design"::"public"."enum__header_v_version_design";
  DROP INDEX "pages_blocks_hero_second_media_idx";
  DROP INDEX "_pages_v_blocks_hero_second_media_idx";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "second_media_id";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "second_media_id";`)
}
