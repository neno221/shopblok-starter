import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_templates_listing_card" AS ENUM('standard', 'swatches', 'quick-add', 'overlay', 'minimal', 'horizontal', 'compact', 'editorial', 'bordered', 'image-swap');
  CREATE TYPE "public"."enum__templates_v_version_listing_card" AS ENUM('standard', 'swatches', 'quick-add', 'overlay', 'minimal', 'horizontal', 'compact', 'editorial', 'bordered', 'image-swap');
  ALTER TYPE "public"."enum_templates_listing_variant" ADD VALUE 'top-bar';
  ALTER TYPE "public"."enum_templates_listing_variant" ADD VALUE 'drawer';
  ALTER TYPE "public"."enum_templates_listing_variant" ADD VALUE 'accordion';
  ALTER TYPE "public"."enum_templates_listing_variant" ADD VALUE 'chips';
  ALTER TYPE "public"."enum_templates_listing_variant" ADD VALUE 'rail';
  ALTER TYPE "public"."enum_templates_listing_variant" ADD VALUE 'inline';
  ALTER TYPE "public"."enum__templates_v_version_listing_variant" ADD VALUE 'top-bar';
  ALTER TYPE "public"."enum__templates_v_version_listing_variant" ADD VALUE 'drawer';
  ALTER TYPE "public"."enum__templates_v_version_listing_variant" ADD VALUE 'accordion';
  ALTER TYPE "public"."enum__templates_v_version_listing_variant" ADD VALUE 'chips';
  ALTER TYPE "public"."enum__templates_v_version_listing_variant" ADD VALUE 'rail';
  ALTER TYPE "public"."enum__templates_v_version_listing_variant" ADD VALUE 'inline';
  ALTER TABLE "templates" ADD COLUMN "listing_card" "enum_templates_listing_card" DEFAULT 'standard';
  ALTER TABLE "_templates_v" ADD COLUMN "version_listing_card" "enum__templates_v_version_listing_card" DEFAULT 'standard';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" ALTER COLUMN "listing_variant" SET DATA TYPE text;
  ALTER TABLE "templates" ALTER COLUMN "listing_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_templates_listing_variant";
  CREATE TYPE "public"."enum_templates_listing_variant" AS ENUM('default');
  ALTER TABLE "templates" ALTER COLUMN "listing_variant" SET DEFAULT 'default'::"public"."enum_templates_listing_variant";
  ALTER TABLE "templates" ALTER COLUMN "listing_variant" SET DATA TYPE "public"."enum_templates_listing_variant" USING "listing_variant"::"public"."enum_templates_listing_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_listing_variant" SET DATA TYPE text;
  ALTER TABLE "_templates_v" ALTER COLUMN "version_listing_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum__templates_v_version_listing_variant";
  CREATE TYPE "public"."enum__templates_v_version_listing_variant" AS ENUM('default');
  ALTER TABLE "_templates_v" ALTER COLUMN "version_listing_variant" SET DEFAULT 'default'::"public"."enum__templates_v_version_listing_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_listing_variant" SET DATA TYPE "public"."enum__templates_v_version_listing_variant" USING "version_listing_variant"::"public"."enum__templates_v_version_listing_variant";
  ALTER TABLE "templates" DROP COLUMN "listing_card";
  ALTER TABLE "_templates_v" DROP COLUMN "version_listing_card";
  DROP TYPE "public"."enum_templates_listing_card";
  DROP TYPE "public"."enum__templates_v_version_listing_card";`)
}
