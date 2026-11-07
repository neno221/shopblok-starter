import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_rich_text_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_variant" AS ENUM('standard', 'overlap', 'full-bleed');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_media_with_text_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_2_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_2_variant" AS ENUM('standard', 'strip');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_usp_bar_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_2_variant" AS ENUM('standard', 'grid');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_faq_2_variant" AS ENUM('standard', 'side-heading');
  CREATE TYPE "public"."enum_pages_blocks_faq_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_faq_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_faq_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_faq_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_2_variant" AS ENUM('standard', 'single', 'carousel', 'wall');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_testimonials_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_video_2_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_pages_blocks_video_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_video_2_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum_pages_blocks_video_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_video_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_video_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_video_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_spacer_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_spacer_2_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_spacer_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_spacer_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_spacer_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_spacer_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_variant" AS ENUM('standard', 'overlay', 'centered', 'editorial', 'bento', 'collection-switcher', 'product', 'text');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_ps_mode" AS ENUM('none', 'collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_hero_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_category_showcase_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_links_link_appearance" AS ENUM('text');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_product_collection_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_featured_product_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_bundle_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_bundle_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_bundle_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_bundle_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_bundle_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_2_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_2_variant" AS ENUM('standard', 'strip', 'ticket', 'full-bleed', 'countdown', 'popup');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_promo_banner_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_comparison_2_variant" AS ENUM('standard', 'cards', 'highlight');
  CREATE TYPE "public"."enum_pages_blocks_comparison_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_comparison_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_comparison_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_comparison_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_2_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_newsletter_2_variant" AS ENUM('standard', 'split');
  CREATE TYPE "public"."enum_pages_blocks_newsletter_2_privacy_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_newsletter_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_newsletter_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_newsletter_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_newsletter_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_form_block_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_pages_blocks_form_block_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_form_block_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_form_block_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_form_block_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_2_variant" AS ENUM('standard', 'featured');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_2_source" AS ENUM('newest', 'handpicked');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_pages_blocks_editorial_list_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_variant" AS ENUM('standard', 'overlap', 'full-bleed');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_2_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_2_variant" AS ENUM('standard', 'strip');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_2_variant" AS ENUM('standard', 'grid');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_2_variant" AS ENUM('standard', 'side-heading');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_2_variant" AS ENUM('standard', 'single', 'carousel', 'wall');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_video_2_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum__pages_v_blocks_video_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_video_2_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum__pages_v_blocks_video_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_video_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_video_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_video_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_2_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_variant" AS ENUM('standard', 'overlay', 'centered', 'editorial', 'bento', 'collection-switcher', 'product', 'text');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_ps_mode" AS ENUM('none', 'collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_links_link_appearance" AS ENUM('text');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_bundle_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_2_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_2_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_2_variant" AS ENUM('standard', 'strip', 'ticket', 'full-bleed', 'countdown', 'popup');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_2_variant" AS ENUM('standard', 'cards', 'highlight');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_comparison_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_newsletter_2_variant" AS ENUM('standard', 'split');
  CREATE TYPE "public"."enum__pages_v_blocks_newsletter_2_privacy_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_form_block_2_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__pages_v_blocks_form_block_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_form_block_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_form_block_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_form_block_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_2_variant" AS ENUM('standard', 'featured');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_2_source" AS ENUM('newest', 'handpicked');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TABLE "pages_blocks_rich_text_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_rich_text_2_variant" DEFAULT 'standard',
  	"content" jsonb,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_rich_text_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_rich_text_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_rich_text_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_rich_text_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_media_with_text_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_media_with_text_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_media_with_text_2_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_media_with_text_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_media_with_text_2_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum_pages_blocks_media_with_text_2_image_side" DEFAULT 'end',
  	"heading" varchar,
  	"content" jsonb,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_media_with_text_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_media_with_text_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_media_with_text_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_media_with_text_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_usp_bar_2_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_pages_blocks_usp_bar_2_items_icon",
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_usp_bar_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_usp_bar_2_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_usp_bar_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_usp_bar_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_usp_bar_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_usp_bar_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud_2_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_logo_cloud_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_logo_cloud_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_logo_cloud_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_logo_cloud_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_logo_cloud_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_2_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_faq_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_faq_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_faq_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_faq_2_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_pages_blocks_faq_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_testimonials_2_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"role" varchar,
  	"rating" numeric,
  	"avatar_id" integer
  );
  
  CREATE TABLE "pages_blocks_testimonials_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_testimonials_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_testimonials_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_testimonials_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_testimonials_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_testimonials_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_video_2_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_pages_blocks_video_2_captions_language",
  	"file_id" integer
  );
  
  CREATE TABLE "pages_blocks_video_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_video_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"title" varchar,
  	"source" "enum_pages_blocks_video_2_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"caption" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_video_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_video_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_video_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_video_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_spacer_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_spacer_2_variant" DEFAULT 'standard',
  	"size" "enum_pages_blocks_spacer_2_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_spacer_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_spacer_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_spacer_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_spacer_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_2_collections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"collection_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "pages_blocks_hero_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_hero_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_hero_2_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_hero_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_hero_2_variant" DEFAULT 'standard',
  	"eyebrow" varchar,
  	"heading" varchar,
  	"subheading" varchar,
  	"media_id" integer,
  	"second_media_id" integer,
  	"countdown_end" timestamp(3) with time zone,
  	"product_source_mode" "enum_pages_blocks_hero_2_ps_mode" DEFAULT 'none',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 4,
  	"product_source_sort" "enum_pages_blocks_hero_2_ps_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_hero_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_hero_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_hero_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_hero_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_category_showcase_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_category_showcase_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_category_showcase_2_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "pages_blocks_category_showcase_2_cs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"label" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "pages_blocks_category_showcase_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_category_showcase_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"intro" varchar,
  	"category_source_mode" "enum_pages_blocks_category_showcase_2_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_category_showcase_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_category_showcase_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_category_showcase_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_category_showcase_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_product_collection_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_product_collection_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_product_collection_2_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "pages_blocks_product_collection_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_product_collection_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"intro" varchar,
  	"display" "enum_pages_blocks_product_collection_2_display" DEFAULT 'carousel',
  	"product_source_mode" "enum_pages_blocks_product_collection_2_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_pages_blocks_product_collection_2_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum_pages_blocks_product_collection_2_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_product_collection_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_product_collection_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_product_collection_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_product_collection_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_featured_product_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_featured_product_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"product_id" integer,
  	"text" varchar,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_featured_product_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_featured_product_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_featured_product_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_featured_product_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_bundle_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_bundle_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"text" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_bundle_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_bundle_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_bundle_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_bundle_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_promo_banner_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_blocks_promo_banner_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_pages_blocks_promo_banner_2_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "pages_blocks_promo_banner_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_promo_banner_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"text" varchar,
  	"code" varchar,
  	"terms" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_promo_banner_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_promo_banner_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_promo_banner_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_promo_banner_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_comparison_2_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"key" varchar
  );
  
  CREATE TABLE "pages_blocks_comparison_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_comparison_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"pick_id" integer,
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_comparison_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_comparison_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_comparison_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_comparison_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_collection_spotlight_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_collection_spotlight_2_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"heading" varchar,
  	"text" varchar,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum_pages_blocks_collection_spotlight_2_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_collection_spotlight_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_collection_spotlight_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_collection_spotlight_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_collection_spotlight_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_recently_viewed_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_recently_viewed_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_recently_viewed_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_recently_viewed_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_recently_viewed_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_recently_viewed_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_newsletter_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_newsletter_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"text" varchar,
  	"media_id" integer,
  	"form_id" integer,
  	"privacy_type" "enum_pages_blocks_newsletter_2_privacy_type" DEFAULT 'reference',
  	"privacy_url" varchar,
  	"privacy_new_tab" boolean,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_newsletter_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_newsletter_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_newsletter_2_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_pages_blocks_newsletter_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_form_block_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_form_block_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"intro" varchar,
  	"form_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_form_block_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_form_block_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_form_block_2_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_pages_blocks_form_block_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_editorial_list_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_editorial_list_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"source" "enum_pages_blocks_editorial_list_2_source" DEFAULT 'newest',
  	"limit" numeric DEFAULT 3,
  	"show_link" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_pages_blocks_editorial_list_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_pages_blocks_editorial_list_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_pages_blocks_editorial_list_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_pages_blocks_editorial_list_2_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_rich_text_2_variant" DEFAULT 'standard',
  	"content" jsonb,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_rich_text_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_rich_text_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_rich_text_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_rich_text_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_media_with_text_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_media_with_text_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_media_with_text_2_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_media_with_text_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_media_with_text_2_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum__pages_v_blocks_media_with_text_2_image_side" DEFAULT 'end',
  	"heading" varchar,
  	"content" jsonb,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_media_with_text_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_media_with_text_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_media_with_text_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_media_with_text_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_usp_bar_2_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__pages_v_blocks_usp_bar_2_items_icon",
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_usp_bar_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_usp_bar_2_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_usp_bar_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_usp_bar_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_usp_bar_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_usp_bar_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud_2_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_logo_cloud_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_logo_cloud_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_logo_cloud_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_logo_cloud_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_logo_cloud_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_2_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_faq_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_faq_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_faq_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_faq_2_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum__pages_v_blocks_faq_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials_2_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"role" varchar,
  	"rating" numeric,
  	"avatar_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_testimonials_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_testimonials_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_testimonials_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_testimonials_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_testimonials_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_video_2_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__pages_v_blocks_video_2_captions_language",
  	"file_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_video_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_video_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"title" varchar,
  	"source" "enum__pages_v_blocks_video_2_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"caption" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_video_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_video_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_video_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_video_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_spacer_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_spacer_2_variant" DEFAULT 'standard',
  	"size" "enum__pages_v_blocks_spacer_2_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_spacer_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_spacer_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_spacer_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_spacer_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_2_collections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection_id" integer,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_hero_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_hero_2_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_hero_2_variant" DEFAULT 'standard',
  	"eyebrow" varchar,
  	"heading" varchar,
  	"subheading" varchar,
  	"media_id" integer,
  	"second_media_id" integer,
  	"countdown_end" timestamp(3) with time zone,
  	"product_source_mode" "enum__pages_v_blocks_hero_2_ps_mode" DEFAULT 'none',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 4,
  	"product_source_sort" "enum__pages_v_blocks_hero_2_ps_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_hero_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_hero_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_hero_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_hero_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_category_showcase_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_category_showcase_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_category_showcase_2_links_link_appearance" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_blocks_category_showcase_2_cs_items_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"label" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_category_showcase_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_category_showcase_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"intro" varchar,
  	"category_source_mode" "enum__pages_v_blocks_category_showcase_2_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_category_showcase_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_category_showcase_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_category_showcase_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_category_showcase_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_product_collection_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_product_collection_2_links_link_appearance" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_product_collection_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_product_collection_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"intro" varchar,
  	"display" "enum__pages_v_blocks_product_collection_2_display" DEFAULT 'carousel',
  	"product_source_mode" "enum__pages_v_blocks_product_collection_2_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum__pages_v_blocks_product_collection_2_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum__pages_v_blocks_product_collection_2_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_product_collection_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_product_collection_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_product_collection_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_product_collection_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_featured_product_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_featured_product_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"product_id" integer,
  	"text" varchar,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_featured_product_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_featured_product_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_featured_product_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_featured_product_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_bundle_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_bundle_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"text" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_bundle_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_bundle_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_bundle_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_bundle_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_promo_banner_2_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_blocks_promo_banner_2_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__pages_v_blocks_promo_banner_2_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_promo_banner_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_promo_banner_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"text" varchar,
  	"code" varchar,
  	"terms" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_promo_banner_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_promo_banner_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_promo_banner_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_promo_banner_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparison_2_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"key" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparison_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_comparison_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"pick_id" integer,
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_comparison_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_comparison_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_comparison_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_comparison_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_collection_spotlight_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_collection_spotlight_2_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"heading" varchar,
  	"text" varchar,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum__pages_v_blocks_collection_spotlight_2_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_collection_spotlight_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_collection_spotlight_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_collection_spotlight_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_collection_spotlight_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_recently_viewed_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_recently_viewed_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_recently_viewed_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_recently_viewed_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_recently_viewed_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_recently_viewed_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_newsletter_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_newsletter_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"text" varchar,
  	"media_id" integer,
  	"form_id" integer,
  	"privacy_type" "enum__pages_v_blocks_newsletter_2_privacy_type" DEFAULT 'reference',
  	"privacy_url" varchar,
  	"privacy_new_tab" boolean,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_newsletter_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_newsletter_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_newsletter_2_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum__pages_v_blocks_newsletter_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_form_block_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_form_block_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"intro" varchar,
  	"form_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_form_block_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_form_block_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_form_block_2_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum__pages_v_blocks_form_block_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_editorial_list_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_editorial_list_2_variant" DEFAULT 'standard',
  	"heading" varchar,
  	"source" "enum__pages_v_blocks_editorial_list_2_source" DEFAULT 'newest',
  	"limit" numeric DEFAULT 3,
  	"show_link" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__pages_v_blocks_editorial_list_2_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__pages_v_blocks_editorial_list_2_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__pages_v_blocks_editorial_list_2_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__pages_v_blocks_editorial_list_2_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  DROP INDEX "pages_rels_categories_id_idx";
  DROP INDEX "pages_rels_collections_id_idx";
  DROP INDEX "pages_rels_products_id_idx";
  DROP INDEX "pages_rels_posts_id_idx";
  DROP INDEX "_pages_v_rels_categories_id_idx";
  DROP INDEX "_pages_v_rels_collections_id_idx";
  DROP INDEX "_pages_v_rels_products_id_idx";
  DROP INDEX "_pages_v_rels_posts_id_idx";
  ALTER TABLE "pages" ADD COLUMN "layout_per_language" boolean DEFAULT false;
  ALTER TABLE "pages_rels" ADD COLUMN "locale" "_locales";
  ALTER TABLE "_pages_v" ADD COLUMN "version_layout_per_language" boolean DEFAULT false;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "locale" "_locales";
  ALTER TABLE "pages_blocks_rich_text_2" ADD CONSTRAINT "pages_blocks_rich_text_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text_2_links" ADD CONSTRAINT "pages_blocks_media_with_text_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_media_with_text_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text_2" ADD CONSTRAINT "pages_blocks_media_with_text_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_media_with_text_2" ADD CONSTRAINT "pages_blocks_media_with_text_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_usp_bar_2_items" ADD CONSTRAINT "pages_blocks_usp_bar_2_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_usp_bar_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_usp_bar_2" ADD CONSTRAINT "pages_blocks_usp_bar_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_2_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_2_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_2_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_2_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_logo_cloud_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_2" ADD CONSTRAINT "pages_blocks_logo_cloud_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_2_items" ADD CONSTRAINT "pages_blocks_faq_2_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_2" ADD CONSTRAINT "pages_blocks_faq_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_2_quotes" ADD CONSTRAINT "pages_blocks_testimonials_2_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_2_quotes" ADD CONSTRAINT "pages_blocks_testimonials_2_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_testimonials_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_2" ADD CONSTRAINT "pages_blocks_testimonials_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_2_captions" ADD CONSTRAINT "pages_blocks_video_2_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_2_captions" ADD CONSTRAINT "pages_blocks_video_2_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_video_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_2" ADD CONSTRAINT "pages_blocks_video_2_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_2" ADD CONSTRAINT "pages_blocks_video_2_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_video_2" ADD CONSTRAINT "pages_blocks_video_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_spacer_2" ADD CONSTRAINT "pages_blocks_spacer_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2_collections" ADD CONSTRAINT "pages_blocks_hero_2_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2_collections" ADD CONSTRAINT "pages_blocks_hero_2_collections_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2_collections" ADD CONSTRAINT "pages_blocks_hero_2_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2_links" ADD CONSTRAINT "pages_blocks_hero_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2" ADD CONSTRAINT "pages_blocks_hero_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2" ADD CONSTRAINT "pages_blocks_hero_2_second_media_id_media_id_fk" FOREIGN KEY ("second_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2" ADD CONSTRAINT "pages_blocks_hero_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2" ADD CONSTRAINT "pages_blocks_hero_2_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2" ADD CONSTRAINT "pages_blocks_hero_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2_links" ADD CONSTRAINT "pages_blocks_category_showcase_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_showcase_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_2_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_2_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_2_cs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_category_showcase_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2" ADD CONSTRAINT "pages_blocks_category_showcase_2_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2" ADD CONSTRAINT "pages_blocks_category_showcase_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2_links" ADD CONSTRAINT "pages_blocks_product_collection_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_collection_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2" ADD CONSTRAINT "pages_blocks_product_collection_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2" ADD CONSTRAINT "pages_blocks_product_collection_2_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2" ADD CONSTRAINT "pages_blocks_product_collection_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_featured_product_2" ADD CONSTRAINT "pages_blocks_featured_product_2_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_featured_product_2" ADD CONSTRAINT "pages_blocks_featured_product_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_featured_product_2" ADD CONSTRAINT "pages_blocks_featured_product_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_bundle_2" ADD CONSTRAINT "pages_blocks_bundle_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner_2_links" ADD CONSTRAINT "pages_blocks_promo_banner_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_promo_banner_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner_2" ADD CONSTRAINT "pages_blocks_promo_banner_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_promo_banner_2" ADD CONSTRAINT "pages_blocks_promo_banner_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_2_rows" ADD CONSTRAINT "pages_blocks_comparison_2_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_comparison_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_2" ADD CONSTRAINT "pages_blocks_comparison_2_pick_id_products_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparison_2" ADD CONSTRAINT "pages_blocks_comparison_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight_2" ADD CONSTRAINT "pages_blocks_collection_spotlight_2_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight_2" ADD CONSTRAINT "pages_blocks_collection_spotlight_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight_2" ADD CONSTRAINT "pages_blocks_collection_spotlight_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_recently_viewed_2" ADD CONSTRAINT "pages_blocks_recently_viewed_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_newsletter_2" ADD CONSTRAINT "pages_blocks_newsletter_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_newsletter_2" ADD CONSTRAINT "pages_blocks_newsletter_2_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_newsletter_2" ADD CONSTRAINT "pages_blocks_newsletter_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_form_block_2" ADD CONSTRAINT "pages_blocks_form_block_2_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_form_block_2" ADD CONSTRAINT "pages_blocks_form_block_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_editorial_list_2" ADD CONSTRAINT "pages_blocks_editorial_list_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text_2" ADD CONSTRAINT "_pages_v_blocks_rich_text_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text_2_links" ADD CONSTRAINT "_pages_v_blocks_media_with_text_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_media_with_text_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text_2" ADD CONSTRAINT "_pages_v_blocks_media_with_text_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_media_with_text_2" ADD CONSTRAINT "_pages_v_blocks_media_with_text_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_usp_bar_2_items" ADD CONSTRAINT "_pages_v_blocks_usp_bar_2_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_usp_bar_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_usp_bar_2" ADD CONSTRAINT "_pages_v_blocks_usp_bar_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_2_logos" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_2_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_2_logos" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_2_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_logo_cloud_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_2" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_2_items" ADD CONSTRAINT "_pages_v_blocks_faq_2_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_2" ADD CONSTRAINT "_pages_v_blocks_faq_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_2_quotes" ADD CONSTRAINT "_pages_v_blocks_testimonials_2_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_2_quotes" ADD CONSTRAINT "_pages_v_blocks_testimonials_2_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_testimonials_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_2" ADD CONSTRAINT "_pages_v_blocks_testimonials_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_2_captions" ADD CONSTRAINT "_pages_v_blocks_video_2_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_2_captions" ADD CONSTRAINT "_pages_v_blocks_video_2_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_video_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_2" ADD CONSTRAINT "_pages_v_blocks_video_2_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_2" ADD CONSTRAINT "_pages_v_blocks_video_2_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_video_2" ADD CONSTRAINT "_pages_v_blocks_video_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_spacer_2" ADD CONSTRAINT "_pages_v_blocks_spacer_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2_collections" ADD CONSTRAINT "_pages_v_blocks_hero_2_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2_collections" ADD CONSTRAINT "_pages_v_blocks_hero_2_collections_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2_collections" ADD CONSTRAINT "_pages_v_blocks_hero_2_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2_links" ADD CONSTRAINT "_pages_v_blocks_hero_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_second_media_id_media_id_fk" FOREIGN KEY ("second_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_2_links" ADD CONSTRAINT "_pages_v_blocks_category_showcase_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_category_showcase_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_category_showcase_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_2" ADD CONSTRAINT "_pages_v_blocks_category_showcase_2_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_2" ADD CONSTRAINT "_pages_v_blocks_category_showcase_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2_links" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_collection_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_product_2" ADD CONSTRAINT "_pages_v_blocks_featured_product_2_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_product_2" ADD CONSTRAINT "_pages_v_blocks_featured_product_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_product_2" ADD CONSTRAINT "_pages_v_blocks_featured_product_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_bundle_2" ADD CONSTRAINT "_pages_v_blocks_bundle_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner_2_links" ADD CONSTRAINT "_pages_v_blocks_promo_banner_2_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_promo_banner_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner_2" ADD CONSTRAINT "_pages_v_blocks_promo_banner_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_promo_banner_2" ADD CONSTRAINT "_pages_v_blocks_promo_banner_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_2_rows" ADD CONSTRAINT "_pages_v_blocks_comparison_2_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_comparison_2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_2" ADD CONSTRAINT "_pages_v_blocks_comparison_2_pick_id_products_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparison_2" ADD CONSTRAINT "_pages_v_blocks_comparison_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_2_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_recently_viewed_2" ADD CONSTRAINT "_pages_v_blocks_recently_viewed_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_newsletter_2" ADD CONSTRAINT "_pages_v_blocks_newsletter_2_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_newsletter_2" ADD CONSTRAINT "_pages_v_blocks_newsletter_2_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_newsletter_2" ADD CONSTRAINT "_pages_v_blocks_newsletter_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_form_block_2" ADD CONSTRAINT "_pages_v_blocks_form_block_2_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_form_block_2" ADD CONSTRAINT "_pages_v_blocks_form_block_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_editorial_list_2" ADD CONSTRAINT "_pages_v_blocks_editorial_list_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_rich_text_2_order_idx" ON "pages_blocks_rich_text_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_2_parent_id_idx" ON "pages_blocks_rich_text_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_2_path_idx" ON "pages_blocks_rich_text_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_rich_text_2_locale_idx" ON "pages_blocks_rich_text_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_media_with_text_2_links_order_idx" ON "pages_blocks_media_with_text_2_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_with_text_2_links_parent_id_idx" ON "pages_blocks_media_with_text_2_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_with_text_2_links_locale_idx" ON "pages_blocks_media_with_text_2_links" USING btree ("_locale");
  CREATE INDEX "pages_blocks_media_with_text_2_order_idx" ON "pages_blocks_media_with_text_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_with_text_2_parent_id_idx" ON "pages_blocks_media_with_text_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_with_text_2_path_idx" ON "pages_blocks_media_with_text_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_with_text_2_locale_idx" ON "pages_blocks_media_with_text_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_media_with_text_2_media_idx" ON "pages_blocks_media_with_text_2" USING btree ("media_id");
  CREATE INDEX "pages_blocks_usp_bar_2_items_order_idx" ON "pages_blocks_usp_bar_2_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_usp_bar_2_items_parent_id_idx" ON "pages_blocks_usp_bar_2_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_usp_bar_2_items_locale_idx" ON "pages_blocks_usp_bar_2_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_usp_bar_2_order_idx" ON "pages_blocks_usp_bar_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_usp_bar_2_parent_id_idx" ON "pages_blocks_usp_bar_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_usp_bar_2_path_idx" ON "pages_blocks_usp_bar_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_usp_bar_2_locale_idx" ON "pages_blocks_usp_bar_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_logo_cloud_2_logos_order_idx" ON "pages_blocks_logo_cloud_2_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_2_logos_parent_id_idx" ON "pages_blocks_logo_cloud_2_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_2_logos_locale_idx" ON "pages_blocks_logo_cloud_2_logos" USING btree ("_locale");
  CREATE INDEX "pages_blocks_logo_cloud_2_logos_image_idx" ON "pages_blocks_logo_cloud_2_logos" USING btree ("image_id");
  CREATE INDEX "pages_blocks_logo_cloud_2_order_idx" ON "pages_blocks_logo_cloud_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_2_parent_id_idx" ON "pages_blocks_logo_cloud_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_2_path_idx" ON "pages_blocks_logo_cloud_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_logo_cloud_2_locale_idx" ON "pages_blocks_logo_cloud_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_faq_2_items_order_idx" ON "pages_blocks_faq_2_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_2_items_parent_id_idx" ON "pages_blocks_faq_2_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_2_items_locale_idx" ON "pages_blocks_faq_2_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_faq_2_order_idx" ON "pages_blocks_faq_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_2_parent_id_idx" ON "pages_blocks_faq_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_2_path_idx" ON "pages_blocks_faq_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_2_locale_idx" ON "pages_blocks_faq_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_testimonials_2_quotes_order_idx" ON "pages_blocks_testimonials_2_quotes" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_2_quotes_parent_id_idx" ON "pages_blocks_testimonials_2_quotes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_2_quotes_locale_idx" ON "pages_blocks_testimonials_2_quotes" USING btree ("_locale");
  CREATE INDEX "pages_blocks_testimonials_2_quotes_avatar_idx" ON "pages_blocks_testimonials_2_quotes" USING btree ("avatar_id");
  CREATE INDEX "pages_blocks_testimonials_2_order_idx" ON "pages_blocks_testimonials_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_2_parent_id_idx" ON "pages_blocks_testimonials_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_2_path_idx" ON "pages_blocks_testimonials_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_testimonials_2_locale_idx" ON "pages_blocks_testimonials_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_video_2_captions_order_idx" ON "pages_blocks_video_2_captions" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_2_captions_parent_id_idx" ON "pages_blocks_video_2_captions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_2_captions_locale_idx" ON "pages_blocks_video_2_captions" USING btree ("_locale");
  CREATE INDEX "pages_blocks_video_2_captions_file_idx" ON "pages_blocks_video_2_captions" USING btree ("file_id");
  CREATE INDEX "pages_blocks_video_2_order_idx" ON "pages_blocks_video_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_2_parent_id_idx" ON "pages_blocks_video_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_2_path_idx" ON "pages_blocks_video_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_video_2_locale_idx" ON "pages_blocks_video_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_video_2_file_idx" ON "pages_blocks_video_2" USING btree ("file_id");
  CREATE INDEX "pages_blocks_video_2_poster_idx" ON "pages_blocks_video_2" USING btree ("poster_id");
  CREATE INDEX "pages_blocks_spacer_2_order_idx" ON "pages_blocks_spacer_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_spacer_2_parent_id_idx" ON "pages_blocks_spacer_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spacer_2_path_idx" ON "pages_blocks_spacer_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_spacer_2_locale_idx" ON "pages_blocks_spacer_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_2_collections_order_idx" ON "pages_blocks_hero_2_collections" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_2_collections_parent_id_idx" ON "pages_blocks_hero_2_collections" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_2_collections_locale_idx" ON "pages_blocks_hero_2_collections" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_2_collections_collection_idx" ON "pages_blocks_hero_2_collections" USING btree ("collection_id");
  CREATE INDEX "pages_blocks_hero_2_collections_media_idx" ON "pages_blocks_hero_2_collections" USING btree ("media_id");
  CREATE INDEX "pages_blocks_hero_2_links_order_idx" ON "pages_blocks_hero_2_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_2_links_parent_id_idx" ON "pages_blocks_hero_2_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_2_links_locale_idx" ON "pages_blocks_hero_2_links" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_2_order_idx" ON "pages_blocks_hero_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_2_parent_id_idx" ON "pages_blocks_hero_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_2_path_idx" ON "pages_blocks_hero_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_2_locale_idx" ON "pages_blocks_hero_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_2_media_idx" ON "pages_blocks_hero_2" USING btree ("media_id");
  CREATE INDEX "pages_blocks_hero_2_second_media_idx" ON "pages_blocks_hero_2" USING btree ("second_media_id");
  CREATE INDEX "pages_blocks_hero_2_product_source_product_source_collec_idx" ON "pages_blocks_hero_2" USING btree ("product_source_collection_id");
  CREATE INDEX "pages_blocks_hero_2_product_source_product_source_catego_idx" ON "pages_blocks_hero_2" USING btree ("product_source_category_id");
  CREATE INDEX "pages_blocks_category_showcase_2_links_order_idx" ON "pages_blocks_category_showcase_2_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_category_showcase_2_links_parent_id_idx" ON "pages_blocks_category_showcase_2_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_2_links_locale_idx" ON "pages_blocks_category_showcase_2_links" USING btree ("_locale");
  CREATE INDEX "pages_blocks_category_showcase_2_cs_items_order_idx" ON "pages_blocks_category_showcase_2_cs_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_category_showcase_2_cs_items_parent_id_idx" ON "pages_blocks_category_showcase_2_cs_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_2_cs_items_locale_idx" ON "pages_blocks_category_showcase_2_cs_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_category_showcase_2_cs_items_category_idx" ON "pages_blocks_category_showcase_2_cs_items" USING btree ("category_id");
  CREATE INDEX "pages_blocks_category_showcase_2_cs_items_image_idx" ON "pages_blocks_category_showcase_2_cs_items" USING btree ("image_id");
  CREATE INDEX "pages_blocks_category_showcase_2_order_idx" ON "pages_blocks_category_showcase_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_category_showcase_2_parent_id_idx" ON "pages_blocks_category_showcase_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_category_showcase_2_path_idx" ON "pages_blocks_category_showcase_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_category_showcase_2_locale_idx" ON "pages_blocks_category_showcase_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_category_showcase_2_category_source_categor_idx" ON "pages_blocks_category_showcase_2" USING btree ("category_source_parent_id");
  CREATE INDEX "pages_blocks_product_collection_2_links_order_idx" ON "pages_blocks_product_collection_2_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_collection_2_links_parent_id_idx" ON "pages_blocks_product_collection_2_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_collection_2_links_locale_idx" ON "pages_blocks_product_collection_2_links" USING btree ("_locale");
  CREATE INDEX "pages_blocks_product_collection_2_order_idx" ON "pages_blocks_product_collection_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_collection_2_parent_id_idx" ON "pages_blocks_product_collection_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_collection_2_path_idx" ON "pages_blocks_product_collection_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_product_collection_2_locale_idx" ON "pages_blocks_product_collection_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_product_collection_2_product_source_product_idx" ON "pages_blocks_product_collection_2" USING btree ("product_source_collection_id");
  CREATE INDEX "pages_blocks_product_collection_2_product_source_produ_1_idx" ON "pages_blocks_product_collection_2" USING btree ("product_source_category_id");
  CREATE INDEX "pages_blocks_featured_product_2_order_idx" ON "pages_blocks_featured_product_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_featured_product_2_parent_id_idx" ON "pages_blocks_featured_product_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_featured_product_2_path_idx" ON "pages_blocks_featured_product_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_featured_product_2_locale_idx" ON "pages_blocks_featured_product_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_featured_product_2_product_idx" ON "pages_blocks_featured_product_2" USING btree ("product_id");
  CREATE INDEX "pages_blocks_featured_product_2_media_idx" ON "pages_blocks_featured_product_2" USING btree ("media_id");
  CREATE INDEX "pages_blocks_bundle_2_order_idx" ON "pages_blocks_bundle_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_bundle_2_parent_id_idx" ON "pages_blocks_bundle_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_bundle_2_path_idx" ON "pages_blocks_bundle_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_bundle_2_locale_idx" ON "pages_blocks_bundle_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_promo_banner_2_links_order_idx" ON "pages_blocks_promo_banner_2_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_promo_banner_2_links_parent_id_idx" ON "pages_blocks_promo_banner_2_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_2_links_locale_idx" ON "pages_blocks_promo_banner_2_links" USING btree ("_locale");
  CREATE INDEX "pages_blocks_promo_banner_2_order_idx" ON "pages_blocks_promo_banner_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_promo_banner_2_parent_id_idx" ON "pages_blocks_promo_banner_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_2_path_idx" ON "pages_blocks_promo_banner_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_promo_banner_2_locale_idx" ON "pages_blocks_promo_banner_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_promo_banner_2_media_idx" ON "pages_blocks_promo_banner_2" USING btree ("media_id");
  CREATE INDEX "pages_blocks_comparison_2_rows_order_idx" ON "pages_blocks_comparison_2_rows" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparison_2_rows_parent_id_idx" ON "pages_blocks_comparison_2_rows" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_2_rows_locale_idx" ON "pages_blocks_comparison_2_rows" USING btree ("_locale");
  CREATE INDEX "pages_blocks_comparison_2_order_idx" ON "pages_blocks_comparison_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparison_2_parent_id_idx" ON "pages_blocks_comparison_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparison_2_path_idx" ON "pages_blocks_comparison_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_comparison_2_locale_idx" ON "pages_blocks_comparison_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_comparison_2_pick_idx" ON "pages_blocks_comparison_2" USING btree ("pick_id");
  CREATE INDEX "pages_blocks_collection_spotlight_2_order_idx" ON "pages_blocks_collection_spotlight_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_collection_spotlight_2_parent_id_idx" ON "pages_blocks_collection_spotlight_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_collection_spotlight_2_path_idx" ON "pages_blocks_collection_spotlight_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_collection_spotlight_2_locale_idx" ON "pages_blocks_collection_spotlight_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_collection_spotlight_2_collection_idx" ON "pages_blocks_collection_spotlight_2" USING btree ("collection_id");
  CREATE INDEX "pages_blocks_collection_spotlight_2_media_idx" ON "pages_blocks_collection_spotlight_2" USING btree ("media_id");
  CREATE INDEX "pages_blocks_recently_viewed_2_order_idx" ON "pages_blocks_recently_viewed_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_recently_viewed_2_parent_id_idx" ON "pages_blocks_recently_viewed_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_recently_viewed_2_path_idx" ON "pages_blocks_recently_viewed_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_recently_viewed_2_locale_idx" ON "pages_blocks_recently_viewed_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_newsletter_2_order_idx" ON "pages_blocks_newsletter_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_newsletter_2_parent_id_idx" ON "pages_blocks_newsletter_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_newsletter_2_path_idx" ON "pages_blocks_newsletter_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_newsletter_2_locale_idx" ON "pages_blocks_newsletter_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_newsletter_2_media_idx" ON "pages_blocks_newsletter_2" USING btree ("media_id");
  CREATE INDEX "pages_blocks_newsletter_2_form_idx" ON "pages_blocks_newsletter_2" USING btree ("form_id");
  CREATE INDEX "pages_blocks_form_block_2_order_idx" ON "pages_blocks_form_block_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_block_2_parent_id_idx" ON "pages_blocks_form_block_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_block_2_path_idx" ON "pages_blocks_form_block_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_block_2_locale_idx" ON "pages_blocks_form_block_2" USING btree ("_locale");
  CREATE INDEX "pages_blocks_form_block_2_form_idx" ON "pages_blocks_form_block_2" USING btree ("form_id");
  CREATE INDEX "pages_blocks_editorial_list_2_order_idx" ON "pages_blocks_editorial_list_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_editorial_list_2_parent_id_idx" ON "pages_blocks_editorial_list_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_editorial_list_2_path_idx" ON "pages_blocks_editorial_list_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_editorial_list_2_locale_idx" ON "pages_blocks_editorial_list_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_rich_text_2_order_idx" ON "_pages_v_blocks_rich_text_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_2_parent_id_idx" ON "_pages_v_blocks_rich_text_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_2_path_idx" ON "_pages_v_blocks_rich_text_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_rich_text_2_locale_idx" ON "_pages_v_blocks_rich_text_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_links_order_idx" ON "_pages_v_blocks_media_with_text_2_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_links_parent_id_idx" ON "_pages_v_blocks_media_with_text_2_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_links_locale_idx" ON "_pages_v_blocks_media_with_text_2_links" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_order_idx" ON "_pages_v_blocks_media_with_text_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_parent_id_idx" ON "_pages_v_blocks_media_with_text_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_path_idx" ON "_pages_v_blocks_media_with_text_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_locale_idx" ON "_pages_v_blocks_media_with_text_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_media_with_text_2_media_idx" ON "_pages_v_blocks_media_with_text_2" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_usp_bar_2_items_order_idx" ON "_pages_v_blocks_usp_bar_2_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_usp_bar_2_items_parent_id_idx" ON "_pages_v_blocks_usp_bar_2_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_usp_bar_2_items_locale_idx" ON "_pages_v_blocks_usp_bar_2_items" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_usp_bar_2_order_idx" ON "_pages_v_blocks_usp_bar_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_usp_bar_2_parent_id_idx" ON "_pages_v_blocks_usp_bar_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_usp_bar_2_path_idx" ON "_pages_v_blocks_usp_bar_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_usp_bar_2_locale_idx" ON "_pages_v_blocks_usp_bar_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_logos_order_idx" ON "_pages_v_blocks_logo_cloud_2_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_logos_parent_id_idx" ON "_pages_v_blocks_logo_cloud_2_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_logos_locale_idx" ON "_pages_v_blocks_logo_cloud_2_logos" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_logos_image_idx" ON "_pages_v_blocks_logo_cloud_2_logos" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_order_idx" ON "_pages_v_blocks_logo_cloud_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_parent_id_idx" ON "_pages_v_blocks_logo_cloud_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_path_idx" ON "_pages_v_blocks_logo_cloud_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_logo_cloud_2_locale_idx" ON "_pages_v_blocks_logo_cloud_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_faq_2_items_order_idx" ON "_pages_v_blocks_faq_2_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_2_items_parent_id_idx" ON "_pages_v_blocks_faq_2_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_2_items_locale_idx" ON "_pages_v_blocks_faq_2_items" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_faq_2_order_idx" ON "_pages_v_blocks_faq_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_2_parent_id_idx" ON "_pages_v_blocks_faq_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_2_path_idx" ON "_pages_v_blocks_faq_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_faq_2_locale_idx" ON "_pages_v_blocks_faq_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_testimonials_2_quotes_order_idx" ON "_pages_v_blocks_testimonials_2_quotes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_2_quotes_parent_id_idx" ON "_pages_v_blocks_testimonials_2_quotes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_2_quotes_locale_idx" ON "_pages_v_blocks_testimonials_2_quotes" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_testimonials_2_quotes_avatar_idx" ON "_pages_v_blocks_testimonials_2_quotes" USING btree ("avatar_id");
  CREATE INDEX "_pages_v_blocks_testimonials_2_order_idx" ON "_pages_v_blocks_testimonials_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_2_parent_id_idx" ON "_pages_v_blocks_testimonials_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_2_path_idx" ON "_pages_v_blocks_testimonials_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_testimonials_2_locale_idx" ON "_pages_v_blocks_testimonials_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_video_2_captions_order_idx" ON "_pages_v_blocks_video_2_captions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_2_captions_parent_id_idx" ON "_pages_v_blocks_video_2_captions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_2_captions_locale_idx" ON "_pages_v_blocks_video_2_captions" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_video_2_captions_file_idx" ON "_pages_v_blocks_video_2_captions" USING btree ("file_id");
  CREATE INDEX "_pages_v_blocks_video_2_order_idx" ON "_pages_v_blocks_video_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_2_parent_id_idx" ON "_pages_v_blocks_video_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_2_path_idx" ON "_pages_v_blocks_video_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_video_2_locale_idx" ON "_pages_v_blocks_video_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_video_2_file_idx" ON "_pages_v_blocks_video_2" USING btree ("file_id");
  CREATE INDEX "_pages_v_blocks_video_2_poster_idx" ON "_pages_v_blocks_video_2" USING btree ("poster_id");
  CREATE INDEX "_pages_v_blocks_spacer_2_order_idx" ON "_pages_v_blocks_spacer_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_spacer_2_parent_id_idx" ON "_pages_v_blocks_spacer_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_spacer_2_path_idx" ON "_pages_v_blocks_spacer_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_spacer_2_locale_idx" ON "_pages_v_blocks_spacer_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_hero_2_collections_order_idx" ON "_pages_v_blocks_hero_2_collections" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_2_collections_parent_id_idx" ON "_pages_v_blocks_hero_2_collections" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_2_collections_locale_idx" ON "_pages_v_blocks_hero_2_collections" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_hero_2_collections_collection_idx" ON "_pages_v_blocks_hero_2_collections" USING btree ("collection_id");
  CREATE INDEX "_pages_v_blocks_hero_2_collections_media_idx" ON "_pages_v_blocks_hero_2_collections" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_hero_2_links_order_idx" ON "_pages_v_blocks_hero_2_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_2_links_parent_id_idx" ON "_pages_v_blocks_hero_2_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_2_links_locale_idx" ON "_pages_v_blocks_hero_2_links" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_hero_2_order_idx" ON "_pages_v_blocks_hero_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_2_parent_id_idx" ON "_pages_v_blocks_hero_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_2_path_idx" ON "_pages_v_blocks_hero_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_2_locale_idx" ON "_pages_v_blocks_hero_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_hero_2_media_idx" ON "_pages_v_blocks_hero_2" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_hero_2_second_media_idx" ON "_pages_v_blocks_hero_2" USING btree ("second_media_id");
  CREATE INDEX "_pages_v_blocks_hero_2_product_source_product_source_col_idx" ON "_pages_v_blocks_hero_2" USING btree ("product_source_collection_id");
  CREATE INDEX "_pages_v_blocks_hero_2_product_source_product_source_cat_idx" ON "_pages_v_blocks_hero_2" USING btree ("product_source_category_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_links_order_idx" ON "_pages_v_blocks_category_showcase_2_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_links_parent_id_idx" ON "_pages_v_blocks_category_showcase_2_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_links_locale_idx" ON "_pages_v_blocks_category_showcase_2_links" USING btree ("_locale");
  CREATE INDEX "_pages_blocks_category_showcase_2_cs_items_v_order_idx" ON "_pages_blocks_category_showcase_2_cs_items_v" USING btree ("_order");
  CREATE INDEX "_pages_blocks_category_showcase_2_cs_items_v_parent_id_idx" ON "_pages_blocks_category_showcase_2_cs_items_v" USING btree ("_parent_id");
  CREATE INDEX "_pages_blocks_category_showcase_2_cs_items_v_locale_idx" ON "_pages_blocks_category_showcase_2_cs_items_v" USING btree ("_locale");
  CREATE INDEX "_pages_blocks_category_showcase_2_cs_items_v_category_idx" ON "_pages_blocks_category_showcase_2_cs_items_v" USING btree ("category_id");
  CREATE INDEX "_pages_blocks_category_showcase_2_cs_items_v_image_idx" ON "_pages_blocks_category_showcase_2_cs_items_v" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_order_idx" ON "_pages_v_blocks_category_showcase_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_parent_id_idx" ON "_pages_v_blocks_category_showcase_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_path_idx" ON "_pages_v_blocks_category_showcase_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_locale_idx" ON "_pages_v_blocks_category_showcase_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_category_showcase_2_category_source_cate_idx" ON "_pages_v_blocks_category_showcase_2" USING btree ("category_source_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_2_links_order_idx" ON "_pages_v_blocks_product_collection_2_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_product_collection_2_links_parent_id_idx" ON "_pages_v_blocks_product_collection_2_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_2_links_locale_idx" ON "_pages_v_blocks_product_collection_2_links" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_product_collection_2_order_idx" ON "_pages_v_blocks_product_collection_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_product_collection_2_parent_id_idx" ON "_pages_v_blocks_product_collection_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_collection_2_path_idx" ON "_pages_v_blocks_product_collection_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_product_collection_2_locale_idx" ON "_pages_v_blocks_product_collection_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_product_collection_2_product_source_prod_idx" ON "_pages_v_blocks_product_collection_2" USING btree ("product_source_collection_id");
  CREATE INDEX "_pages_v_blocks_product_collection_2_product_source_pr_1_idx" ON "_pages_v_blocks_product_collection_2" USING btree ("product_source_category_id");
  CREATE INDEX "_pages_v_blocks_featured_product_2_order_idx" ON "_pages_v_blocks_featured_product_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_featured_product_2_parent_id_idx" ON "_pages_v_blocks_featured_product_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_featured_product_2_path_idx" ON "_pages_v_blocks_featured_product_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_featured_product_2_locale_idx" ON "_pages_v_blocks_featured_product_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_featured_product_2_product_idx" ON "_pages_v_blocks_featured_product_2" USING btree ("product_id");
  CREATE INDEX "_pages_v_blocks_featured_product_2_media_idx" ON "_pages_v_blocks_featured_product_2" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_bundle_2_order_idx" ON "_pages_v_blocks_bundle_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_bundle_2_parent_id_idx" ON "_pages_v_blocks_bundle_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_bundle_2_path_idx" ON "_pages_v_blocks_bundle_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_bundle_2_locale_idx" ON "_pages_v_blocks_bundle_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_links_order_idx" ON "_pages_v_blocks_promo_banner_2_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_links_parent_id_idx" ON "_pages_v_blocks_promo_banner_2_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_links_locale_idx" ON "_pages_v_blocks_promo_banner_2_links" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_order_idx" ON "_pages_v_blocks_promo_banner_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_parent_id_idx" ON "_pages_v_blocks_promo_banner_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_path_idx" ON "_pages_v_blocks_promo_banner_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_locale_idx" ON "_pages_v_blocks_promo_banner_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_promo_banner_2_media_idx" ON "_pages_v_blocks_promo_banner_2" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_comparison_2_rows_order_idx" ON "_pages_v_blocks_comparison_2_rows" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparison_2_rows_parent_id_idx" ON "_pages_v_blocks_comparison_2_rows" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_2_rows_locale_idx" ON "_pages_v_blocks_comparison_2_rows" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_comparison_2_order_idx" ON "_pages_v_blocks_comparison_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparison_2_parent_id_idx" ON "_pages_v_blocks_comparison_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparison_2_path_idx" ON "_pages_v_blocks_comparison_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_comparison_2_locale_idx" ON "_pages_v_blocks_comparison_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_comparison_2_pick_idx" ON "_pages_v_blocks_comparison_2" USING btree ("pick_id");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_2_order_idx" ON "_pages_v_blocks_collection_spotlight_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_2_parent_id_idx" ON "_pages_v_blocks_collection_spotlight_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_2_path_idx" ON "_pages_v_blocks_collection_spotlight_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_2_locale_idx" ON "_pages_v_blocks_collection_spotlight_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_2_collection_idx" ON "_pages_v_blocks_collection_spotlight_2" USING btree ("collection_id");
  CREATE INDEX "_pages_v_blocks_collection_spotlight_2_media_idx" ON "_pages_v_blocks_collection_spotlight_2" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_recently_viewed_2_order_idx" ON "_pages_v_blocks_recently_viewed_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_recently_viewed_2_parent_id_idx" ON "_pages_v_blocks_recently_viewed_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_recently_viewed_2_path_idx" ON "_pages_v_blocks_recently_viewed_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_recently_viewed_2_locale_idx" ON "_pages_v_blocks_recently_viewed_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_newsletter_2_order_idx" ON "_pages_v_blocks_newsletter_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_newsletter_2_parent_id_idx" ON "_pages_v_blocks_newsletter_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_newsletter_2_path_idx" ON "_pages_v_blocks_newsletter_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_newsletter_2_locale_idx" ON "_pages_v_blocks_newsletter_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_newsletter_2_media_idx" ON "_pages_v_blocks_newsletter_2" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_newsletter_2_form_idx" ON "_pages_v_blocks_newsletter_2" USING btree ("form_id");
  CREATE INDEX "_pages_v_blocks_form_block_2_order_idx" ON "_pages_v_blocks_form_block_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_block_2_parent_id_idx" ON "_pages_v_blocks_form_block_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_block_2_path_idx" ON "_pages_v_blocks_form_block_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_block_2_locale_idx" ON "_pages_v_blocks_form_block_2" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_form_block_2_form_idx" ON "_pages_v_blocks_form_block_2" USING btree ("form_id");
  CREATE INDEX "_pages_v_blocks_editorial_list_2_order_idx" ON "_pages_v_blocks_editorial_list_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_editorial_list_2_parent_id_idx" ON "_pages_v_blocks_editorial_list_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_editorial_list_2_path_idx" ON "_pages_v_blocks_editorial_list_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_editorial_list_2_locale_idx" ON "_pages_v_blocks_editorial_list_2" USING btree ("_locale");
  CREATE INDEX "pages_rels_locale_idx" ON "pages_rels" USING btree ("locale");
  CREATE INDEX "_pages_v_rels_locale_idx" ON "_pages_v_rels" USING btree ("locale");
  CREATE INDEX "pages_rels_categories_id_idx" ON "pages_rels" USING btree ("categories_id","locale");
  CREATE INDEX "pages_rels_collections_id_idx" ON "pages_rels" USING btree ("collections_id","locale");
  CREATE INDEX "pages_rels_products_id_idx" ON "pages_rels" USING btree ("products_id","locale");
  CREATE INDEX "pages_rels_posts_id_idx" ON "pages_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_pages_v_rels_categories_id_idx" ON "_pages_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_pages_v_rels_collections_id_idx" ON "_pages_v_rels" USING btree ("collections_id","locale");
  CREATE INDEX "_pages_v_rels_products_id_idx" ON "_pages_v_rels" USING btree ("products_id","locale");
  CREATE INDEX "_pages_v_rels_posts_id_idx" ON "_pages_v_rels" USING btree ("posts_id","locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_rich_text_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_media_with_text_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_media_with_text_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_usp_bar_2_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_usp_bar_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_logo_cloud_2_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_logo_cloud_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_2_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_testimonials_2_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_testimonials_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_video_2_captions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_video_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_spacer_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_2_collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_category_showcase_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_category_showcase_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_product_collection_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_product_collection_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_featured_product_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_bundle_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_promo_banner_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_promo_banner_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_comparison_2_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_comparison_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_collection_spotlight_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_recently_viewed_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_newsletter_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_form_block_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_editorial_list_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_rich_text_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_media_with_text_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_media_with_text_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_usp_bar_2_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_usp_bar_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_logo_cloud_2_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_logo_cloud_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_2_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_testimonials_2_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_testimonials_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_video_2_captions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_video_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_spacer_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_2_collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_category_showcase_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_category_showcase_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_product_collection_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_product_collection_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_featured_product_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_bundle_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_promo_banner_2_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_promo_banner_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_comparison_2_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_comparison_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_recently_viewed_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_newsletter_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_form_block_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_editorial_list_2" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_rich_text_2" CASCADE;
  DROP TABLE "pages_blocks_media_with_text_2_links" CASCADE;
  DROP TABLE "pages_blocks_media_with_text_2" CASCADE;
  DROP TABLE "pages_blocks_usp_bar_2_items" CASCADE;
  DROP TABLE "pages_blocks_usp_bar_2" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud_2_logos" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud_2" CASCADE;
  DROP TABLE "pages_blocks_faq_2_items" CASCADE;
  DROP TABLE "pages_blocks_faq_2" CASCADE;
  DROP TABLE "pages_blocks_testimonials_2_quotes" CASCADE;
  DROP TABLE "pages_blocks_testimonials_2" CASCADE;
  DROP TABLE "pages_blocks_video_2_captions" CASCADE;
  DROP TABLE "pages_blocks_video_2" CASCADE;
  DROP TABLE "pages_blocks_spacer_2" CASCADE;
  DROP TABLE "pages_blocks_hero_2_collections" CASCADE;
  DROP TABLE "pages_blocks_hero_2_links" CASCADE;
  DROP TABLE "pages_blocks_hero_2" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_2_links" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_2_cs_items" CASCADE;
  DROP TABLE "pages_blocks_category_showcase_2" CASCADE;
  DROP TABLE "pages_blocks_product_collection_2_links" CASCADE;
  DROP TABLE "pages_blocks_product_collection_2" CASCADE;
  DROP TABLE "pages_blocks_featured_product_2" CASCADE;
  DROP TABLE "pages_blocks_bundle_2" CASCADE;
  DROP TABLE "pages_blocks_promo_banner_2_links" CASCADE;
  DROP TABLE "pages_blocks_promo_banner_2" CASCADE;
  DROP TABLE "pages_blocks_comparison_2_rows" CASCADE;
  DROP TABLE "pages_blocks_comparison_2" CASCADE;
  DROP TABLE "pages_blocks_collection_spotlight_2" CASCADE;
  DROP TABLE "pages_blocks_recently_viewed_2" CASCADE;
  DROP TABLE "pages_blocks_newsletter_2" CASCADE;
  DROP TABLE "pages_blocks_form_block_2" CASCADE;
  DROP TABLE "pages_blocks_editorial_list_2" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text_2" CASCADE;
  DROP TABLE "_pages_v_blocks_media_with_text_2_links" CASCADE;
  DROP TABLE "_pages_v_blocks_media_with_text_2" CASCADE;
  DROP TABLE "_pages_v_blocks_usp_bar_2_items" CASCADE;
  DROP TABLE "_pages_v_blocks_usp_bar_2" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud_2_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud_2" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_2_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_2" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials_2_quotes" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials_2" CASCADE;
  DROP TABLE "_pages_v_blocks_video_2_captions" CASCADE;
  DROP TABLE "_pages_v_blocks_video_2" CASCADE;
  DROP TABLE "_pages_v_blocks_spacer_2" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_2_collections" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_2_links" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_2" CASCADE;
  DROP TABLE "_pages_v_blocks_category_showcase_2_links" CASCADE;
  DROP TABLE "_pages_blocks_category_showcase_2_cs_items_v" CASCADE;
  DROP TABLE "_pages_v_blocks_category_showcase_2" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection_2_links" CASCADE;
  DROP TABLE "_pages_v_blocks_product_collection_2" CASCADE;
  DROP TABLE "_pages_v_blocks_featured_product_2" CASCADE;
  DROP TABLE "_pages_v_blocks_bundle_2" CASCADE;
  DROP TABLE "_pages_v_blocks_promo_banner_2_links" CASCADE;
  DROP TABLE "_pages_v_blocks_promo_banner_2" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison_2_rows" CASCADE;
  DROP TABLE "_pages_v_blocks_comparison_2" CASCADE;
  DROP TABLE "_pages_v_blocks_collection_spotlight_2" CASCADE;
  DROP TABLE "_pages_v_blocks_recently_viewed_2" CASCADE;
  DROP TABLE "_pages_v_blocks_newsletter_2" CASCADE;
  DROP TABLE "_pages_v_blocks_form_block_2" CASCADE;
  DROP TABLE "_pages_v_blocks_editorial_list_2" CASCADE;
  DROP INDEX "pages_rels_locale_idx";
  DROP INDEX "_pages_v_rels_locale_idx";
  DROP INDEX "pages_rels_categories_id_idx";
  DROP INDEX "pages_rels_collections_id_idx";
  DROP INDEX "pages_rels_products_id_idx";
  DROP INDEX "pages_rels_posts_id_idx";
  DROP INDEX "_pages_v_rels_categories_id_idx";
  DROP INDEX "_pages_v_rels_collections_id_idx";
  DROP INDEX "_pages_v_rels_products_id_idx";
  DROP INDEX "_pages_v_rels_posts_id_idx";
  CREATE INDEX "pages_rels_categories_id_idx" ON "pages_rels" USING btree ("categories_id");
  CREATE INDEX "pages_rels_collections_id_idx" ON "pages_rels" USING btree ("collections_id");
  CREATE INDEX "pages_rels_products_id_idx" ON "pages_rels" USING btree ("products_id");
  CREATE INDEX "pages_rels_posts_id_idx" ON "pages_rels" USING btree ("posts_id");
  CREATE INDEX "_pages_v_rels_categories_id_idx" ON "_pages_v_rels" USING btree ("categories_id");
  CREATE INDEX "_pages_v_rels_collections_id_idx" ON "_pages_v_rels" USING btree ("collections_id");
  CREATE INDEX "_pages_v_rels_products_id_idx" ON "_pages_v_rels" USING btree ("products_id");
  CREATE INDEX "_pages_v_rels_posts_id_idx" ON "_pages_v_rels" USING btree ("posts_id");
  ALTER TABLE "pages" DROP COLUMN "layout_per_language";
  ALTER TABLE "pages_rels" DROP COLUMN "locale";
  ALTER TABLE "_pages_v" DROP COLUMN "version_layout_per_language";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "locale";
  DROP TYPE "public"."enum_pages_blocks_rich_text_2_variant";
  DROP TYPE "public"."enum_pages_blocks_rich_text_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_rich_text_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_rich_text_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_rich_text_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_variant";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_image_side";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_media_with_text_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_2_items_icon";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_2_variant";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_usp_bar_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_2_variant";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_faq_2_variant";
  DROP TYPE "public"."enum_pages_blocks_faq_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_faq_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_faq_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_faq_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_testimonials_2_variant";
  DROP TYPE "public"."enum_pages_blocks_testimonials_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_testimonials_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_testimonials_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_testimonials_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_video_2_captions_language";
  DROP TYPE "public"."enum_pages_blocks_video_2_variant";
  DROP TYPE "public"."enum_pages_blocks_video_2_source";
  DROP TYPE "public"."enum_pages_blocks_video_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_video_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_video_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_video_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_spacer_2_variant";
  DROP TYPE "public"."enum_pages_blocks_spacer_2_size";
  DROP TYPE "public"."enum_pages_blocks_spacer_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_spacer_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_spacer_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_spacer_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_hero_2_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_hero_2_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_hero_2_variant";
  DROP TYPE "public"."enum_pages_blocks_hero_2_ps_mode";
  DROP TYPE "public"."enum_pages_blocks_hero_2_ps_sort";
  DROP TYPE "public"."enum_pages_blocks_hero_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_hero_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_hero_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_hero_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_variant";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_cs_mode";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_category_showcase_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_variant";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_display";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_ps_mode";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_ps_sort";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_ps_empty";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_product_collection_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_featured_product_2_variant";
  DROP TYPE "public"."enum_pages_blocks_featured_product_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_featured_product_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_featured_product_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_featured_product_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_bundle_2_variant";
  DROP TYPE "public"."enum_pages_blocks_bundle_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_bundle_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_bundle_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_bundle_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_2_links_link_type";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_2_links_link_appearance";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_2_variant";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_promo_banner_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_comparison_2_variant";
  DROP TYPE "public"."enum_pages_blocks_comparison_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_comparison_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_comparison_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_comparison_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_2_variant";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_2_sort";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_collection_spotlight_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_2_variant";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_recently_viewed_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_newsletter_2_variant";
  DROP TYPE "public"."enum_pages_blocks_newsletter_2_privacy_type";
  DROP TYPE "public"."enum_pages_blocks_newsletter_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_newsletter_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_newsletter_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_newsletter_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_form_block_2_variant";
  DROP TYPE "public"."enum_pages_blocks_form_block_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_form_block_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_form_block_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_form_block_2_ss_visibility";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_2_variant";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_2_source";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_2_ss_spacing";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_2_ss_surface";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_2_ss_container";
  DROP TYPE "public"."enum_pages_blocks_editorial_list_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_image_side";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_media_with_text_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_2_items_icon";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_usp_bar_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_faq_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_faq_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_faq_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_faq_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_faq_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_testimonials_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_video_2_captions_language";
  DROP TYPE "public"."enum__pages_v_blocks_video_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_video_2_source";
  DROP TYPE "public"."enum__pages_v_blocks_video_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_video_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_video_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_video_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_2_size";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_ps_mode";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_ps_sort";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_hero_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_cs_mode";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_category_showcase_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_display";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_ps_mode";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_ps_sort";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_ps_empty";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_product_collection_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_featured_product_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_bundle_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_2_links_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_2_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_promo_banner_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_comparison_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_sort";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_collection_spotlight_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_recently_viewed_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_newsletter_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_newsletter_2_privacy_type";
  DROP TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_newsletter_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_form_block_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_form_block_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_form_block_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_form_block_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_form_block_2_ss_visibility";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_2_variant";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_2_source";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_spacing";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_surface";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_container";
  DROP TYPE "public"."enum__pages_v_blocks_editorial_list_2_ss_visibility";`)
}
