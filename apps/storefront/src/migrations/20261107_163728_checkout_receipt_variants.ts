import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_templates_checkout_variant" ADD VALUE 'one-page';
  ALTER TYPE "public"."enum_templates_checkout_variant" ADD VALUE 'summary-first';
  ALTER TYPE "public"."enum_templates_checkout_variant" ADD VALUE 'focused';
  ALTER TYPE "public"."enum_templates_checkout_variant" ADD VALUE 'express-rail';
  ALTER TYPE "public"."enum_templates_receipt_variant" ADD VALUE 'statement';
  ALTER TYPE "public"."enum_templates_receipt_variant" ADD VALUE 'timeline-first';
  ALTER TYPE "public"."enum_templates_receipt_variant" ADD VALUE 'split';
  ALTER TYPE "public"."enum_templates_receipt_variant" ADD VALUE 'compact';
  ALTER TYPE "public"."enum_templates_receipt_variant" ADD VALUE 'next-steps';
  ALTER TYPE "public"."enum__templates_v_version_checkout_variant" ADD VALUE 'one-page';
  ALTER TYPE "public"."enum__templates_v_version_checkout_variant" ADD VALUE 'summary-first';
  ALTER TYPE "public"."enum__templates_v_version_checkout_variant" ADD VALUE 'focused';
  ALTER TYPE "public"."enum__templates_v_version_checkout_variant" ADD VALUE 'express-rail';
  ALTER TYPE "public"."enum__templates_v_version_receipt_variant" ADD VALUE 'statement';
  ALTER TYPE "public"."enum__templates_v_version_receipt_variant" ADD VALUE 'timeline-first';
  ALTER TYPE "public"."enum__templates_v_version_receipt_variant" ADD VALUE 'split';
  ALTER TYPE "public"."enum__templates_v_version_receipt_variant" ADD VALUE 'compact';
  ALTER TYPE "public"."enum__templates_v_version_receipt_variant" ADD VALUE 'next-steps';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "templates" ALTER COLUMN "checkout_variant" SET DATA TYPE text;
  ALTER TABLE "templates" ALTER COLUMN "checkout_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_templates_checkout_variant";
  CREATE TYPE "public"."enum_templates_checkout_variant" AS ENUM('default');
  ALTER TABLE "templates" ALTER COLUMN "checkout_variant" SET DEFAULT 'default'::"public"."enum_templates_checkout_variant";
  ALTER TABLE "templates" ALTER COLUMN "checkout_variant" SET DATA TYPE "public"."enum_templates_checkout_variant" USING "checkout_variant"::"public"."enum_templates_checkout_variant";
  ALTER TABLE "templates" ALTER COLUMN "receipt_variant" SET DATA TYPE text;
  ALTER TABLE "templates" ALTER COLUMN "receipt_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_templates_receipt_variant";
  CREATE TYPE "public"."enum_templates_receipt_variant" AS ENUM('default');
  ALTER TABLE "templates" ALTER COLUMN "receipt_variant" SET DEFAULT 'default'::"public"."enum_templates_receipt_variant";
  ALTER TABLE "templates" ALTER COLUMN "receipt_variant" SET DATA TYPE "public"."enum_templates_receipt_variant" USING "receipt_variant"::"public"."enum_templates_receipt_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_checkout_variant" SET DATA TYPE text;
  ALTER TABLE "_templates_v" ALTER COLUMN "version_checkout_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum__templates_v_version_checkout_variant";
  CREATE TYPE "public"."enum__templates_v_version_checkout_variant" AS ENUM('default');
  ALTER TABLE "_templates_v" ALTER COLUMN "version_checkout_variant" SET DEFAULT 'default'::"public"."enum__templates_v_version_checkout_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_checkout_variant" SET DATA TYPE "public"."enum__templates_v_version_checkout_variant" USING "version_checkout_variant"::"public"."enum__templates_v_version_checkout_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_receipt_variant" SET DATA TYPE text;
  ALTER TABLE "_templates_v" ALTER COLUMN "version_receipt_variant" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum__templates_v_version_receipt_variant";
  CREATE TYPE "public"."enum__templates_v_version_receipt_variant" AS ENUM('default');
  ALTER TABLE "_templates_v" ALTER COLUMN "version_receipt_variant" SET DEFAULT 'default'::"public"."enum__templates_v_version_receipt_variant";
  ALTER TABLE "_templates_v" ALTER COLUMN "version_receipt_variant" SET DATA TYPE "public"."enum__templates_v_version_receipt_variant" USING "version_receipt_variant"::"public"."enum__templates_v_version_receipt_variant";`)
}
