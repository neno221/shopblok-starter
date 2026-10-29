import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_hero_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_pages_blocks_hero_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_hero_ps_mode" AS ENUM('none', 'collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_pages_blocks_hero_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_pages_blocks_hero_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum_pages_blocks_hero_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_hero_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_hero_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_hero_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_links_link_appearance" AS ENUM('text');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_bundle_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_bundle_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_bundle_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_bundle_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_bundle_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_comparison_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_comparison_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_comparison_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_comparison_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_comparison_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_ps_mode" AS ENUM('none', 'collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_links_link_appearance" AS ENUM('text');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TABLE "pages_blocks_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_hero_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_hero_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_hero_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_hero_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"countdown_end" timestamp(3) with time zone,
  	"product_source_mode" "enum_pages_blocks_hero_ps_mode" DEFAULT 'none',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 4,
  	"product_source_sort" "enum_pages_blocks_hero_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum_pages_blocks_hero_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_hero_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_hero_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_hero_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_hero_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_category_showcase_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_category_showcase_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_category_showcase_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "pages_blocks_category_showcase_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_category_showcase_cs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer
  );
  
  CREATE TABLE "pages_blocks_category_showcase_cs_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_category_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_category_showcase_variant" DEFAULT 'standard',
  	"category_source_mode" "enum_pages_blocks_category_showcase_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_category_showcase_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_category_showcase_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_category_showcase_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_category_showcase_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_category_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_product_collection_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_product_collection_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_product_collection_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "pages_blocks_product_collection_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_product_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_product_collection_variant" DEFAULT 'standard',
  	"display" "enum_pages_blocks_product_collection_display" DEFAULT 'carousel',
  	"product_source_mode" "enum_pages_blocks_product_collection_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_pages_blocks_product_collection_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum_pages_blocks_product_collection_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_product_collection_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_product_collection_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_product_collection_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_product_collection_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_product_collection_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_featured_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_featured_product_variant" DEFAULT 'standard',
  	"product_id" integer,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_featured_product_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_featured_product_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_featured_product_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_featured_product_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_featured_product_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_bundle" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_bundle_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_bundle_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_bundle_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_bundle_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_bundle_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_bundle_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_promo_banner_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_promo_banner_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_promo_banner_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_promo_banner_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_promo_banner_variant" DEFAULT 'standard',
  	"code" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_promo_banner_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_promo_banner_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_promo_banner_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_promo_banner_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_promo_banner_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"terms" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "pages_blocks_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_comparison_variant" DEFAULT 'standard',
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_comparison_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_comparison_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_comparison_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_comparison_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_collection_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_collection_spotlight_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum_pages_blocks_collection_spotlight_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_collection_spotlight_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_collection_spotlight_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_collection_spotlight_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_collection_spotlight_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_collection_spotlight_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_recently_viewed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_recently_viewed_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_recently_viewed_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_recently_viewed_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_recently_viewed_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_recently_viewed_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_recently_viewed_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_hero_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_hero_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_hero_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"countdown_end" timestamp(3) with time zone,
  	"product_source_mode" "enum__pages_v_blocks_hero_ps_mode" DEFAULT 'none',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 4,
  	"product_source_sort" "enum__pages_v_blocks_hero_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum__pages_v_blocks_hero_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_hero_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_hero_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_hero_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_hero_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_category_showcase_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_category_showcase_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_category_showcase_links_link_appearance" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_category_showcase_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_blocks_category_showcase_cs_items_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blocks_category_showcase_cs_items_v_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_category_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_category_showcase_variant" DEFAULT 'standard',
  	"category_source_mode" "enum__pages_v_blocks_category_showcase_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_category_showcase_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_category_showcase_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_category_showcase_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_category_showcase_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_category_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_product_collection_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_product_collection_links_link_appearance" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_product_collection_variant" DEFAULT 'standard',
  	"display" "enum__pages_v_blocks_product_collection_display" DEFAULT 'carousel',
  	"product_source_mode" "enum__pages_v_blocks_product_collection_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum__pages_v_blocks_product_collection_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum__pages_v_blocks_product_collection_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_product_collection_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_product_collection_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_product_collection_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_product_collection_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_featured_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_featured_product_variant" DEFAULT 'standard',
  	"product_id" integer,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_featured_product_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_featured_product_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_featured_product_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_featured_product_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_featured_product_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_bundle" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_bundle_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_bundle_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_bundle_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_bundle_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_bundle_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_bundle_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_promo_banner_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_promo_banner_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_promo_banner_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_promo_banner_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_promo_banner_variant" DEFAULT 'standard',
  	"code" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_promo_banner_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_promo_banner_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_promo_banner_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_promo_banner_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_promo_banner_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"terms" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_comparison_variant" DEFAULT 'standard',
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_comparison_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_comparison_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_comparison_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_comparison_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_collection_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_collection_spotlight_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum__pages_v_blocks_collection_spotlight_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_collection_spotlight_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_collection_spotlight_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_collection_spotlight_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_collection_spotlight_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_collection_spotlight_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_recently_viewed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_recently_viewed_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_recently_viewed_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_recently_viewed_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_recently_viewed_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_recently_viewed_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_recently_viewed_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "pages_blocks_hero_links" ADD CONSTRAINT "pages_blocks_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_links_locales" ADD CONSTRAINT "pages_blocks_hero_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_links" ADD CONSTRAINT "pages_blocks_category_showcase_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_links_locales" ADD CONSTRAINT "pages_blocks_category_showcase_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_showcase_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_cs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_cs_items_locales" ADD CONSTRAINT "pages_blocks_category_showcase_cs_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_showcase_cs_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase" ADD CONSTRAINT "pages_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase" ADD CONSTRAINT "pages_blocks_category_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_locales" ADD CONSTRAINT "pages_blocks_category_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_links" ADD CONSTRAINT "pages_blocks_product_collection_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_links_locales" ADD CONSTRAINT "pages_blocks_product_collection_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_collection_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_locales" ADD CONSTRAINT "pages_blocks_product_collection_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_featured_product" ADD CONSTRAINT "pages_blocks_featured_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_featured_product" ADD CONSTRAINT "pages_blocks_featured_product_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_featured_product" ADD CONSTRAINT "pages_blocks_featured_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_featured_product_locales" ADD CONSTRAINT "pages_blocks_featured_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_featured_product"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_bundle" ADD CONSTRAINT "pages_blocks_bundle_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_bundle_locales" ADD CONSTRAINT "pages_blocks_bundle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_bundle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner_links" ADD CONSTRAINT "pages_blocks_promo_banner_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner_links_locales" ADD CONSTRAINT "pages_blocks_promo_banner_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_promo_banner_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner" ADD CONSTRAINT "pages_blocks_promo_banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner" ADD CONSTRAINT "pages_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner_locales" ADD CONSTRAINT "pages_blocks_promo_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_rows" ADD CONSTRAINT "pages_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_rows_locales" ADD CONSTRAINT "pages_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison" ADD CONSTRAINT "pages_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_locales" ADD CONSTRAINT "pages_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight" ADD CONSTRAINT "pages_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight" ADD CONSTRAINT "pages_blocks_collection_spotlight_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight" ADD CONSTRAINT "pages_blocks_collection_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight_locales" ADD CONSTRAINT "pages_blocks_collection_spotlight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_collection_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_recently_viewed" ADD CONSTRAINT "pages_blocks_recently_viewed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_recently_viewed_locales" ADD CONSTRAINT "pages_blocks_recently_viewed_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_recently_viewed"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_links" ADD CONSTRAINT "_pages_v_blocks_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_links_locales" ADD CONSTRAINT "_pages_v_blocks_hero_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_links" ADD CONSTRAINT "_pages_v_blocks_category_showcase_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_links_locales" ADD CONSTRAINT "_pages_v_blocks_category_showcase_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_category_showcase_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v_locales" ADD CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_blocks_category_showcase_cs_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase" ADD CONSTRAINT "_pages_v_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase" ADD CONSTRAINT "_pages_v_blocks_category_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_locales" ADD CONSTRAINT "_pages_v_blocks_category_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_links" ADD CONSTRAINT "_pages_v_blocks_product_collection_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_links_locales" ADD CONSTRAINT "_pages_v_blocks_product_collection_links_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_collection_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_locales" ADD CONSTRAINT "_pages_v_blocks_product_collection_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_product" ADD CONSTRAINT "_pages_v_blocks_featured_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_product" ADD CONSTRAINT "_pages_v_blocks_featured_product_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_product" ADD CONSTRAINT "_pages_v_blocks_featured_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_product_locales" ADD CONSTRAINT "_pages_v_blocks_featured_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_featured_product"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_bundle" ADD CONSTRAINT "_pages_v_blocks_bundle_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_bundle_locales" ADD CONSTRAINT "_pages_v_blocks_bundle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_bundle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner_links" ADD CONSTRAINT "_pages_v_blocks_promo_banner_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner_links_locales" ADD CONSTRAINT "_pages_v_blocks_promo_banner_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_promo_banner_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner" ADD CONSTRAINT "_pages_v_blocks_promo_banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner" ADD CONSTRAINT "_pages_v_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner_locales" ADD CONSTRAINT "_pages_v_blocks_promo_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_rows" ADD CONSTRAINT "_pages_v_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_rows_locales" ADD CONSTRAINT "_pages_v_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison" ADD CONSTRAINT "_pages_v_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_locales" ADD CONSTRAINT "_pages_v_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight_locales" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_collection_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_recently_viewed" ADD CONSTRAINT "_pages_v_blocks_recently_viewed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_recently_viewed_locales" ADD CONSTRAINT "_pages_v_blocks_recently_viewed_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_recently_viewed"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_links_order_idx" ON "pages_blocks_hero_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_links_parent_id_idx" ON "pages_blocks_hero_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_links_locales_locale_parent_id_unique" ON "pages_blocks_hero_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_links_locales_parent_id_idx" ON "pages_blocks_hero_links_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_media_idx" ON "pages_blocks_hero" USING btree ("media_id");
  CREATE INDEX "pages_blocks_hero_product_source_product_source_collecti_idx" ON "pages_blocks_hero" USING btree ("product_source_collection_id");
  CREATE INDEX "pages_blocks_hero_product_source_product_source_category_idx" ON "pages_blocks_hero" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_locales_locale_parent_id_unique" ON "pages_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_locales_parent_id_idx" ON "pages_blocks_hero_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_links_order_idx" ON "pages_blocks_category_showcase_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_category_showcase_links_parent_id_idx" ON "pages_blocks_category_showcase_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_category_showcase_links_locales_locale_parent_i" ON "pages_blocks_category_showcase_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_links_locales_parent_id_idx" ON "pages_blocks_category_showcase_links_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_cs_items_order_idx" ON "pages_blocks_category_showcase_cs_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_category_showcase_cs_items_parent_id_idx" ON "pages_blocks_category_showcase_cs_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_cs_items_category_idx" ON "pages_blocks_category_showcase_cs_items" USING btree ("category_id");
  CREATE INDEX "pages_blocks_category_showcase_cs_items_image_idx" ON "pages_blocks_category_showcase_cs_items" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_category_showcase_cs_items_locales_locale_paren" ON "pages_blocks_category_showcase_cs_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_cs_items_locales_parent_i_idx" ON "pages_blocks_category_showcase_cs_items_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_order_idx" ON "pages_blocks_category_showcase" USING btree ("_order");
  CREATE INDEX "pages_blocks_category_showcase_parent_id_idx" ON "pages_blocks_category_showcase" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_path_idx" ON "pages_blocks_category_showcase" USING btree ("_path");
  CREATE INDEX "pages_blocks_category_showcase_category_source_category__idx" ON "pages_blocks_category_showcase" USING btree ("category_source_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_category_showcase_locales_locale_parent_id_uniq" ON "pages_blocks_category_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_locales_parent_id_idx" ON "pages_blocks_category_showcase_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_collection_links_order_idx" ON "pages_blocks_product_collection_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_collection_links_parent_id_idx" ON "pages_blocks_product_collection_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_product_collection_links_locales_locale_parent_" ON "pages_blocks_product_collection_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_product_collection_links_locales_parent_id_idx" ON "pages_blocks_product_collection_links_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_collection_order_idx" ON "pages_blocks_product_collection" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_collection_parent_id_idx" ON "pages_blocks_product_collection" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_collection_path_idx" ON "pages_blocks_product_collection" USING btree ("_path");
  CREATE INDEX "pages_blocks_product_collection_product_source_product_s_idx" ON "pages_blocks_product_collection" USING btree ("product_source_collection_id");
  CREATE INDEX "pages_blocks_product_collection_product_source_product_1_idx" ON "pages_blocks_product_collection" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "pages_blocks_product_collection_locales_locale_parent_id_uni" ON "pages_blocks_product_collection_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_product_collection_locales_parent_id_idx" ON "pages_blocks_product_collection_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_featured_product_order_idx" ON "pages_blocks_featured_product" USING btree ("_order");
  CREATE INDEX "pages_blocks_featured_product_parent_id_idx" ON "pages_blocks_featured_product" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_featured_product_path_idx" ON "pages_blocks_featured_product" USING btree ("_path");
  CREATE INDEX "pages_blocks_featured_product_product_idx" ON "pages_blocks_featured_product" USING btree ("product_id");
  CREATE INDEX "pages_blocks_featured_product_media_idx" ON "pages_blocks_featured_product" USING btree ("media_id");
  CREATE UNIQUE INDEX "pages_blocks_featured_product_locales_locale_parent_id_uniqu" ON "pages_blocks_featured_product_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_featured_product_locales_parent_id_idx" ON "pages_blocks_featured_product_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_bundle_order_idx" ON "pages_blocks_bundle" USING btree ("_order");
  CREATE INDEX "pages_blocks_bundle_parent_id_idx" ON "pages_blocks_bundle" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_bundle_path_idx" ON "pages_blocks_bundle" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_bundle_locales_locale_parent_id_unique" ON "pages_blocks_bundle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_bundle_locales_parent_id_idx" ON "pages_blocks_bundle_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_links_order_idx" ON "pages_blocks_promo_banner_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_promo_banner_links_parent_id_idx" ON "pages_blocks_promo_banner_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_promo_banner_links_locales_locale_parent_id_uni" ON "pages_blocks_promo_banner_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_links_locales_parent_id_idx" ON "pages_blocks_promo_banner_links_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_order_idx" ON "pages_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "pages_blocks_promo_banner_parent_id_idx" ON "pages_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_path_idx" ON "pages_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "pages_blocks_promo_banner_media_idx" ON "pages_blocks_promo_banner" USING btree ("media_id");
  CREATE UNIQUE INDEX "pages_blocks_promo_banner_locales_locale_parent_id_unique" ON "pages_blocks_promo_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_locales_parent_id_idx" ON "pages_blocks_promo_banner_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_rows_order_idx" ON "pages_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparison_rows_parent_id_idx" ON "pages_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_comparison_rows_locales_locale_parent_id_unique" ON "pages_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_comparison_rows_locales_parent_id_idx" ON "pages_blocks_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_order_idx" ON "pages_blocks_comparison" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparison_parent_id_idx" ON "pages_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_path_idx" ON "pages_blocks_comparison" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_comparison_locales_locale_parent_id_unique" ON "pages_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_comparison_locales_parent_id_idx" ON "pages_blocks_comparison_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_collection_spotlight_order_idx" ON "pages_blocks_collection_spotlight" USING btree ("_order");
  CREATE INDEX "pages_blocks_collection_spotlight_parent_id_idx" ON "pages_blocks_collection_spotlight" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_collection_spotlight_path_idx" ON "pages_blocks_collection_spotlight" USING btree ("_path");
  CREATE INDEX "pages_blocks_collection_spotlight_collection_idx" ON "pages_blocks_collection_spotlight" USING btree ("collection_id");
  CREATE INDEX "pages_blocks_collection_spotlight_media_idx" ON "pages_blocks_collection_spotlight" USING btree ("media_id");
  CREATE UNIQUE INDEX "pages_blocks_collection_spotlight_locales_locale_parent_id_u" ON "pages_blocks_collection_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_collection_spotlight_locales_parent_id_idx" ON "pages_blocks_collection_spotlight_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_recently_viewed_order_idx" ON "pages_blocks_recently_viewed" USING btree ("_order");
  CREATE INDEX "pages_blocks_recently_viewed_parent_id_idx" ON "pages_blocks_recently_viewed" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_recently_viewed_path_idx" ON "pages_blocks_recently_viewed" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_recently_viewed_locales_locale_parent_id_unique" ON "pages_blocks_recently_viewed_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_recently_viewed_locales_parent_id_idx" ON "pages_blocks_recently_viewed_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_links_order_idx" ON "_pages_v_blocks_hero_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_links_parent_id_idx" ON "_pages_v_blocks_hero_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_links_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_links_locales_parent_id_idx" ON "_pages_v_blocks_hero_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_media_idx" ON "_pages_v_blocks_hero" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_hero_product_source_product_source_colle_idx" ON "_pages_v_blocks_hero" USING btree ("product_source_collection_id");
  CREATE INDEX "_pages_v_blocks_hero_product_source_product_source_categ_idx" ON "_pages_v_blocks_hero" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_locales_parent_id_idx" ON "_pages_v_blocks_hero_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_links_order_idx" ON "_pages_v_blocks_category_showcase_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_category_showcase_links_parent_id_idx" ON "_pages_v_blocks_category_showcase_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_category_showcase_links_locales_locale_paren" ON "_pages_v_blocks_category_showcase_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_links_locales_parent_i_idx" ON "_pages_v_blocks_category_showcase_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_blocks_category_showcase_cs_items_v_order_idx" ON "_pages_blocks_category_showcase_cs_items_v" USING btree ("_order");
  CREATE INDEX "_pages_blocks_category_showcase_cs_items_v_parent_id_idx" ON "_pages_blocks_category_showcase_cs_items_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blocks_category_showcase_cs_items_v_category_idx" ON "_pages_blocks_category_showcase_cs_items_v" USING btree ("category_id");
  CREATE INDEX "_pages_blocks_category_showcase_cs_items_v_image_idx" ON "_pages_blocks_category_showcase_cs_items_v" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_blocks_category_showcase_cs_items_v_locales_locale_pa" ON "_pages_blocks_category_showcase_cs_items_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_blocks_category_showcase_cs_items_v_locales_paren_idx" ON "_pages_blocks_category_showcase_cs_items_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_order_idx" ON "_pages_v_blocks_category_showcase" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_category_showcase_parent_id_idx" ON "_pages_v_blocks_category_showcase" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_path_idx" ON "_pages_v_blocks_category_showcase" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_category_showcase_category_source_catego_idx" ON "_pages_v_blocks_category_showcase" USING btree ("category_source_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_category_showcase_locales_locale_parent_id_u" ON "_pages_v_blocks_category_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_locales_parent_id_idx" ON "_pages_v_blocks_category_showcase_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_links_order_idx" ON "_pages_v_blocks_product_collection_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_product_collection_links_parent_id_idx" ON "_pages_v_blocks_product_collection_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_product_collection_links_locales_locale_pare" ON "_pages_v_blocks_product_collection_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_links_locales_parent__idx" ON "_pages_v_blocks_product_collection_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_order_idx" ON "_pages_v_blocks_product_collection" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_product_collection_parent_id_idx" ON "_pages_v_blocks_product_collection" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_path_idx" ON "_pages_v_blocks_product_collection" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_product_collection_product_source_produc_idx" ON "_pages_v_blocks_product_collection" USING btree ("product_source_collection_id");
  CREATE INDEX "_pages_v_blocks_product_collection_product_source_prod_1_idx" ON "_pages_v_blocks_product_collection" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_product_collection_locales_locale_parent_id_" ON "_pages_v_blocks_product_collection_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_locales_parent_id_idx" ON "_pages_v_blocks_product_collection_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_featured_product_order_idx" ON "_pages_v_blocks_featured_product" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_featured_product_parent_id_idx" ON "_pages_v_blocks_featured_product" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_featured_product_path_idx" ON "_pages_v_blocks_featured_product" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_featured_product_product_idx" ON "_pages_v_blocks_featured_product" USING btree ("product_id");
  CREATE INDEX "_pages_v_blocks_featured_product_media_idx" ON "_pages_v_blocks_featured_product" USING btree ("media_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_featured_product_locales_locale_parent_id_un" ON "_pages_v_blocks_featured_product_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_featured_product_locales_parent_id_idx" ON "_pages_v_blocks_featured_product_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_bundle_order_idx" ON "_pages_v_blocks_bundle" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_bundle_parent_id_idx" ON "_pages_v_blocks_bundle" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_bundle_path_idx" ON "_pages_v_blocks_bundle" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_bundle_locales_locale_parent_id_unique" ON "_pages_v_blocks_bundle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_bundle_locales_parent_id_idx" ON "_pages_v_blocks_bundle_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_promo_banner_links_order_idx" ON "_pages_v_blocks_promo_banner_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_promo_banner_links_parent_id_idx" ON "_pages_v_blocks_promo_banner_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_promo_banner_links_locales_locale_parent_id_" ON "_pages_v_blocks_promo_banner_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_promo_banner_links_locales_parent_id_idx" ON "_pages_v_blocks_promo_banner_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_promo_banner_order_idx" ON "_pages_v_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_promo_banner_parent_id_idx" ON "_pages_v_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_promo_banner_path_idx" ON "_pages_v_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_promo_banner_media_idx" ON "_pages_v_blocks_promo_banner" USING btree ("media_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_promo_banner_locales_locale_parent_id_unique" ON "_pages_v_blocks_promo_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_promo_banner_locales_parent_id_idx" ON "_pages_v_blocks_promo_banner_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_rows_order_idx" ON "_pages_v_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparison_rows_parent_id_idx" ON "_pages_v_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_comparison_rows_locales_locale_parent_id_uni" ON "_pages_v_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_rows_locales_parent_id_idx" ON "_pages_v_blocks_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_order_idx" ON "_pages_v_blocks_comparison" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparison_parent_id_idx" ON "_pages_v_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_path_idx" ON "_pages_v_blocks_comparison" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_comparison_locales_locale_parent_id_unique" ON "_pages_v_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_locales_parent_id_idx" ON "_pages_v_blocks_comparison_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_order_idx" ON "_pages_v_blocks_collection_spotlight" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_parent_id_idx" ON "_pages_v_blocks_collection_spotlight" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_path_idx" ON "_pages_v_blocks_collection_spotlight" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_collection_idx" ON "_pages_v_blocks_collection_spotlight" USING btree ("collection_id");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_media_idx" ON "_pages_v_blocks_collection_spotlight" USING btree ("media_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_collection_spotlight_locales_locale_parent_i" ON "_pages_v_blocks_collection_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_locales_parent_id_idx" ON "_pages_v_blocks_collection_spotlight_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_recently_viewed_order_idx" ON "_pages_v_blocks_recently_viewed" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_recently_viewed_parent_id_idx" ON "_pages_v_blocks_recently_viewed" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_recently_viewed_path_idx" ON "_pages_v_blocks_recently_viewed" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_recently_viewed_locales_locale_parent_id_uni" ON "_pages_v_blocks_recently_viewed_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_recently_viewed_locales_parent_id_idx" ON "_pages_v_blocks_recently_viewed_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_hero_links" CASCADE;
  DROP TABLE "pages_blocks_hero_links_locales" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_links" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_links_locales" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_cs_items" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_cs_items_locales" CASCADE;
  DROP TABLE "pages_blocks_category_showcase" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_locales" CASCADE;
  DROP TABLE "pages_blocks_product_collection_links" CASCADE;
  DROP TABLE "pages_blocks_product_collection_links_locales" CASCADE;
  DROP TABLE "pages_blocks_product_collection" CASCADE;
  DROP TABLE "pages_blocks_product_collection_locales" CASCADE;
  DROP TABLE "pages_blocks_featured_product" CASCADE;
  DROP TABLE "pages_blocks_featured_product_locales" CASCADE;
  DROP TABLE "pages_blocks_bundle" CASCADE;
  DROP TABLE "pages_blocks_bundle_locales" CASCADE;
  DROP TABLE "pages_blocks_promo_banner_links" CASCADE;
  DROP TABLE "pages_blocks_promo_banner_links_locales" CASCADE;
  DROP TABLE "pages_blocks_promo_banner" CASCADE;
  DROP TABLE "pages_blocks_promo_banner_locales" CASCADE;
  DROP TABLE "pages_blocks_comparison_rows" CASCADE;
  DROP TABLE "pages_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "pages_blocks_comparison" CASCADE;
  DROP TABLE "pages_blocks_comparison_locales" CASCADE;
  DROP TABLE "pages_blocks_collection_spotlight" CASCADE;
  DROP TABLE "pages_blocks_collection_spotlight_locales" CASCADE;
  DROP TABLE "pages_blocks_recently_viewed" CASCADE;
  DROP TABLE "pages_blocks_recently_viewed_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_links" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_links_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_category_showcase_links" CASCADE;
  DROP TABLE "_pages_v_blocks_category_showcase_links_locales" CASCADE;
  DROP TABLE "_pages_blocks_category_showcase_cs_items_v" CASCADE;
  DROP TABLE "_pages_blocks_category_showcase_cs_items_v_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_category_showcase" CASCADE;
  DROP TABLE "_pages_v_blocks_category_showcase_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection_links" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection_links_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_featured_product" CASCADE;
  DROP TABLE "_pages_v_blocks_featured_product_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_bundle" CASCADE;
  DROP TABLE "_pages_v_blocks_bundle_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_promo_banner_links" CASCADE;
  DROP TABLE "_pages_v_blocks_promo_banner_links_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_promo_banner" CASCADE;
  DROP TABLE "_pages_v_blocks_promo_banner_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison_rows" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_collection_spotlight" CASCADE;
  DROP TABLE "_pages_v_blocks_collection_spotlight_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_recently_viewed" CASCADE;
  DROP TABLE "_pages_v_blocks_recently_viewed_locales" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_hero_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_hero_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_hero_variant";
  DROP TYPE "public"."enum_pages_blocks_hero_ps_mode";
  DROP TYPE "public"."enum_pages_blocks_hero_ps_sort";
  DROP TYPE "public"."enum_pages_blocks_hero_ps_empty";
  DROP TYPE "public"."enum_pages_blocks_hero_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_hero_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_hero_ss_container";
  DROP TYPE "public"."enum_pages_blocks_hero_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_variant";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_cs_mode";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_ss_container";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_product_collection_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_product_collection_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_product_collection_variant";
  DROP TYPE "public"."enum_pages_blocks_product_collection_display";
  DROP TYPE "public"."enum_pages_blocks_product_collection_ps_mode";
  DROP TYPE "public"."enum_pages_blocks_product_collection_ps_sort";
  DROP TYPE "public"."enum_pages_blocks_product_collection_ps_empty";
  DROP TYPE "public"."enum_pages_blocks_product_collection_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_product_collection_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_product_collection_ss_container";
  DROP TYPE "public"."enum_pages_blocks_product_collection_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_featured_product_variant";
  DROP TYPE "public"."enum_pages_blocks_featured_product_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_featured_product_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_featured_product_ss_container";
  DROP TYPE "public"."enum_pages_blocks_featured_product_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_bundle_variant";
  DROP TYPE "public"."enum_pages_blocks_bundle_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_bundle_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_bundle_ss_container";
  DROP TYPE "public"."enum_pages_blocks_bundle_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_variant";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_ss_container";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_comparison_variant";
  DROP TYPE "public"."enum_pages_blocks_comparison_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_comparison_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_comparison_ss_container";
  DROP TYPE "public"."enum_pages_blocks_comparison_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_variant";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_sort";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_ss_container";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_variant";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_ss_container";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_hero_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_hero_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_hero_variant";
  DROP TYPE "public"."enum__pages_v_blocks_hero_ps_mode";
  DROP TYPE "public"."enum__pages_v_blocks_hero_ps_sort";
  DROP TYPE "public"."enum__pages_v_blocks_hero_ps_empty";
  DROP TYPE "public"."enum__pages_v_blocks_hero_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_hero_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_hero_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_hero_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_variant";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_cs_mode";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_variant";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_display";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_ps_mode";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_ps_sort";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_ps_empty";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_variant";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_variant";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_variant";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_variant";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_variant";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_sort";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_variant";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_ss_visibility";`)
}
