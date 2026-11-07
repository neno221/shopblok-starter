import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_templates_product_page_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_templates_listing_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_templates_quick_view_variant" AS ENUM('off', 'default');
  CREATE TYPE "public"."enum_templates_cart_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_templates_cart_mini_cart" AS ENUM('drawer', 'page');
  CREATE TYPE "public"."enum_templates_cart_quick_cart" AS ENUM('dropdown', 'off');
  CREATE TYPE "public"."enum_templates_checkout_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_templates_receipt_variant" AS ENUM('default');
  CREATE TYPE "public"."enum_templates_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__templates_v_version_product_page_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__templates_v_version_listing_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__templates_v_version_quick_view_variant" AS ENUM('off', 'default');
  CREATE TYPE "public"."enum__templates_v_version_cart_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__templates_v_version_cart_mini_cart" AS ENUM('drawer', 'page');
  CREATE TYPE "public"."enum__templates_v_version_cart_quick_cart" AS ENUM('dropdown', 'off');
  CREATE TYPE "public"."enum__templates_v_version_checkout_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__templates_v_version_receipt_variant" AS ENUM('default');
  CREATE TYPE "public"."enum__templates_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__templates_v_published_locale" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TABLE "templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_page_variant" "enum_templates_product_page_variant" DEFAULT 'default',
  	"listing_variant" "enum_templates_listing_variant" DEFAULT 'default',
  	"quick_view_variant" "enum_templates_quick_view_variant" DEFAULT 'off',
  	"cart_variant" "enum_templates_cart_variant" DEFAULT 'default',
  	"cart_mini_cart" "enum_templates_cart_mini_cart" DEFAULT 'drawer',
  	"cart_quick_cart" "enum_templates_cart_quick_cart" DEFAULT 'dropdown',
  	"checkout_variant" "enum_templates_checkout_variant" DEFAULT 'default',
  	"receipt_variant" "enum_templates_receipt_variant" DEFAULT 'default',
  	"_status" "enum_templates_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_templates_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_product_page_variant" "enum__templates_v_version_product_page_variant" DEFAULT 'default',
  	"version_listing_variant" "enum__templates_v_version_listing_variant" DEFAULT 'default',
  	"version_quick_view_variant" "enum__templates_v_version_quick_view_variant" DEFAULT 'off',
  	"version_cart_variant" "enum__templates_v_version_cart_variant" DEFAULT 'default',
  	"version_cart_mini_cart" "enum__templates_v_version_cart_mini_cart" DEFAULT 'drawer',
  	"version_cart_quick_cart" "enum__templates_v_version_cart_quick_cart" DEFAULT 'dropdown',
  	"version_checkout_variant" "enum__templates_v_version_checkout_variant" DEFAULT 'default',
  	"version_receipt_variant" "enum__templates_v_version_receipt_variant" DEFAULT 'default',
  	"version__status" "enum__templates_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__templates_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE INDEX "templates__status_idx" ON "templates" USING btree ("_status");
  CREATE INDEX "_templates_v_version_version__status_idx" ON "_templates_v" USING btree ("version__status");
  CREATE INDEX "_templates_v_created_at_idx" ON "_templates_v" USING btree ("created_at");
  CREATE INDEX "_templates_v_updated_at_idx" ON "_templates_v" USING btree ("updated_at");
  CREATE INDEX "_templates_v_snapshot_idx" ON "_templates_v" USING btree ("snapshot");
  CREATE INDEX "_templates_v_published_locale_idx" ON "_templates_v" USING btree ("published_locale");
  CREATE INDEX "_templates_v_latest_idx" ON "_templates_v" USING btree ("latest");
  CREATE INDEX "_templates_v_autosave_idx" ON "_templates_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "templates" CASCADE;
  DROP TABLE "_templates_v" CASCADE;
  DROP TYPE "public"."enum_templates_product_page_variant";
  DROP TYPE "public"."enum_templates_listing_variant";
  DROP TYPE "public"."enum_templates_quick_view_variant";
  DROP TYPE "public"."enum_templates_cart_variant";
  DROP TYPE "public"."enum_templates_cart_mini_cart";
  DROP TYPE "public"."enum_templates_cart_quick_cart";
  DROP TYPE "public"."enum_templates_checkout_variant";
  DROP TYPE "public"."enum_templates_receipt_variant";
  DROP TYPE "public"."enum_templates_status";
  DROP TYPE "public"."enum__templates_v_version_product_page_variant";
  DROP TYPE "public"."enum__templates_v_version_listing_variant";
  DROP TYPE "public"."enum__templates_v_version_quick_view_variant";
  DROP TYPE "public"."enum__templates_v_version_cart_variant";
  DROP TYPE "public"."enum__templates_v_version_cart_mini_cart";
  DROP TYPE "public"."enum__templates_v_version_cart_quick_cart";
  DROP TYPE "public"."enum__templates_v_version_checkout_variant";
  DROP TYPE "public"."enum__templates_v_version_receipt_variant";
  DROP TYPE "public"."enum__templates_v_version_status";
  DROP TYPE "public"."enum__templates_v_published_locale";`)
}
