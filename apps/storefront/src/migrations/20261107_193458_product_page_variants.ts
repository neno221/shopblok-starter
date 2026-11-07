import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_templates_product_page_variant" ADD VALUE 'thumbnails-below';
  ALTER TYPE "public"."enum_templates_product_page_variant" ADD VALUE 'grid';
  ALTER TYPE "public"."enum_templates_product_page_variant" ADD VALUE 'stacked';
  ALTER TYPE "public"."enum_templates_product_page_variant" ADD VALUE 'wide';
  ALTER TYPE "public"."enum_templates_product_page_variant" ADD VALUE 'centered';
  ALTER TYPE "public"."enum_templates_quick_view_variant" ADD VALUE 'drawer';
  ALTER TYPE "public"."enum_templates_quick_view_variant" ADD VALUE 'compact';
  ALTER TYPE "public"."enum__templates_v_version_product_page_variant" ADD VALUE 'thumbnails-below';
  ALTER TYPE "public"."enum__templates_v_version_product_page_variant" ADD VALUE 'grid';
  ALTER TYPE "public"."enum__templates_v_version_product_page_variant" ADD VALUE 'stacked';
  ALTER TYPE "public"."enum__templates_v_version_product_page_variant" ADD VALUE 'wide';
  ALTER TYPE "public"."enum__templates_v_version_product_page_variant" ADD VALUE 'centered';
  ALTER TYPE "public"."enum__templates_v_version_quick_view_variant" ADD VALUE 'drawer';
  ALTER TYPE "public"."enum__templates_v_version_quick_view_variant" ADD VALUE 'compact';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" ALTER COLUMN "product_page_variant" SET DATA TYPE text;
  ALTER TABLE "templates" ALTER COLUMN "product_page_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_templates_product_page_variant";
  CREATE TYPE "public"."enum_templates_product_page_variant" AS ENUM('default');
  ALTER TABLE "templates" ALTER COLUMN "product_page_variant" SET DEFAULT 'default'::"public"."enum_templates_product_page_variant";
  ALTER TABLE "templates" ALTER COLUMN "product_page_variant" SET DATA TYPE "public"."enum_templates_product_page_variant" USING "product_page_variant"::"public"."enum_templates_product_page_variant";
  ALTER TABLE "templates" ALTER COLUMN "quick_view_variant" SET DATA TYPE text;
  ALTER TABLE "templates" ALTER COLUMN "quick_view_variant" SET DEFAULT 'off'::text;
  DROP TYPE "public"."enum_templates_quick_view_variant";
  CREATE TYPE "public"."enum_templates_quick_view_variant" AS ENUM('off', 'default');
  ALTER TABLE "templates" ALTER COLUMN "quick_view_variant" SET DEFAULT 'off'::"public"."enum_templates_quick_view_variant";
  ALTER TABLE "templates" ALTER COLUMN "quick_view_variant" SET DATA TYPE "public"."enum_templates_quick_view_variant" USING "quick_view_variant"::"public"."enum_templates_quick_view_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_product_page_variant" SET DATA TYPE text;
  ALTER TABLE "_templates_v" ALTER COLUMN "version_product_page_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum__templates_v_version_product_page_variant";
  CREATE TYPE "public"."enum__templates_v_version_product_page_variant" AS ENUM('default');
  ALTER TABLE "_templates_v" ALTER COLUMN "version_product_page_variant" SET DEFAULT 'default'::"public"."enum__templates_v_version_product_page_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_product_page_variant" SET DATA TYPE "public"."enum__templates_v_version_product_page_variant" USING "version_product_page_variant"::"public"."enum__templates_v_version_product_page_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_quick_view_variant" SET DATA TYPE text;
  ALTER TABLE "_templates_v" ALTER COLUMN "version_quick_view_variant" SET DEFAULT 'off'::text;
  DROP TYPE "public"."enum__templates_v_version_quick_view_variant";
  CREATE TYPE "public"."enum__templates_v_version_quick_view_variant" AS ENUM('off', 'default');
  ALTER TABLE "_templates_v" ALTER COLUMN "version_quick_view_variant" SET DEFAULT 'off'::"public"."enum__templates_v_version_quick_view_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_quick_view_variant" SET DATA TYPE "public"."enum__templates_v_version_quick_view_variant" USING "version_quick_view_variant"::"public"."enum__templates_v_version_quick_view_variant";`)
}
