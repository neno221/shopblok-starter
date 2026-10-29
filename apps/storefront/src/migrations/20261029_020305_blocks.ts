import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_rich_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_faq_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_faq_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_faq_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_faq_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_faq_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_video_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_pages_blocks_video_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_video_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum_pages_blocks_video_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_video_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_video_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_video_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_spacer_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_spacer_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_spacer_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_spacer_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_spacer_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_video_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum__pages_v_blocks_video_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_video_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum__pages_v_blocks_video_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_video_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_video_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_video_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_rich_text_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_rich_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_rich_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_rich_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_rich_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_media_with_text_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_media_with_text_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_media_with_text_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_media_with_text_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_media_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_media_with_text_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum_pages_blocks_media_with_text_image_side" DEFAULT 'end',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_media_with_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_media_with_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_media_with_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_media_with_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_media_with_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_usp_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_pages_blocks_usp_bar_items_icon"
  );
  
  CREATE TABLE "pages_blocks_usp_bar_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_usp_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_usp_bar_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_usp_bar_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_usp_bar_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_usp_bar_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_usp_bar_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_logo_cloud_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_logo_cloud_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_logo_cloud_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_logo_cloud_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_logo_cloud_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_faq_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_faq_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_faq_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_faq_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_pages_blocks_faq_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"rating" numeric,
  	"avatar_id" integer
  );
  
  CREATE TABLE "pages_blocks_testimonials_quotes_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_testimonials_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_testimonials_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_testimonials_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_testimonials_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_testimonials_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_video_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_pages_blocks_video_captions_language",
  	"file_id" integer
  );
  
  CREATE TABLE "pages_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_video_variant" DEFAULT 'standard',
  	"source" "enum_pages_blocks_video_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_video_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_video_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_video_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_video_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_video_locales" (
  	"heading" varchar,
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_spacer_variant" DEFAULT 'standard',
  	"size" "enum_pages_blocks_spacer_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_spacer_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_spacer_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_spacer_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_spacer_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"collections_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_rich_text_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_rich_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_rich_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_rich_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_rich_text_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_media_with_text_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_media_with_text_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_media_with_text_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_media_with_text_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_media_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_media_with_text_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum__pages_v_blocks_media_with_text_image_side" DEFAULT 'end',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_media_with_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_media_with_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_media_with_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_media_with_text_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_media_with_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_usp_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__pages_v_blocks_usp_bar_items_icon",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_usp_bar_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_usp_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_usp_bar_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_usp_bar_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_usp_bar_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_usp_bar_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_usp_bar_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_logo_cloud_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_logo_cloud_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_logo_cloud_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_logo_cloud_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_logo_cloud_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_faq_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_faq_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_faq_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_faq_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum__pages_v_blocks_faq_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"rating" numeric,
  	"avatar_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials_quotes_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_testimonials_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_testimonials_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_testimonials_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_testimonials_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_testimonials_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_video_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__pages_v_blocks_video_captions_language",
  	"file_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_video_variant" DEFAULT 'standard',
  	"source" "enum__pages_v_blocks_video_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_video_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_video_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_video_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_video_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_video_locales" (
  	"heading" varchar,
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_spacer_variant" DEFAULT 'standard',
  	"size" "enum__pages_v_blocks_spacer_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_spacer_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_spacer_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_spacer_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_spacer_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"collections_id" integer,
  	"products_id" integer
  );
  
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text_locales" ADD CONSTRAINT "pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text_links" ADD CONSTRAINT "pages_blocks_media_with_text_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text_links_locales" ADD CONSTRAINT "pages_blocks_media_with_text_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_media_with_text_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text" ADD CONSTRAINT "pages_blocks_media_with_text_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text" ADD CONSTRAINT "pages_blocks_media_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text_locales" ADD CONSTRAINT "pages_blocks_media_with_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_usp_bar_items" ADD CONSTRAINT "pages_blocks_usp_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_usp_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_usp_bar_items_locales" ADD CONSTRAINT "pages_blocks_usp_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_usp_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_usp_bar" ADD CONSTRAINT "pages_blocks_usp_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud" ADD CONSTRAINT "pages_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_locales" ADD CONSTRAINT "pages_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_quotes" ADD CONSTRAINT "pages_blocks_testimonials_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_quotes" ADD CONSTRAINT "pages_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_quotes_locales" ADD CONSTRAINT "pages_blocks_testimonials_quotes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_testimonials_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials" ADD CONSTRAINT "pages_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_locales" ADD CONSTRAINT "pages_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_captions" ADD CONSTRAINT "pages_blocks_video_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_captions" ADD CONSTRAINT "pages_blocks_video_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_locales" ADD CONSTRAINT "pages_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_spacer" ADD CONSTRAINT "pages_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text_links" ADD CONSTRAINT "_pages_v_blocks_media_with_text_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text_links_locales" ADD CONSTRAINT "_pages_v_blocks_media_with_text_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_media_with_text_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text" ADD CONSTRAINT "_pages_v_blocks_media_with_text_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text" ADD CONSTRAINT "_pages_v_blocks_media_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text_locales" ADD CONSTRAINT "_pages_v_blocks_media_with_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_usp_bar_items" ADD CONSTRAINT "_pages_v_blocks_usp_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_usp_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_usp_bar_items_locales" ADD CONSTRAINT "_pages_v_blocks_usp_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_usp_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_usp_bar" ADD CONSTRAINT "_pages_v_blocks_usp_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_locales" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_quotes" ADD CONSTRAINT "_pages_v_blocks_testimonials_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_quotes" ADD CONSTRAINT "_pages_v_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_quotes_locales" ADD CONSTRAINT "_pages_v_blocks_testimonials_quotes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_testimonials_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials" ADD CONSTRAINT "_pages_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_locales" ADD CONSTRAINT "_pages_v_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_captions" ADD CONSTRAINT "_pages_v_blocks_video_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_captions" ADD CONSTRAINT "_pages_v_blocks_video_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_locales" ADD CONSTRAINT "_pages_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_spacer" ADD CONSTRAINT "_pages_v_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_rich_text_locales_locale_parent_id_unique" ON "pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_rich_text_locales_parent_id_idx" ON "pages_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_with_text_links_order_idx" ON "pages_blocks_media_with_text_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_with_text_links_parent_id_idx" ON "pages_blocks_media_with_text_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_media_with_text_links_locales_locale_parent_id_" ON "pages_blocks_media_with_text_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_media_with_text_links_locales_parent_id_idx" ON "pages_blocks_media_with_text_links_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_with_text_order_idx" ON "pages_blocks_media_with_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_with_text_parent_id_idx" ON "pages_blocks_media_with_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_with_text_path_idx" ON "pages_blocks_media_with_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_with_text_media_idx" ON "pages_blocks_media_with_text" USING btree ("media_id");
  CREATE UNIQUE INDEX "pages_blocks_media_with_text_locales_locale_parent_id_unique" ON "pages_blocks_media_with_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_media_with_text_locales_parent_id_idx" ON "pages_blocks_media_with_text_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_usp_bar_items_order_idx" ON "pages_blocks_usp_bar_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_usp_bar_items_parent_id_idx" ON "pages_blocks_usp_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_usp_bar_items_locales_locale_parent_id_unique" ON "pages_blocks_usp_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_usp_bar_items_locales_parent_id_idx" ON "pages_blocks_usp_bar_items_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_usp_bar_order_idx" ON "pages_blocks_usp_bar" USING btree ("_order");
  CREATE INDEX "pages_blocks_usp_bar_parent_id_idx" ON "pages_blocks_usp_bar" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_usp_bar_path_idx" ON "pages_blocks_usp_bar" USING btree ("_path");
  CREATE INDEX "pages_blocks_logo_cloud_logos_order_idx" ON "pages_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_logos_parent_id_idx" ON "pages_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_logos_image_idx" ON "pages_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "pages_blocks_logo_cloud_order_idx" ON "pages_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_parent_id_idx" ON "pages_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_path_idx" ON "pages_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_logo_cloud_locales_locale_parent_id_unique" ON "pages_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_locales_parent_id_idx" ON "pages_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_locales_parent_id_idx" ON "pages_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_locales_parent_id_idx" ON "pages_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_quotes_order_idx" ON "pages_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_quotes_parent_id_idx" ON "pages_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_quotes_avatar_idx" ON "pages_blocks_testimonials_quotes" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "pages_blocks_testimonials_quotes_locales_locale_parent_id_un" ON "pages_blocks_testimonials_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_testimonials_quotes_locales_parent_id_idx" ON "pages_blocks_testimonials_quotes_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_order_idx" ON "pages_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_parent_id_idx" ON "pages_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_path_idx" ON "pages_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_testimonials_locales_locale_parent_id_unique" ON "pages_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_testimonials_locales_parent_id_idx" ON "pages_blocks_testimonials_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_captions_order_idx" ON "pages_blocks_video_captions" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_captions_parent_id_idx" ON "pages_blocks_video_captions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_captions_file_idx" ON "pages_blocks_video_captions" USING btree ("file_id");
  CREATE INDEX "pages_blocks_video_order_idx" ON "pages_blocks_video" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_parent_id_idx" ON "pages_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_path_idx" ON "pages_blocks_video" USING btree ("_path");
  CREATE INDEX "pages_blocks_video_file_idx" ON "pages_blocks_video" USING btree ("file_id");
  CREATE INDEX "pages_blocks_video_poster_idx" ON "pages_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "pages_blocks_video_locales_locale_parent_id_unique" ON "pages_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_video_locales_parent_id_idx" ON "pages_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spacer_order_idx" ON "pages_blocks_spacer" USING btree ("_order");
  CREATE INDEX "pages_blocks_spacer_parent_id_idx" ON "pages_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spacer_path_idx" ON "pages_blocks_spacer" USING btree ("_path");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_categories_id_idx" ON "pages_rels" USING btree ("categories_id");
  CREATE INDEX "pages_rels_collections_id_idx" ON "pages_rels" USING btree ("collections_id");
  CREATE INDEX "pages_rels_products_id_idx" ON "pages_rels" USING btree ("products_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_locales_parent_id_idx" ON "_pages_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_with_text_links_order_idx" ON "_pages_v_blocks_media_with_text_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_with_text_links_parent_id_idx" ON "_pages_v_blocks_media_with_text_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_media_with_text_links_locales_locale_parent_" ON "_pages_v_blocks_media_with_text_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_media_with_text_links_locales_parent_id_idx" ON "_pages_v_blocks_media_with_text_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_with_text_order_idx" ON "_pages_v_blocks_media_with_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_with_text_parent_id_idx" ON "_pages_v_blocks_media_with_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_with_text_path_idx" ON "_pages_v_blocks_media_with_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_with_text_media_idx" ON "_pages_v_blocks_media_with_text" USING btree ("media_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_media_with_text_locales_locale_parent_id_uni" ON "_pages_v_blocks_media_with_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_media_with_text_locales_parent_id_idx" ON "_pages_v_blocks_media_with_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_usp_bar_items_order_idx" ON "_pages_v_blocks_usp_bar_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_usp_bar_items_parent_id_idx" ON "_pages_v_blocks_usp_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_usp_bar_items_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_usp_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_usp_bar_items_locales_parent_id_idx" ON "_pages_v_blocks_usp_bar_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_usp_bar_order_idx" ON "_pages_v_blocks_usp_bar" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_usp_bar_parent_id_idx" ON "_pages_v_blocks_usp_bar" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_usp_bar_path_idx" ON "_pages_v_blocks_usp_bar" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_logo_cloud_logos_order_idx" ON "_pages_v_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_logos_parent_id_idx" ON "_pages_v_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_logos_image_idx" ON "_pages_v_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_order_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_parent_id_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_path_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_logo_cloud_locales_locale_parent_id_unique" ON "_pages_v_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_locales_parent_id_idx" ON "_pages_v_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_locales_parent_id_idx" ON "_pages_v_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_locales_parent_id_idx" ON "_pages_v_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_quotes_order_idx" ON "_pages_v_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_quotes_parent_id_idx" ON "_pages_v_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_quotes_avatar_idx" ON "_pages_v_blocks_testimonials_quotes" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_testimonials_quotes_locales_locale_parent_id" ON "_pages_v_blocks_testimonials_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_quotes_locales_parent_id_idx" ON "_pages_v_blocks_testimonials_quotes_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_order_idx" ON "_pages_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_parent_id_idx" ON "_pages_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_path_idx" ON "_pages_v_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_testimonials_locales_locale_parent_id_unique" ON "_pages_v_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_locales_parent_id_idx" ON "_pages_v_blocks_testimonials_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_captions_order_idx" ON "_pages_v_blocks_video_captions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_captions_parent_id_idx" ON "_pages_v_blocks_video_captions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_captions_file_idx" ON "_pages_v_blocks_video_captions" USING btree ("file_id");
  CREATE INDEX "_pages_v_blocks_video_order_idx" ON "_pages_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_parent_id_idx" ON "_pages_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_path_idx" ON "_pages_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_video_file_idx" ON "_pages_v_blocks_video" USING btree ("file_id");
  CREATE INDEX "_pages_v_blocks_video_poster_idx" ON "_pages_v_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_video_locales_locale_parent_id_unique" ON "_pages_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_video_locales_parent_id_idx" ON "_pages_v_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_spacer_order_idx" ON "_pages_v_blocks_spacer" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_spacer_parent_id_idx" ON "_pages_v_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_spacer_path_idx" ON "_pages_v_blocks_spacer" USING btree ("_path");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_categories_id_idx" ON "_pages_v_rels" USING btree ("categories_id");
  CREATE INDEX "_pages_v_rels_collections_id_idx" ON "_pages_v_rels" USING btree ("collections_id");
  CREATE INDEX "_pages_v_rels_products_id_idx" ON "_pages_v_rels" USING btree ("products_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "pages_blocks_media_with_text_links" CASCADE;
  DROP TABLE "pages_blocks_media_with_text_links_locales" CASCADE;
  DROP TABLE "pages_blocks_media_with_text" CASCADE;
  DROP TABLE "pages_blocks_media_with_text_locales" CASCADE;
  DROP TABLE "pages_blocks_usp_bar_items" CASCADE;
  DROP TABLE "pages_blocks_usp_bar_items_locales" CASCADE;
  DROP TABLE "pages_blocks_usp_bar" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "pages_blocks_testimonials_quotes_locales" CASCADE;
  DROP TABLE "pages_blocks_testimonials" CASCADE;
  DROP TABLE "pages_blocks_testimonials_locales" CASCADE;
  DROP TABLE "pages_blocks_video_captions" CASCADE;
  DROP TABLE "pages_blocks_video" CASCADE;
  DROP TABLE "pages_blocks_video_locales" CASCADE;
  DROP TABLE "pages_blocks_spacer" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_media_with_text_links" CASCADE;
  DROP TABLE "_pages_v_blocks_media_with_text_links_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_media_with_text" CASCADE;
  DROP TABLE "_pages_v_blocks_media_with_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_usp_bar_items" CASCADE;
  DROP TABLE "_pages_v_blocks_usp_bar_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_usp_bar" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials_quotes_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_video_captions" CASCADE;
  DROP TABLE "_pages_v_blocks_video" CASCADE;
  DROP TABLE "_pages_v_blocks_video_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_spacer" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_rich_text_variant";
  DROP TYPE "public"."enum_pages_blocks_rich_text_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_rich_text_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_rich_text_ss_container";
  DROP TYPE "public"."enum_pages_blocks_rich_text_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_variant";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_image_side";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_ss_container";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_items_icon";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_variant";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_ss_container";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_variant";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_ss_container";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_faq_variant";
  DROP TYPE "public"."enum_pages_blocks_faq_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_faq_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_faq_ss_container";
  DROP TYPE "public"."enum_pages_blocks_faq_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_testimonials_variant";
  DROP TYPE "public"."enum_pages_blocks_testimonials_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_testimonials_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_testimonials_ss_container";
  DROP TYPE "public"."enum_pages_blocks_testimonials_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_video_captions_language";
  DROP TYPE "public"."enum_pages_blocks_video_variant";
  DROP TYPE "public"."enum_pages_blocks_video_source";
  DROP TYPE "public"."enum_pages_blocks_video_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_video_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_video_ss_container";
  DROP TYPE "public"."enum_pages_blocks_video_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_spacer_variant";
  DROP TYPE "public"."enum_pages_blocks_spacer_size";
  DROP TYPE "public"."enum_pages_blocks_spacer_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_spacer_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_spacer_ss_container";
  DROP TYPE "public"."enum_pages_blocks_spacer_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_variant";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_variant";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_image_side";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_items_icon";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_variant";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_variant";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_faq_variant";
  DROP TYPE "public"."enum__pages_v_blocks_faq_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_faq_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_faq_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_faq_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_variant";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_video_captions_language";
  DROP TYPE "public"."enum__pages_v_blocks_video_variant";
  DROP TYPE "public"."enum__pages_v_blocks_video_source";
  DROP TYPE "public"."enum__pages_v_blocks_video_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_video_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_video_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_video_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_variant";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_size";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_ss_visibility";`);
}
