import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_blocks_rich_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_products_blocks_rich_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_rich_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_rich_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_rich_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_variant" AS ENUM('standard', 'overlap', 'full-bleed');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_media_with_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_usp_bar_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum_products_blocks_usp_bar_variant" AS ENUM('standard', 'strip');
  CREATE TYPE "public"."enum_products_blocks_usp_bar_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_usp_bar_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_usp_bar_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_usp_bar_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_logo_cloud_variant" AS ENUM('standard', 'grid');
  CREATE TYPE "public"."enum_products_blocks_logo_cloud_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_logo_cloud_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_logo_cloud_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_logo_cloud_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_faq_variant" AS ENUM('standard', 'side-heading');
  CREATE TYPE "public"."enum_products_blocks_faq_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_faq_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_faq_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_faq_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_testimonials_variant" AS ENUM('standard', 'single', 'carousel', 'wall');
  CREATE TYPE "public"."enum_products_blocks_testimonials_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_testimonials_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_testimonials_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_testimonials_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_video_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_products_blocks_video_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_products_blocks_video_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum_products_blocks_video_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_video_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_video_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_video_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_spacer_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_products_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_spacer_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_spacer_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_spacer_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_spacer_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_variant" AS ENUM('standard', 'circles', 'bento', 'carousel', 'list', 'banner');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_category_showcase_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_product_collection_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_products_blocks_product_collection_links_link_appearance" AS ENUM('text');
  CREATE TYPE "public"."enum_products_blocks_product_collection_tabs_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_products_blocks_product_collection_tabs_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_products_blocks_product_collection_variant" AS ENUM('standard', 'featured-first', 'editorial', 'tabs', 'ranked', 'with-banner', 'compact', 'lookbook');
  CREATE TYPE "public"."enum_products_blocks_product_collection_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum_products_blocks_product_collection_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_products_blocks_product_collection_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_products_blocks_product_collection_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum_products_blocks_product_collection_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_product_collection_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_product_collection_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_product_collection_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_featured_product_variant" AS ENUM('standard', 'overlay', 'gallery');
  CREATE TYPE "public"."enum_products_blocks_featured_product_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_featured_product_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_featured_product_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_featured_product_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_bundle_variant" AS ENUM('standard', 'list');
  CREATE TYPE "public"."enum_products_blocks_bundle_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_bundle_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_bundle_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_bundle_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_promo_banner_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_products_blocks_promo_banner_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_products_blocks_promo_banner_variant" AS ENUM('standard', 'strip', 'ticket', 'full-bleed', 'countdown', 'popup');
  CREATE TYPE "public"."enum_products_blocks_promo_banner_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_promo_banner_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_promo_banner_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_promo_banner_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_comparison_variant" AS ENUM('standard', 'cards', 'highlight');
  CREATE TYPE "public"."enum_products_blocks_comparison_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_comparison_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_comparison_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_comparison_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_collection_spotlight_variant" AS ENUM('standard', 'stacked');
  CREATE TYPE "public"."enum_products_blocks_collection_spotlight_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_products_blocks_collection_spotlight_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_collection_spotlight_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_collection_spotlight_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_collection_spotlight_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_newsletter_variant" AS ENUM('standard', 'split');
  CREATE TYPE "public"."enum_products_blocks_newsletter_privacy_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_products_blocks_newsletter_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_newsletter_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_newsletter_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_newsletter_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_blocks_form_block_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_products_blocks_form_block_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_products_blocks_form_block_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_products_blocks_form_block_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_products_blocks_form_block_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_products_sections_mode" AS ENUM('default', 'own', 'none');
  CREATE TYPE "public"."enum_categories_blocks_rich_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_categories_blocks_rich_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_rich_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_rich_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_rich_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_variant" AS ENUM('standard', 'overlap', 'full-bleed');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_media_with_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_usp_bar_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum_categories_blocks_usp_bar_variant" AS ENUM('standard', 'strip');
  CREATE TYPE "public"."enum_categories_blocks_usp_bar_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_usp_bar_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_usp_bar_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_usp_bar_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_logo_cloud_variant" AS ENUM('standard', 'grid');
  CREATE TYPE "public"."enum_categories_blocks_logo_cloud_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_logo_cloud_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_logo_cloud_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_logo_cloud_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_faq_variant" AS ENUM('standard', 'side-heading');
  CREATE TYPE "public"."enum_categories_blocks_faq_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_faq_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_faq_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_faq_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_testimonials_variant" AS ENUM('standard', 'single', 'carousel', 'wall');
  CREATE TYPE "public"."enum_categories_blocks_testimonials_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_testimonials_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_testimonials_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_testimonials_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_video_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_categories_blocks_video_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_categories_blocks_video_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum_categories_blocks_video_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_video_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_video_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_video_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_spacer_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_categories_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_spacer_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_spacer_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_spacer_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_spacer_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_variant" AS ENUM('standard', 'circles', 'bento', 'carousel', 'list', 'banner');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_category_showcase_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_links_link_appearance" AS ENUM('text');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_tabs_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_tabs_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_variant" AS ENUM('standard', 'featured-first', 'editorial', 'tabs', 'ranked', 'with-banner', 'compact', 'lookbook');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_product_collection_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_featured_product_variant" AS ENUM('standard', 'overlay', 'gallery');
  CREATE TYPE "public"."enum_categories_blocks_featured_product_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_featured_product_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_featured_product_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_featured_product_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_bundle_variant" AS ENUM('standard', 'list');
  CREATE TYPE "public"."enum_categories_blocks_bundle_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_bundle_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_bundle_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_bundle_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_promo_banner_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_categories_blocks_promo_banner_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_categories_blocks_promo_banner_variant" AS ENUM('standard', 'strip', 'ticket', 'full-bleed', 'countdown', 'popup');
  CREATE TYPE "public"."enum_categories_blocks_promo_banner_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_promo_banner_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_promo_banner_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_promo_banner_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_comparison_variant" AS ENUM('standard', 'cards', 'highlight');
  CREATE TYPE "public"."enum_categories_blocks_comparison_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_comparison_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_comparison_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_comparison_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_collection_spotlight_variant" AS ENUM('standard', 'stacked');
  CREATE TYPE "public"."enum_categories_blocks_collection_spotlight_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_categories_blocks_collection_spotlight_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_collection_spotlight_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_collection_spotlight_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_collection_spotlight_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_newsletter_variant" AS ENUM('standard', 'split');
  CREATE TYPE "public"."enum_categories_blocks_newsletter_privacy_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_categories_blocks_newsletter_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_newsletter_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_newsletter_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_newsletter_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_blocks_form_block_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_categories_blocks_form_block_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_categories_blocks_form_block_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_categories_blocks_form_block_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_categories_blocks_form_block_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_categories_sections_mode" AS ENUM('default', 'own', 'none');
  CREATE TYPE "public"."enum_collections_blocks_rich_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_collections_blocks_rich_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_rich_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_rich_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_rich_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_variant" AS ENUM('standard', 'overlap', 'full-bleed');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_media_with_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_usp_bar_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum_collections_blocks_usp_bar_variant" AS ENUM('standard', 'strip');
  CREATE TYPE "public"."enum_collections_blocks_usp_bar_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_usp_bar_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_usp_bar_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_usp_bar_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_logo_cloud_variant" AS ENUM('standard', 'grid');
  CREATE TYPE "public"."enum_collections_blocks_logo_cloud_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_logo_cloud_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_logo_cloud_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_logo_cloud_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_faq_variant" AS ENUM('standard', 'side-heading');
  CREATE TYPE "public"."enum_collections_blocks_faq_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_faq_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_faq_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_faq_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_testimonials_variant" AS ENUM('standard', 'single', 'carousel', 'wall');
  CREATE TYPE "public"."enum_collections_blocks_testimonials_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_testimonials_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_testimonials_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_testimonials_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_video_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_collections_blocks_video_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_collections_blocks_video_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum_collections_blocks_video_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_video_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_video_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_video_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_spacer_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_collections_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_spacer_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_spacer_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_spacer_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_spacer_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_variant" AS ENUM('standard', 'circles', 'bento', 'carousel', 'list', 'banner');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_category_showcase_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_links_link_look" AS ENUM('text');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_tabs_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_tabs_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_variant" AS ENUM('standard', 'featured-first', 'editorial', 'tabs', 'ranked', 'with-banner', 'compact', 'lookbook');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_product_collection_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_featured_product_variant" AS ENUM('standard', 'overlay', 'gallery');
  CREATE TYPE "public"."enum_collections_blocks_featured_product_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_featured_product_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_featured_product_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_featured_product_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_bundle_variant" AS ENUM('standard', 'list');
  CREATE TYPE "public"."enum_collections_blocks_bundle_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_bundle_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_bundle_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_bundle_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_promo_banner_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_collections_blocks_promo_banner_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_collections_blocks_promo_banner_variant" AS ENUM('standard', 'strip', 'ticket', 'full-bleed', 'countdown', 'popup');
  CREATE TYPE "public"."enum_collections_blocks_promo_banner_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_promo_banner_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_promo_banner_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_promo_banner_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_comparison_variant" AS ENUM('standard', 'cards', 'highlight');
  CREATE TYPE "public"."enum_collections_blocks_comparison_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_comparison_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_comparison_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_comparison_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_collection_spotlight_variant" AS ENUM('standard', 'stacked');
  CREATE TYPE "public"."enum_collections_blocks_collection_spotlight_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_collections_blocks_collection_spotlight_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_collection_spotlight_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_collection_spotlight_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_collection_spotlight_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_newsletter_variant" AS ENUM('standard', 'split');
  CREATE TYPE "public"."enum_collections_blocks_newsletter_privacy_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_collections_blocks_newsletter_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_newsletter_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_newsletter_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_newsletter_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_blocks_form_block_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_collections_blocks_form_block_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_collections_blocks_form_block_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_collections_blocks_form_block_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_collections_blocks_form_block_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_collections_sections_mode" AS ENUM('default', 'own', 'none');
  CREATE TYPE "public"."enum_templates_blocks_rich_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_templates_blocks_rich_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_rich_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_rich_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_rich_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_variant" AS ENUM('standard', 'overlap', 'full-bleed');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_media_with_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_usp_bar_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum_templates_blocks_usp_bar_variant" AS ENUM('standard', 'strip');
  CREATE TYPE "public"."enum_templates_blocks_usp_bar_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_usp_bar_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_usp_bar_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_usp_bar_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_logo_cloud_variant" AS ENUM('standard', 'grid');
  CREATE TYPE "public"."enum_templates_blocks_logo_cloud_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_logo_cloud_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_logo_cloud_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_logo_cloud_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_faq_variant" AS ENUM('standard', 'side-heading');
  CREATE TYPE "public"."enum_templates_blocks_faq_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_faq_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_faq_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_faq_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_testimonials_variant" AS ENUM('standard', 'single', 'carousel', 'wall');
  CREATE TYPE "public"."enum_templates_blocks_testimonials_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_testimonials_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_testimonials_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_testimonials_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_video_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum_templates_blocks_video_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_templates_blocks_video_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum_templates_blocks_video_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_video_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_video_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_video_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_spacer_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_templates_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_spacer_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_spacer_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_spacer_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_spacer_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_links_link_appearance" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_variant" AS ENUM('standard', 'circles', 'bento', 'carousel', 'list', 'banner');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_category_showcase_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_links_link_appearance" AS ENUM('text');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_tabs_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_tabs_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_variant" AS ENUM('standard', 'featured-first', 'editorial', 'tabs', 'ranked', 'with-banner', 'compact', 'lookbook');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_product_collection_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_featured_product_variant" AS ENUM('standard', 'overlay', 'gallery');
  CREATE TYPE "public"."enum_templates_blocks_featured_product_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_featured_product_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_featured_product_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_featured_product_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_bundle_variant" AS ENUM('standard', 'list');
  CREATE TYPE "public"."enum_templates_blocks_bundle_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_bundle_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_bundle_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_bundle_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_promo_banner_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_templates_blocks_promo_banner_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum_templates_blocks_promo_banner_variant" AS ENUM('standard', 'strip', 'ticket', 'full-bleed', 'countdown', 'popup');
  CREATE TYPE "public"."enum_templates_blocks_promo_banner_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_promo_banner_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_promo_banner_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_promo_banner_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_comparison_variant" AS ENUM('standard', 'cards', 'highlight');
  CREATE TYPE "public"."enum_templates_blocks_comparison_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_comparison_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_comparison_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_comparison_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_collection_spotlight_variant" AS ENUM('standard', 'stacked');
  CREATE TYPE "public"."enum_templates_blocks_collection_spotlight_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum_templates_blocks_collection_spotlight_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_collection_spotlight_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_collection_spotlight_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_collection_spotlight_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_newsletter_variant" AS ENUM('standard', 'split');
  CREATE TYPE "public"."enum_templates_blocks_newsletter_privacy_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_templates_blocks_newsletter_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_newsletter_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_newsletter_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_newsletter_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum_templates_blocks_form_block_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum_templates_blocks_form_block_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum_templates_blocks_form_block_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum_templates_blocks_form_block_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum_templates_blocks_form_block_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_rich_text_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__templates_v_blocks_rich_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_rich_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_rich_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_rich_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_variant" AS ENUM('standard', 'overlap', 'full-bleed');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_image_side" AS ENUM('start', 'end');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_media_with_text_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_usp_bar_items_icon" AS ENUM('delivery', 'returns', 'secure', 'support', 'sustainable', 'gift', 'quality', 'fast');
  CREATE TYPE "public"."enum__templates_v_blocks_usp_bar_variant" AS ENUM('standard', 'strip');
  CREATE TYPE "public"."enum__templates_v_blocks_usp_bar_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_usp_bar_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_usp_bar_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_usp_bar_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_logo_cloud_variant" AS ENUM('standard', 'grid');
  CREATE TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_faq_variant" AS ENUM('standard', 'side-heading');
  CREATE TYPE "public"."enum__templates_v_blocks_faq_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_faq_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_faq_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_faq_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_testimonials_variant" AS ENUM('standard', 'single', 'carousel', 'wall');
  CREATE TYPE "public"."enum__templates_v_blocks_testimonials_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_testimonials_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_testimonials_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_testimonials_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_video_captions_language" AS ENUM('en', 'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'nb', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl', 'zh', 'ja', 'ko', 'ka', 'mn');
  CREATE TYPE "public"."enum__templates_v_blocks_video_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__templates_v_blocks_video_source" AS ENUM('embed', 'upload');
  CREATE TYPE "public"."enum__templates_v_blocks_video_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_video_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_video_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_video_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_spacer_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__templates_v_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_spacer_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_spacer_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_spacer_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_spacer_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_links_link_look" AS ENUM('text', 'default', 'outline');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_variant" AS ENUM('standard', 'circles', 'bento', 'carousel', 'list', 'banner');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_cs_mode" AS ENUM('topLevel', 'childrenOf', 'handpicked');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_category_showcase_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_links_link_look" AS ENUM('text');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_tabs_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_tabs_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_variant" AS ENUM('standard', 'featured-first', 'editorial', 'tabs', 'ranked', 'with-banner', 'compact', 'lookbook');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_display" AS ENUM('carousel', 'grid');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_ps_mode" AS ENUM('collection', 'category', 'handpicked', 'newest', 'onSale', 'tag', 'type');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_ps_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_ps_empty" AS ENUM('hide', 'message', 'newest');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_product_collection_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_featured_product_variant" AS ENUM('standard', 'overlay', 'gallery');
  CREATE TYPE "public"."enum__templates_v_blocks_featured_product_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_featured_product_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_featured_product_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_featured_product_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_bundle_variant" AS ENUM('standard', 'list');
  CREATE TYPE "public"."enum__templates_v_blocks_bundle_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_bundle_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_bundle_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_bundle_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_promo_banner_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__templates_v_blocks_promo_banner_links_link_appearance" AS ENUM('default', 'outline', 'text');
  CREATE TYPE "public"."enum__templates_v_blocks_promo_banner_variant" AS ENUM('standard', 'strip', 'ticket', 'full-bleed', 'countdown', 'popup');
  CREATE TYPE "public"."enum__templates_v_blocks_promo_banner_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_promo_banner_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_promo_banner_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_promo_banner_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_comparison_variant" AS ENUM('standard', 'cards', 'highlight');
  CREATE TYPE "public"."enum__templates_v_blocks_comparison_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_comparison_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_comparison_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_comparison_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_collection_spotlight_variant" AS ENUM('standard', 'stacked');
  CREATE TYPE "public"."enum__templates_v_blocks_collection_spotlight_sort" AS ENUM('newest', 'priceAsc', 'priceDesc', 'title');
  CREATE TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_newsletter_variant" AS ENUM('standard', 'split');
  CREATE TYPE "public"."enum__templates_v_blocks_newsletter_privacy_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__templates_v_blocks_newsletter_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_newsletter_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_newsletter_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_newsletter_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TYPE "public"."enum__templates_v_blocks_form_block_variant" AS ENUM('standard');
  CREATE TYPE "public"."enum__templates_v_blocks_form_block_ss_spacing" AS ENUM('none', 'small', 'medium', 'large');
  CREATE TYPE "public"."enum__templates_v_blocks_form_block_ss_surface" AS ENUM('default', 'muted', 'inverse');
  CREATE TYPE "public"."enum__templates_v_blocks_form_block_ss_container" AS ENUM('narrow', 'default', 'wide', 'full');
  CREATE TYPE "public"."enum__templates_v_blocks_form_block_ss_visibility" AS ENUM('all', 'mobile', 'desktop');
  CREATE TABLE "products_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_rich_text_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_rich_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_rich_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_rich_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_rich_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_media_with_text_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_products_blocks_media_with_text_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_products_blocks_media_with_text_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "products_blocks_media_with_text_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_media_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_media_with_text_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum_products_blocks_media_with_text_image_side" DEFAULT 'end',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_media_with_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_media_with_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_media_with_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_media_with_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_media_with_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_usp_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_products_blocks_usp_bar_items_icon"
  );
  
  CREATE TABLE "products_blocks_usp_bar_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_usp_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_usp_bar_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_usp_bar_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_usp_bar_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_usp_bar_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_usp_bar_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "products_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_logo_cloud_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_logo_cloud_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_logo_cloud_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_logo_cloud_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_logo_cloud_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_faq_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_faq_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_faq_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_faq_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_products_blocks_faq_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"rating" numeric,
  	"avatar_id" integer
  );
  
  CREATE TABLE "products_blocks_testimonials_quotes_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_testimonials_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_testimonials_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_testimonials_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_testimonials_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_testimonials_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_video_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_products_blocks_video_captions_language",
  	"file_id" integer
  );
  
  CREATE TABLE "products_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_video_variant" DEFAULT 'standard',
  	"source" "enum_products_blocks_video_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_video_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_video_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_video_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_video_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_video_locales" (
  	"heading" varchar,
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_spacer_variant" DEFAULT 'standard',
  	"size" "enum_products_blocks_spacer_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_spacer_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_spacer_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_spacer_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_spacer_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_category_showcase_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_products_blocks_category_showcase_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_products_blocks_category_showcase_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "products_blocks_category_showcase_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_category_showcase_cs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer
  );
  
  CREATE TABLE "products_blocks_category_showcase_cs_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_category_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_category_showcase_variant" DEFAULT 'standard',
  	"category_source_mode" "enum_products_blocks_category_showcase_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_category_showcase_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_category_showcase_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_category_showcase_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_category_showcase_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_category_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_product_collection_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_products_blocks_product_collection_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_products_blocks_product_collection_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "products_blocks_product_collection_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_product_collection_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_source_mode" "enum_products_blocks_product_collection_tabs_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_products_blocks_product_collection_tabs_ps_sort" DEFAULT 'newest'
  );
  
  CREATE TABLE "products_blocks_product_collection_tabs_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_product_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_product_collection_variant" DEFAULT 'standard',
  	"display" "enum_products_blocks_product_collection_display" DEFAULT 'carousel',
  	"media_id" integer,
  	"product_source_mode" "enum_products_blocks_product_collection_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_products_blocks_product_collection_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum_products_blocks_product_collection_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_product_collection_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_product_collection_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_product_collection_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_product_collection_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_product_collection_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_featured_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_featured_product_variant" DEFAULT 'standard',
  	"product_id" integer,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_featured_product_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_featured_product_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_featured_product_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_featured_product_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_featured_product_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_bundle" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_bundle_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_bundle_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_bundle_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_bundle_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_bundle_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_bundle_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_promo_banner_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_products_blocks_promo_banner_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_products_blocks_promo_banner_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "products_blocks_promo_banner_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_promo_banner_variant" DEFAULT 'standard',
  	"code" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_promo_banner_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_promo_banner_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_promo_banner_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_promo_banner_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_promo_banner_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"terms" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "products_blocks_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_comparison_variant" DEFAULT 'standard',
  	"pick_id" integer,
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_comparison_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_comparison_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_comparison_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_comparison_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_collection_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_collection_spotlight_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum_products_blocks_collection_spotlight_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_collection_spotlight_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_collection_spotlight_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_collection_spotlight_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_products_blocks_collection_spotlight_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_collection_spotlight_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_newsletter_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"form_id" integer,
  	"privacy_type" "enum_products_blocks_newsletter_privacy_type" DEFAULT 'reference',
  	"privacy_url" varchar,
  	"privacy_new_tab" boolean,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_newsletter_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_newsletter_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_newsletter_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_products_blocks_newsletter_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_newsletter_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_products_blocks_form_block_variant" DEFAULT 'standard',
  	"form_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_products_blocks_form_block_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_products_blocks_form_block_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_products_blocks_form_block_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_products_blocks_form_block_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_form_block_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_rich_text_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_rich_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_rich_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_rich_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_rich_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_media_with_text_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_categories_blocks_media_with_text_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_categories_blocks_media_with_text_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "categories_blocks_media_with_text_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_media_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_media_with_text_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum_categories_blocks_media_with_text_image_side" DEFAULT 'end',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_media_with_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_media_with_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_media_with_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_media_with_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_media_with_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_usp_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_categories_blocks_usp_bar_items_icon"
  );
  
  CREATE TABLE "categories_blocks_usp_bar_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_usp_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_usp_bar_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_usp_bar_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_usp_bar_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_usp_bar_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_usp_bar_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "categories_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_logo_cloud_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_logo_cloud_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_logo_cloud_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_logo_cloud_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_logo_cloud_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "categories_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_faq_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_faq_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_faq_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_faq_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_categories_blocks_faq_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"rating" numeric,
  	"avatar_id" integer
  );
  
  CREATE TABLE "categories_blocks_testimonials_quotes_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_testimonials_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_testimonials_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_testimonials_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_testimonials_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_testimonials_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_video_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_categories_blocks_video_captions_language",
  	"file_id" integer
  );
  
  CREATE TABLE "categories_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_video_variant" DEFAULT 'standard',
  	"source" "enum_categories_blocks_video_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_video_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_video_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_video_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_video_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_video_locales" (
  	"heading" varchar,
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_spacer_variant" DEFAULT 'standard',
  	"size" "enum_categories_blocks_spacer_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_spacer_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_spacer_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_spacer_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_spacer_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_category_showcase_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_categories_blocks_category_showcase_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_categories_blocks_category_showcase_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "categories_blocks_category_showcase_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_category_showcase_cs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer
  );
  
  CREATE TABLE "categories_blocks_category_showcase_cs_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_category_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_category_showcase_variant" DEFAULT 'standard',
  	"category_source_mode" "enum_categories_blocks_category_showcase_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_category_showcase_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_category_showcase_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_category_showcase_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_category_showcase_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_category_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_product_collection_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_categories_blocks_product_collection_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_categories_blocks_product_collection_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "categories_blocks_product_collection_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_product_collection_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_source_mode" "enum_categories_blocks_product_collection_tabs_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_categories_blocks_product_collection_tabs_ps_sort" DEFAULT 'newest'
  );
  
  CREATE TABLE "categories_blocks_product_collection_tabs_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_product_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_product_collection_variant" DEFAULT 'standard',
  	"display" "enum_categories_blocks_product_collection_display" DEFAULT 'carousel',
  	"media_id" integer,
  	"product_source_mode" "enum_categories_blocks_product_collection_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_categories_blocks_product_collection_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum_categories_blocks_product_collection_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_product_collection_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_product_collection_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_product_collection_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_product_collection_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_product_collection_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_featured_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_featured_product_variant" DEFAULT 'standard',
  	"product_id" integer,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_featured_product_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_featured_product_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_featured_product_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_featured_product_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_featured_product_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_bundle" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_bundle_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_bundle_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_bundle_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_bundle_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_bundle_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_bundle_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_promo_banner_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_categories_blocks_promo_banner_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_categories_blocks_promo_banner_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "categories_blocks_promo_banner_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_promo_banner_variant" DEFAULT 'standard',
  	"code" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_promo_banner_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_promo_banner_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_promo_banner_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_promo_banner_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_promo_banner_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"terms" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "categories_blocks_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_comparison_variant" DEFAULT 'standard',
  	"pick_id" integer,
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_comparison_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_comparison_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_comparison_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_comparison_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_collection_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_collection_spotlight_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum_categories_blocks_collection_spotlight_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_collection_spotlight_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_collection_spotlight_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_collection_spotlight_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_categories_blocks_collection_spotlight_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_collection_spotlight_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_newsletter_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"form_id" integer,
  	"privacy_type" "enum_categories_blocks_newsletter_privacy_type" DEFAULT 'reference',
  	"privacy_url" varchar,
  	"privacy_new_tab" boolean,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_newsletter_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_newsletter_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_newsletter_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_categories_blocks_newsletter_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_newsletter_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_categories_blocks_form_block_variant" DEFAULT 'standard',
  	"form_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_categories_blocks_form_block_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_categories_blocks_form_block_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_categories_blocks_form_block_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_categories_blocks_form_block_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "categories_blocks_form_block_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "categories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"collections_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "collections_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_rich_text_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_rich_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_rich_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_rich_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_rich_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_media_with_text_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_collections_blocks_media_with_text_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_collections_blocks_media_with_text_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "collections_blocks_media_with_text_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_media_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_media_with_text_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum_collections_blocks_media_with_text_image_side" DEFAULT 'end',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_media_with_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_media_with_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_media_with_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_media_with_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_media_with_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_usp_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_collections_blocks_usp_bar_items_icon"
  );
  
  CREATE TABLE "collections_blocks_usp_bar_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_usp_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_usp_bar_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_usp_bar_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_usp_bar_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_usp_bar_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_usp_bar_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "collections_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_logo_cloud_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_logo_cloud_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_logo_cloud_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_logo_cloud_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_logo_cloud_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "collections_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_faq_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_faq_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_faq_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_faq_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_collections_blocks_faq_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"rating" numeric,
  	"avatar_id" integer
  );
  
  CREATE TABLE "collections_blocks_testimonials_quotes_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_testimonials_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_testimonials_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_testimonials_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_testimonials_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_testimonials_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_video_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_collections_blocks_video_captions_language",
  	"file_id" integer
  );
  
  CREATE TABLE "collections_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_video_variant" DEFAULT 'standard',
  	"source" "enum_collections_blocks_video_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_video_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_video_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_video_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_video_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_video_locales" (
  	"heading" varchar,
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_spacer_variant" DEFAULT 'standard',
  	"size" "enum_collections_blocks_spacer_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_spacer_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_spacer_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_spacer_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_spacer_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_category_showcase_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_collections_blocks_category_showcase_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_collections_blocks_category_showcase_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "collections_blocks_category_showcase_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_category_showcase_cs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer
  );
  
  CREATE TABLE "collections_blocks_category_showcase_cs_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_category_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_category_showcase_variant" DEFAULT 'standard',
  	"category_source_mode" "enum_collections_blocks_category_showcase_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_category_showcase_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_category_showcase_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_category_showcase_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_category_showcase_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_category_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_product_collection_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_collections_blocks_product_collection_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_collections_blocks_product_collection_links_link_look" DEFAULT 'text'
  );
  
  CREATE TABLE "collections_blocks_product_collection_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_product_collection_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_source_mode" "enum_collections_blocks_product_collection_tabs_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_collections_blocks_product_collection_tabs_ps_sort" DEFAULT 'newest'
  );
  
  CREATE TABLE "collections_blocks_product_collection_tabs_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_product_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_product_collection_variant" DEFAULT 'standard',
  	"display" "enum_collections_blocks_product_collection_display" DEFAULT 'carousel',
  	"media_id" integer,
  	"product_source_mode" "enum_collections_blocks_product_collection_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_collections_blocks_product_collection_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum_collections_blocks_product_collection_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_product_collection_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_product_collection_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_product_collection_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_product_collection_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_product_collection_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_featured_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_featured_product_variant" DEFAULT 'standard',
  	"product_id" integer,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_featured_product_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_featured_product_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_featured_product_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_featured_product_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_featured_product_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_bundle" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_bundle_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_bundle_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_bundle_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_bundle_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_bundle_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_bundle_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_promo_banner_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_collections_blocks_promo_banner_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_collections_blocks_promo_banner_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "collections_blocks_promo_banner_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_promo_banner_variant" DEFAULT 'standard',
  	"code" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_promo_banner_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_promo_banner_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_promo_banner_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_promo_banner_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_promo_banner_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"terms" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "collections_blocks_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_comparison_variant" DEFAULT 'standard',
  	"pick_id" integer,
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_comparison_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_comparison_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_comparison_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_comparison_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_collection_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_collection_spotlight_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum_collections_blocks_collection_spotlight_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_collection_spotlight_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_collection_spotlight_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_collection_spotlight_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_collections_blocks_collection_spotlight_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_collection_spotlight_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_newsletter_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"form_id" integer,
  	"privacy_type" "enum_collections_blocks_newsletter_privacy_type" DEFAULT 'reference',
  	"privacy_url" varchar,
  	"privacy_new_tab" boolean,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_newsletter_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_newsletter_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_newsletter_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_collections_blocks_newsletter_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_newsletter_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_collections_blocks_form_block_variant" DEFAULT 'standard',
  	"form_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_collections_blocks_form_block_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_collections_blocks_form_block_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_collections_blocks_form_block_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_collections_blocks_form_block_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "collections_blocks_form_block_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "collections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"collections_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "templates_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_rich_text_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_rich_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_rich_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_rich_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_rich_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_media_with_text_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_templates_blocks_media_with_text_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_templates_blocks_media_with_text_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "templates_blocks_media_with_text_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_media_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_media_with_text_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum_templates_blocks_media_with_text_image_side" DEFAULT 'end',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_media_with_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_media_with_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_media_with_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_media_with_text_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_media_with_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_usp_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_templates_blocks_usp_bar_items_icon"
  );
  
  CREATE TABLE "templates_blocks_usp_bar_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_usp_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_usp_bar_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_usp_bar_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_usp_bar_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_usp_bar_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_usp_bar_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "templates_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_logo_cloud_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_logo_cloud_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_logo_cloud_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_logo_cloud_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_logo_cloud_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "templates_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_faq_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_faq_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_faq_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_faq_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_templates_blocks_faq_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"rating" numeric,
  	"avatar_id" integer
  );
  
  CREATE TABLE "templates_blocks_testimonials_quotes_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_testimonials_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_testimonials_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_testimonials_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_testimonials_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_testimonials_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_video_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" "enum_templates_blocks_video_captions_language",
  	"file_id" integer
  );
  
  CREATE TABLE "templates_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_video_variant" DEFAULT 'standard',
  	"source" "enum_templates_blocks_video_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_video_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_video_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_video_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_video_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_video_locales" (
  	"heading" varchar,
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_spacer_variant" DEFAULT 'standard',
  	"size" "enum_templates_blocks_spacer_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_spacer_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_spacer_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_spacer_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_spacer_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_category_showcase_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_templates_blocks_category_showcase_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_templates_blocks_category_showcase_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "templates_blocks_category_showcase_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_category_showcase_cs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer
  );
  
  CREATE TABLE "templates_blocks_category_showcase_cs_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_category_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_category_showcase_variant" DEFAULT 'standard',
  	"category_source_mode" "enum_templates_blocks_category_showcase_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_category_showcase_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_category_showcase_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_category_showcase_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_category_showcase_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_category_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_product_collection_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_templates_blocks_product_collection_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_templates_blocks_product_collection_links_link_appearance" DEFAULT 'text'
  );
  
  CREATE TABLE "templates_blocks_product_collection_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_product_collection_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_source_mode" "enum_templates_blocks_product_collection_tabs_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_templates_blocks_product_collection_tabs_ps_sort" DEFAULT 'newest'
  );
  
  CREATE TABLE "templates_blocks_product_collection_tabs_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_product_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_product_collection_variant" DEFAULT 'standard',
  	"display" "enum_templates_blocks_product_collection_display" DEFAULT 'carousel',
  	"media_id" integer,
  	"product_source_mode" "enum_templates_blocks_product_collection_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum_templates_blocks_product_collection_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum_templates_blocks_product_collection_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_product_collection_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_product_collection_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_product_collection_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_product_collection_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_product_collection_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_featured_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_featured_product_variant" DEFAULT 'standard',
  	"product_id" integer,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_featured_product_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_featured_product_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_featured_product_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_featured_product_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_featured_product_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_bundle" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_bundle_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_bundle_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_bundle_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_bundle_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_bundle_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_bundle_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_promo_banner_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_templates_blocks_promo_banner_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum_templates_blocks_promo_banner_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "templates_blocks_promo_banner_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_promo_banner_variant" DEFAULT 'standard',
  	"code" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_promo_banner_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_promo_banner_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_promo_banner_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_promo_banner_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_promo_banner_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"terms" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "templates_blocks_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_comparison_variant" DEFAULT 'standard',
  	"pick_id" integer,
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_comparison_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_comparison_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_comparison_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_comparison_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_collection_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_collection_spotlight_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum_templates_blocks_collection_spotlight_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_collection_spotlight_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_collection_spotlight_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_collection_spotlight_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum_templates_blocks_collection_spotlight_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_collection_spotlight_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_newsletter_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"form_id" integer,
  	"privacy_type" "enum_templates_blocks_newsletter_privacy_type" DEFAULT 'reference',
  	"privacy_url" varchar,
  	"privacy_new_tab" boolean,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_newsletter_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_newsletter_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_newsletter_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_templates_blocks_newsletter_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_newsletter_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "templates_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_templates_blocks_form_block_variant" DEFAULT 'standard',
  	"form_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum_templates_blocks_form_block_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum_templates_blocks_form_block_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum_templates_blocks_form_block_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum_templates_blocks_form_block_ss_visibility" DEFAULT 'all',
  	"block_name" varchar
  );
  
  CREATE TABLE "templates_blocks_form_block_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_rich_text_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_rich_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_rich_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_rich_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_rich_text_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_media_with_text_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__templates_v_blocks_media_with_text_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__templates_v_blocks_media_with_text_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_media_with_text_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_media_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_media_with_text_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"image_side" "enum__templates_v_blocks_media_with_text_image_side" DEFAULT 'end',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_media_with_text_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_media_with_text_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_media_with_text_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_media_with_text_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_media_with_text_locales" (
  	"heading" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_usp_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__templates_v_blocks_usp_bar_items_icon",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_usp_bar_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_usp_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_usp_bar_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_usp_bar_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_usp_bar_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_usp_bar_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_usp_bar_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_logo_cloud_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_logo_cloud_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_logo_cloud_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_logo_cloud_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_logo_cloud_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_faq_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_faq_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_faq_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_faq_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum__templates_v_blocks_faq_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_testimonials_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"rating" numeric,
  	"avatar_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_testimonials_quotes_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_testimonials_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_testimonials_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_testimonials_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_testimonials_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_testimonials_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_video_captions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"language" "enum__templates_v_blocks_video_captions_language",
  	"file_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_video_variant" DEFAULT 'standard',
  	"source" "enum__templates_v_blocks_video_source" DEFAULT 'embed',
  	"url" varchar,
  	"file_id" integer,
  	"poster_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_video_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_video_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_video_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_video_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_video_locales" (
  	"heading" varchar,
  	"title" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_spacer_variant" DEFAULT 'standard',
  	"size" "enum__templates_v_blocks_spacer_size" DEFAULT 'medium',
  	"divider" boolean DEFAULT false,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_spacer_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_spacer_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_spacer_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_spacer_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_category_showcase_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__templates_v_blocks_category_showcase_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__templates_v_blocks_category_showcase_links_link_look" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_category_showcase_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_blocks_category_showcase_cs_items_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_blocks_category_showcase_cs_items_v_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_category_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_category_showcase_variant" DEFAULT 'standard',
  	"category_source_mode" "enum__templates_v_blocks_category_showcase_cs_mode" DEFAULT 'topLevel',
  	"category_source_parent_id" integer,
  	"category_source_limit" numeric DEFAULT 8,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_category_showcase_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_category_showcase_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_category_showcase_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_category_showcase_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_category_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_product_collection_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__templates_v_blocks_product_collection_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__templates_v_blocks_product_collection_links_link_look" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_product_collection_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_product_collection_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_source_mode" "enum__templates_v_blocks_product_collection_tabs_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum__templates_v_blocks_product_collection_tabs_ps_sort" DEFAULT 'newest',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_product_collection_tabs_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_product_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_product_collection_variant" DEFAULT 'standard',
  	"display" "enum__templates_v_blocks_product_collection_display" DEFAULT 'carousel',
  	"media_id" integer,
  	"product_source_mode" "enum__templates_v_blocks_product_collection_ps_mode" DEFAULT 'newest',
  	"product_source_collection_id" integer,
  	"product_source_category_id" integer,
  	"product_source_descendants" boolean DEFAULT true,
  	"product_source_tag" varchar,
  	"product_source_type" varchar,
  	"product_source_limit" numeric DEFAULT 8,
  	"product_source_sort" "enum__templates_v_blocks_product_collection_ps_sort" DEFAULT 'newest',
  	"product_source_empty_behavior" "enum__templates_v_blocks_product_collection_ps_empty" DEFAULT 'hide',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_product_collection_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_product_collection_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_product_collection_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_product_collection_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_product_collection_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_featured_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_featured_product_variant" DEFAULT 'standard',
  	"product_id" integer,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_featured_product_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_featured_product_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_featured_product_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_featured_product_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_featured_product_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_bundle" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_bundle_variant" DEFAULT 'standard',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_bundle_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_bundle_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_bundle_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_bundle_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_bundle_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_promo_banner_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__templates_v_blocks_promo_banner_links_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_new_tab" boolean,
  	"link_appearance" "enum__templates_v_blocks_promo_banner_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_promo_banner_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_promo_banner_variant" DEFAULT 'standard',
  	"code" varchar,
  	"ends_at" timestamp(3) with time zone,
  	"media_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_promo_banner_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_promo_banner_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_promo_banner_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_promo_banner_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_promo_banner_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"terms" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_comparison_rows_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_comparison_variant" DEFAULT 'standard',
  	"pick_id" integer,
  	"show_options" boolean DEFAULT true,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_comparison_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_comparison_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_comparison_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_comparison_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_collection_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_collection_spotlight_variant" DEFAULT 'standard',
  	"collection_id" integer,
  	"media_id" integer,
  	"limit" numeric DEFAULT 4,
  	"sort" "enum__templates_v_blocks_collection_spotlight_sort" DEFAULT 'newest',
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_collection_spotlight_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_collection_spotlight_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_collection_spotlight_ss_container" DEFAULT 'default',
  	"section_settings_visibility" "enum__templates_v_blocks_collection_spotlight_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_collection_spotlight_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_newsletter_variant" DEFAULT 'standard',
  	"media_id" integer,
  	"form_id" integer,
  	"privacy_type" "enum__templates_v_blocks_newsletter_privacy_type" DEFAULT 'reference',
  	"privacy_url" varchar,
  	"privacy_new_tab" boolean,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_newsletter_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_newsletter_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_newsletter_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum__templates_v_blocks_newsletter_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_newsletter_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_templates_v_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__templates_v_blocks_form_block_variant" DEFAULT 'standard',
  	"form_id" integer,
  	"section_settings_anchor" varchar,
  	"section_settings_spacing" "enum__templates_v_blocks_form_block_ss_spacing" DEFAULT 'medium',
  	"section_settings_surface" "enum__templates_v_blocks_form_block_ss_surface" DEFAULT 'default',
  	"section_settings_container" "enum__templates_v_blocks_form_block_ss_container" DEFAULT 'narrow',
  	"section_settings_visibility" "enum__templates_v_blocks_form_block_ss_visibility" DEFAULT 'all',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_templates_v_blocks_form_block_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "products" ADD COLUMN "sections_mode" "enum_products_sections_mode" DEFAULT 'default';
  ALTER TABLE "products_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "products_rels" ADD COLUMN "collections_id" integer;
  ALTER TABLE "products_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "categories" ADD COLUMN "sections_mode" "enum_categories_sections_mode" DEFAULT 'default';
  ALTER TABLE "collections" ADD COLUMN "sections_mode" "enum_collections_sections_mode" DEFAULT 'default';
  ALTER TABLE "templates_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "templates_rels" ADD COLUMN "collections_id" integer;
  ALTER TABLE "_templates_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_templates_v_rels" ADD COLUMN "collections_id" integer;
  ALTER TABLE "products_blocks_rich_text" ADD CONSTRAINT "products_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_rich_text_locales" ADD CONSTRAINT "products_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_media_with_text_links" ADD CONSTRAINT "products_blocks_media_with_text_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_media_with_text_links_locales" ADD CONSTRAINT "products_blocks_media_with_text_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_media_with_text_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_media_with_text" ADD CONSTRAINT "products_blocks_media_with_text_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_media_with_text" ADD CONSTRAINT "products_blocks_media_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_media_with_text_locales" ADD CONSTRAINT "products_blocks_media_with_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_usp_bar_items" ADD CONSTRAINT "products_blocks_usp_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_usp_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_usp_bar_items_locales" ADD CONSTRAINT "products_blocks_usp_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_usp_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_usp_bar" ADD CONSTRAINT "products_blocks_usp_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_logo_cloud_logos" ADD CONSTRAINT "products_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_logo_cloud_logos" ADD CONSTRAINT "products_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_logo_cloud" ADD CONSTRAINT "products_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_logo_cloud_locales" ADD CONSTRAINT "products_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_faq_items" ADD CONSTRAINT "products_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_faq_items_locales" ADD CONSTRAINT "products_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_faq" ADD CONSTRAINT "products_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_faq_locales" ADD CONSTRAINT "products_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_testimonials_quotes" ADD CONSTRAINT "products_blocks_testimonials_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_testimonials_quotes" ADD CONSTRAINT "products_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_testimonials_quotes_locales" ADD CONSTRAINT "products_blocks_testimonials_quotes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_testimonials_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_testimonials" ADD CONSTRAINT "products_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_testimonials_locales" ADD CONSTRAINT "products_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_video_captions" ADD CONSTRAINT "products_blocks_video_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_video_captions" ADD CONSTRAINT "products_blocks_video_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_video" ADD CONSTRAINT "products_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_video" ADD CONSTRAINT "products_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_video" ADD CONSTRAINT "products_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_video_locales" ADD CONSTRAINT "products_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_spacer" ADD CONSTRAINT "products_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_links" ADD CONSTRAINT "products_blocks_category_showcase_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_links_locales" ADD CONSTRAINT "products_blocks_category_showcase_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_category_showcase_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_cs_items" ADD CONSTRAINT "products_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_cs_items" ADD CONSTRAINT "products_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_cs_items" ADD CONSTRAINT "products_blocks_category_showcase_cs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_cs_items_locales" ADD CONSTRAINT "products_blocks_category_showcase_cs_items_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_category_showcase_cs_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase" ADD CONSTRAINT "products_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase" ADD CONSTRAINT "products_blocks_category_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_locales" ADD CONSTRAINT "products_blocks_category_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_links" ADD CONSTRAINT "products_blocks_product_collection_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_links_locales" ADD CONSTRAINT "products_blocks_product_collection_links_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_collection_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs" ADD CONSTRAINT "products_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs" ADD CONSTRAINT "products_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs" ADD CONSTRAINT "products_blocks_product_collection_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs_locales" ADD CONSTRAINT "products_blocks_product_collection_tabs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_collection_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_locales" ADD CONSTRAINT "products_blocks_product_collection_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_featured_product" ADD CONSTRAINT "products_blocks_featured_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_featured_product" ADD CONSTRAINT "products_blocks_featured_product_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_featured_product" ADD CONSTRAINT "products_blocks_featured_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_featured_product_locales" ADD CONSTRAINT "products_blocks_featured_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_featured_product"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_bundle" ADD CONSTRAINT "products_blocks_bundle_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_bundle_locales" ADD CONSTRAINT "products_blocks_bundle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_bundle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_promo_banner_links" ADD CONSTRAINT "products_blocks_promo_banner_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_promo_banner_links_locales" ADD CONSTRAINT "products_blocks_promo_banner_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_promo_banner_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_promo_banner" ADD CONSTRAINT "products_blocks_promo_banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_promo_banner" ADD CONSTRAINT "products_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_promo_banner_locales" ADD CONSTRAINT "products_blocks_promo_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_rows" ADD CONSTRAINT "products_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_rows_locales" ADD CONSTRAINT "products_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison" ADD CONSTRAINT "products_blocks_comparison_pick_id_products_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison" ADD CONSTRAINT "products_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_locales" ADD CONSTRAINT "products_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_collection_spotlight" ADD CONSTRAINT "products_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_collection_spotlight" ADD CONSTRAINT "products_blocks_collection_spotlight_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_collection_spotlight" ADD CONSTRAINT "products_blocks_collection_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_collection_spotlight_locales" ADD CONSTRAINT "products_blocks_collection_spotlight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_collection_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_newsletter" ADD CONSTRAINT "products_blocks_newsletter_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_newsletter" ADD CONSTRAINT "products_blocks_newsletter_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_newsletter" ADD CONSTRAINT "products_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_newsletter_locales" ADD CONSTRAINT "products_blocks_newsletter_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_form_block" ADD CONSTRAINT "products_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_form_block" ADD CONSTRAINT "products_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_form_block_locales" ADD CONSTRAINT "products_blocks_form_block_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_form_block"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_rich_text" ADD CONSTRAINT "categories_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_rich_text_locales" ADD CONSTRAINT "categories_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_media_with_text_links" ADD CONSTRAINT "categories_blocks_media_with_text_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_media_with_text_links_locales" ADD CONSTRAINT "categories_blocks_media_with_text_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_media_with_text_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_media_with_text" ADD CONSTRAINT "categories_blocks_media_with_text_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_media_with_text" ADD CONSTRAINT "categories_blocks_media_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_media_with_text_locales" ADD CONSTRAINT "categories_blocks_media_with_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_usp_bar_items" ADD CONSTRAINT "categories_blocks_usp_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_usp_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_usp_bar_items_locales" ADD CONSTRAINT "categories_blocks_usp_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_usp_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_usp_bar" ADD CONSTRAINT "categories_blocks_usp_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_logo_cloud_logos" ADD CONSTRAINT "categories_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_logo_cloud_logos" ADD CONSTRAINT "categories_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_logo_cloud" ADD CONSTRAINT "categories_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_logo_cloud_locales" ADD CONSTRAINT "categories_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_faq_items" ADD CONSTRAINT "categories_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_faq_items_locales" ADD CONSTRAINT "categories_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_faq" ADD CONSTRAINT "categories_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_faq_locales" ADD CONSTRAINT "categories_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_testimonials_quotes" ADD CONSTRAINT "categories_blocks_testimonials_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_testimonials_quotes" ADD CONSTRAINT "categories_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_testimonials_quotes_locales" ADD CONSTRAINT "categories_blocks_testimonials_quotes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_testimonials_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_testimonials" ADD CONSTRAINT "categories_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_testimonials_locales" ADD CONSTRAINT "categories_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_video_captions" ADD CONSTRAINT "categories_blocks_video_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_video_captions" ADD CONSTRAINT "categories_blocks_video_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_video" ADD CONSTRAINT "categories_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_video" ADD CONSTRAINT "categories_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_video" ADD CONSTRAINT "categories_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_video_locales" ADD CONSTRAINT "categories_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_spacer" ADD CONSTRAINT "categories_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_links" ADD CONSTRAINT "categories_blocks_category_showcase_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_links_locales" ADD CONSTRAINT "categories_blocks_category_showcase_links_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_category_showcase_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items_locales" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_locales_pare_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_category_showcase_cs_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase" ADD CONSTRAINT "categories_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase" ADD CONSTRAINT "categories_blocks_category_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_locales" ADD CONSTRAINT "categories_blocks_category_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_links" ADD CONSTRAINT "categories_blocks_product_collection_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_links_locales" ADD CONSTRAINT "categories_blocks_product_collection_links_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_product_collection_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs" ADD CONSTRAINT "categories_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs" ADD CONSTRAINT "categories_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs" ADD CONSTRAINT "categories_blocks_product_collection_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs_locales" ADD CONSTRAINT "categories_blocks_product_collection_tabs_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_product_collection_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_locales" ADD CONSTRAINT "categories_blocks_product_collection_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_featured_product" ADD CONSTRAINT "categories_blocks_featured_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_featured_product" ADD CONSTRAINT "categories_blocks_featured_product_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_featured_product" ADD CONSTRAINT "categories_blocks_featured_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_featured_product_locales" ADD CONSTRAINT "categories_blocks_featured_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_featured_product"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_bundle" ADD CONSTRAINT "categories_blocks_bundle_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_bundle_locales" ADD CONSTRAINT "categories_blocks_bundle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_bundle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_promo_banner_links" ADD CONSTRAINT "categories_blocks_promo_banner_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_promo_banner_links_locales" ADD CONSTRAINT "categories_blocks_promo_banner_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_promo_banner_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_promo_banner" ADD CONSTRAINT "categories_blocks_promo_banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_promo_banner" ADD CONSTRAINT "categories_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_promo_banner_locales" ADD CONSTRAINT "categories_blocks_promo_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_comparison_rows" ADD CONSTRAINT "categories_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_comparison_rows_locales" ADD CONSTRAINT "categories_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_comparison" ADD CONSTRAINT "categories_blocks_comparison_pick_id_products_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_comparison" ADD CONSTRAINT "categories_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_comparison_locales" ADD CONSTRAINT "categories_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_collection_spotlight" ADD CONSTRAINT "categories_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_collection_spotlight" ADD CONSTRAINT "categories_blocks_collection_spotlight_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_collection_spotlight" ADD CONSTRAINT "categories_blocks_collection_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_collection_spotlight_locales" ADD CONSTRAINT "categories_blocks_collection_spotlight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_collection_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_newsletter" ADD CONSTRAINT "categories_blocks_newsletter_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_newsletter" ADD CONSTRAINT "categories_blocks_newsletter_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_newsletter" ADD CONSTRAINT "categories_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_newsletter_locales" ADD CONSTRAINT "categories_blocks_newsletter_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_form_block" ADD CONSTRAINT "categories_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_form_block" ADD CONSTRAINT "categories_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_blocks_form_block_locales" ADD CONSTRAINT "categories_blocks_form_block_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories_blocks_form_block"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_rich_text" ADD CONSTRAINT "collections_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_rich_text_locales" ADD CONSTRAINT "collections_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_media_with_text_links" ADD CONSTRAINT "collections_blocks_media_with_text_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_media_with_text_links_locales" ADD CONSTRAINT "collections_blocks_media_with_text_links_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_media_with_text_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_media_with_text" ADD CONSTRAINT "collections_blocks_media_with_text_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_media_with_text" ADD CONSTRAINT "collections_blocks_media_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_media_with_text_locales" ADD CONSTRAINT "collections_blocks_media_with_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_usp_bar_items" ADD CONSTRAINT "collections_blocks_usp_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_usp_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_usp_bar_items_locales" ADD CONSTRAINT "collections_blocks_usp_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_usp_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_usp_bar" ADD CONSTRAINT "collections_blocks_usp_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_logo_cloud_logos" ADD CONSTRAINT "collections_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_logo_cloud_logos" ADD CONSTRAINT "collections_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_logo_cloud" ADD CONSTRAINT "collections_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_logo_cloud_locales" ADD CONSTRAINT "collections_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_faq_items" ADD CONSTRAINT "collections_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_faq_items_locales" ADD CONSTRAINT "collections_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_faq" ADD CONSTRAINT "collections_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_faq_locales" ADD CONSTRAINT "collections_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_testimonials_quotes" ADD CONSTRAINT "collections_blocks_testimonials_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_testimonials_quotes" ADD CONSTRAINT "collections_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_testimonials_quotes_locales" ADD CONSTRAINT "collections_blocks_testimonials_quotes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_testimonials_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_testimonials" ADD CONSTRAINT "collections_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_testimonials_locales" ADD CONSTRAINT "collections_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_video_captions" ADD CONSTRAINT "collections_blocks_video_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_video_captions" ADD CONSTRAINT "collections_blocks_video_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_video" ADD CONSTRAINT "collections_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_video" ADD CONSTRAINT "collections_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_video" ADD CONSTRAINT "collections_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_video_locales" ADD CONSTRAINT "collections_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_spacer" ADD CONSTRAINT "collections_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_links" ADD CONSTRAINT "collections_blocks_category_showcase_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_links_locales" ADD CONSTRAINT "collections_blocks_category_showcase_links_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_category_showcase_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items_locales" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_locales_par_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_category_showcase_cs_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase" ADD CONSTRAINT "collections_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase" ADD CONSTRAINT "collections_blocks_category_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_locales" ADD CONSTRAINT "collections_blocks_category_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_links" ADD CONSTRAINT "collections_blocks_product_collection_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_links_locales" ADD CONSTRAINT "collections_blocks_product_collection_links_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_product_collection_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs" ADD CONSTRAINT "collections_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs" ADD CONSTRAINT "collections_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs" ADD CONSTRAINT "collections_blocks_product_collection_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs_locales" ADD CONSTRAINT "collections_blocks_product_collection_tabs_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_product_collection_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_locales" ADD CONSTRAINT "collections_blocks_product_collection_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_featured_product" ADD CONSTRAINT "collections_blocks_featured_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_featured_product" ADD CONSTRAINT "collections_blocks_featured_product_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_featured_product" ADD CONSTRAINT "collections_blocks_featured_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_featured_product_locales" ADD CONSTRAINT "collections_blocks_featured_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_featured_product"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_bundle" ADD CONSTRAINT "collections_blocks_bundle_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_bundle_locales" ADD CONSTRAINT "collections_blocks_bundle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_bundle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_promo_banner_links" ADD CONSTRAINT "collections_blocks_promo_banner_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_promo_banner_links_locales" ADD CONSTRAINT "collections_blocks_promo_banner_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_promo_banner_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_promo_banner" ADD CONSTRAINT "collections_blocks_promo_banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_promo_banner" ADD CONSTRAINT "collections_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_promo_banner_locales" ADD CONSTRAINT "collections_blocks_promo_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_comparison_rows" ADD CONSTRAINT "collections_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_comparison_rows_locales" ADD CONSTRAINT "collections_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_comparison" ADD CONSTRAINT "collections_blocks_comparison_pick_id_products_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_comparison" ADD CONSTRAINT "collections_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_comparison_locales" ADD CONSTRAINT "collections_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_collection_spotlight" ADD CONSTRAINT "collections_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_collection_spotlight" ADD CONSTRAINT "collections_blocks_collection_spotlight_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_collection_spotlight" ADD CONSTRAINT "collections_blocks_collection_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_collection_spotlight_locales" ADD CONSTRAINT "collections_blocks_collection_spotlight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_collection_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_newsletter" ADD CONSTRAINT "collections_blocks_newsletter_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_newsletter" ADD CONSTRAINT "collections_blocks_newsletter_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_newsletter" ADD CONSTRAINT "collections_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_newsletter_locales" ADD CONSTRAINT "collections_blocks_newsletter_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_form_block" ADD CONSTRAINT "collections_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_form_block" ADD CONSTRAINT "collections_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_blocks_form_block_locales" ADD CONSTRAINT "collections_blocks_form_block_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections_blocks_form_block"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rels" ADD CONSTRAINT "collections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rels" ADD CONSTRAINT "collections_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rels" ADD CONSTRAINT "collections_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rels" ADD CONSTRAINT "collections_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_rich_text" ADD CONSTRAINT "templates_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_rich_text_locales" ADD CONSTRAINT "templates_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_media_with_text_links" ADD CONSTRAINT "templates_blocks_media_with_text_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_media_with_text_links_locales" ADD CONSTRAINT "templates_blocks_media_with_text_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_media_with_text_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_media_with_text" ADD CONSTRAINT "templates_blocks_media_with_text_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_media_with_text" ADD CONSTRAINT "templates_blocks_media_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_media_with_text_locales" ADD CONSTRAINT "templates_blocks_media_with_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_usp_bar_items" ADD CONSTRAINT "templates_blocks_usp_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_usp_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_usp_bar_items_locales" ADD CONSTRAINT "templates_blocks_usp_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_usp_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_usp_bar" ADD CONSTRAINT "templates_blocks_usp_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_logo_cloud_logos" ADD CONSTRAINT "templates_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_logo_cloud_logos" ADD CONSTRAINT "templates_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_logo_cloud" ADD CONSTRAINT "templates_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_logo_cloud_locales" ADD CONSTRAINT "templates_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_faq_items" ADD CONSTRAINT "templates_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_faq_items_locales" ADD CONSTRAINT "templates_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_faq" ADD CONSTRAINT "templates_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_faq_locales" ADD CONSTRAINT "templates_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_testimonials_quotes" ADD CONSTRAINT "templates_blocks_testimonials_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_testimonials_quotes" ADD CONSTRAINT "templates_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_testimonials_quotes_locales" ADD CONSTRAINT "templates_blocks_testimonials_quotes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_testimonials_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_testimonials" ADD CONSTRAINT "templates_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_testimonials_locales" ADD CONSTRAINT "templates_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_video_captions" ADD CONSTRAINT "templates_blocks_video_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_video_captions" ADD CONSTRAINT "templates_blocks_video_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_video" ADD CONSTRAINT "templates_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_video" ADD CONSTRAINT "templates_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_video" ADD CONSTRAINT "templates_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_video_locales" ADD CONSTRAINT "templates_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_spacer" ADD CONSTRAINT "templates_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_links" ADD CONSTRAINT "templates_blocks_category_showcase_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_links_locales" ADD CONSTRAINT "templates_blocks_category_showcase_links_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_category_showcase_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items_locales" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_category_showcase_cs_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase" ADD CONSTRAINT "templates_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase" ADD CONSTRAINT "templates_blocks_category_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_locales" ADD CONSTRAINT "templates_blocks_category_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_links" ADD CONSTRAINT "templates_blocks_product_collection_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_links_locales" ADD CONSTRAINT "templates_blocks_product_collection_links_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_product_collection_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs" ADD CONSTRAINT "templates_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs" ADD CONSTRAINT "templates_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs" ADD CONSTRAINT "templates_blocks_product_collection_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs_locales" ADD CONSTRAINT "templates_blocks_product_collection_tabs_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_product_collection_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_locales" ADD CONSTRAINT "templates_blocks_product_collection_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_featured_product" ADD CONSTRAINT "templates_blocks_featured_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_featured_product" ADD CONSTRAINT "templates_blocks_featured_product_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_featured_product" ADD CONSTRAINT "templates_blocks_featured_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_featured_product_locales" ADD CONSTRAINT "templates_blocks_featured_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_featured_product"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_bundle" ADD CONSTRAINT "templates_blocks_bundle_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_bundle_locales" ADD CONSTRAINT "templates_blocks_bundle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_bundle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_promo_banner_links" ADD CONSTRAINT "templates_blocks_promo_banner_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_promo_banner_links_locales" ADD CONSTRAINT "templates_blocks_promo_banner_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_promo_banner_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_promo_banner" ADD CONSTRAINT "templates_blocks_promo_banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_promo_banner" ADD CONSTRAINT "templates_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_promo_banner_locales" ADD CONSTRAINT "templates_blocks_promo_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_comparison_rows" ADD CONSTRAINT "templates_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_comparison_rows_locales" ADD CONSTRAINT "templates_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_comparison" ADD CONSTRAINT "templates_blocks_comparison_pick_id_products_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_comparison" ADD CONSTRAINT "templates_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_comparison_locales" ADD CONSTRAINT "templates_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_collection_spotlight" ADD CONSTRAINT "templates_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_collection_spotlight" ADD CONSTRAINT "templates_blocks_collection_spotlight_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_collection_spotlight" ADD CONSTRAINT "templates_blocks_collection_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_collection_spotlight_locales" ADD CONSTRAINT "templates_blocks_collection_spotlight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_collection_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_newsletter" ADD CONSTRAINT "templates_blocks_newsletter_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_newsletter" ADD CONSTRAINT "templates_blocks_newsletter_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_newsletter" ADD CONSTRAINT "templates_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_newsletter_locales" ADD CONSTRAINT "templates_blocks_newsletter_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_form_block" ADD CONSTRAINT "templates_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_form_block" ADD CONSTRAINT "templates_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_blocks_form_block_locales" ADD CONSTRAINT "templates_blocks_form_block_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."templates_blocks_form_block"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_rich_text" ADD CONSTRAINT "_templates_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_rich_text_locales" ADD CONSTRAINT "_templates_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_media_with_text_links" ADD CONSTRAINT "_templates_v_blocks_media_with_text_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_media_with_text_links_locales" ADD CONSTRAINT "_templates_v_blocks_media_with_text_links_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_media_with_text_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_media_with_text" ADD CONSTRAINT "_templates_v_blocks_media_with_text_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_media_with_text" ADD CONSTRAINT "_templates_v_blocks_media_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_media_with_text_locales" ADD CONSTRAINT "_templates_v_blocks_media_with_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_media_with_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_usp_bar_items" ADD CONSTRAINT "_templates_v_blocks_usp_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_usp_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_usp_bar_items_locales" ADD CONSTRAINT "_templates_v_blocks_usp_bar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_usp_bar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_usp_bar" ADD CONSTRAINT "_templates_v_blocks_usp_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_templates_v_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_templates_v_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_logo_cloud" ADD CONSTRAINT "_templates_v_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_logo_cloud_locales" ADD CONSTRAINT "_templates_v_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_faq_items" ADD CONSTRAINT "_templates_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_faq_items_locales" ADD CONSTRAINT "_templates_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_faq" ADD CONSTRAINT "_templates_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_faq_locales" ADD CONSTRAINT "_templates_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_testimonials_quotes" ADD CONSTRAINT "_templates_v_blocks_testimonials_quotes_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_testimonials_quotes" ADD CONSTRAINT "_templates_v_blocks_testimonials_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_testimonials_quotes_locales" ADD CONSTRAINT "_templates_v_blocks_testimonials_quotes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_testimonials_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_testimonials" ADD CONSTRAINT "_templates_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_testimonials_locales" ADD CONSTRAINT "_templates_v_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_video_captions" ADD CONSTRAINT "_templates_v_blocks_video_captions_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_video_captions" ADD CONSTRAINT "_templates_v_blocks_video_captions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_video" ADD CONSTRAINT "_templates_v_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_video" ADD CONSTRAINT "_templates_v_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_video" ADD CONSTRAINT "_templates_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_video_locales" ADD CONSTRAINT "_templates_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_spacer" ADD CONSTRAINT "_templates_v_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_category_showcase_links" ADD CONSTRAINT "_templates_v_blocks_category_showcase_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_category_showcase_links_locales" ADD CONSTRAINT "_templates_v_blocks_category_showcase_links_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_category_showcase_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v_locales" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_locales_pa_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_blocks_category_showcase_cs_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_category_showcase" ADD CONSTRAINT "_templates_v_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_category_showcase" ADD CONSTRAINT "_templates_v_blocks_category_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_category_showcase_locales" ADD CONSTRAINT "_templates_v_blocks_category_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_category_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_links" ADD CONSTRAINT "_templates_v_blocks_product_collection_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_links_locales" ADD CONSTRAINT "_templates_v_blocks_product_collection_links_locales_pare_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_product_collection_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs_locales" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_product_collection_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_locales" ADD CONSTRAINT "_templates_v_blocks_product_collection_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_product_collection"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_featured_product" ADD CONSTRAINT "_templates_v_blocks_featured_product_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_featured_product" ADD CONSTRAINT "_templates_v_blocks_featured_product_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_featured_product" ADD CONSTRAINT "_templates_v_blocks_featured_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_featured_product_locales" ADD CONSTRAINT "_templates_v_blocks_featured_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_featured_product"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_bundle" ADD CONSTRAINT "_templates_v_blocks_bundle_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_bundle_locales" ADD CONSTRAINT "_templates_v_blocks_bundle_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_bundle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_promo_banner_links" ADD CONSTRAINT "_templates_v_blocks_promo_banner_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_promo_banner_links_locales" ADD CONSTRAINT "_templates_v_blocks_promo_banner_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_promo_banner_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_promo_banner" ADD CONSTRAINT "_templates_v_blocks_promo_banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_promo_banner" ADD CONSTRAINT "_templates_v_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_promo_banner_locales" ADD CONSTRAINT "_templates_v_blocks_promo_banner_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_promo_banner"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_comparison_rows" ADD CONSTRAINT "_templates_v_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_comparison_rows_locales" ADD CONSTRAINT "_templates_v_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_comparison" ADD CONSTRAINT "_templates_v_blocks_comparison_pick_id_products_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_comparison" ADD CONSTRAINT "_templates_v_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_comparison_locales" ADD CONSTRAINT "_templates_v_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_collection_spotlight" ADD CONSTRAINT "_templates_v_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_collection_spotlight" ADD CONSTRAINT "_templates_v_blocks_collection_spotlight_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_collection_spotlight" ADD CONSTRAINT "_templates_v_blocks_collection_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_collection_spotlight_locales" ADD CONSTRAINT "_templates_v_blocks_collection_spotlight_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_collection_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_newsletter" ADD CONSTRAINT "_templates_v_blocks_newsletter_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_newsletter" ADD CONSTRAINT "_templates_v_blocks_newsletter_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_newsletter" ADD CONSTRAINT "_templates_v_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_newsletter_locales" ADD CONSTRAINT "_templates_v_blocks_newsletter_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_form_block" ADD CONSTRAINT "_templates_v_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_form_block" ADD CONSTRAINT "_templates_v_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_form_block_locales" ADD CONSTRAINT "_templates_v_blocks_form_block_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_templates_v_blocks_form_block"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_blocks_rich_text_order_idx" ON "products_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "products_blocks_rich_text_parent_id_idx" ON "products_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_rich_text_path_idx" ON "products_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_rich_text_locales_locale_parent_id_unique" ON "products_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_rich_text_locales_parent_id_idx" ON "products_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_media_with_text_links_order_idx" ON "products_blocks_media_with_text_links" USING btree ("_order");
  CREATE INDEX "products_blocks_media_with_text_links_parent_id_idx" ON "products_blocks_media_with_text_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_media_with_text_links_locales_locale_parent_" ON "products_blocks_media_with_text_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_media_with_text_links_locales_parent_id_idx" ON "products_blocks_media_with_text_links_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_media_with_text_order_idx" ON "products_blocks_media_with_text" USING btree ("_order");
  CREATE INDEX "products_blocks_media_with_text_parent_id_idx" ON "products_blocks_media_with_text" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_media_with_text_path_idx" ON "products_blocks_media_with_text" USING btree ("_path");
  CREATE INDEX "products_blocks_media_with_text_media_idx" ON "products_blocks_media_with_text" USING btree ("media_id");
  CREATE UNIQUE INDEX "products_blocks_media_with_text_locales_locale_parent_id_uni" ON "products_blocks_media_with_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_media_with_text_locales_parent_id_idx" ON "products_blocks_media_with_text_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_usp_bar_items_order_idx" ON "products_blocks_usp_bar_items" USING btree ("_order");
  CREATE INDEX "products_blocks_usp_bar_items_parent_id_idx" ON "products_blocks_usp_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_usp_bar_items_locales_locale_parent_id_uniqu" ON "products_blocks_usp_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_usp_bar_items_locales_parent_id_idx" ON "products_blocks_usp_bar_items_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_usp_bar_order_idx" ON "products_blocks_usp_bar" USING btree ("_order");
  CREATE INDEX "products_blocks_usp_bar_parent_id_idx" ON "products_blocks_usp_bar" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_usp_bar_path_idx" ON "products_blocks_usp_bar" USING btree ("_path");
  CREATE INDEX "products_blocks_logo_cloud_logos_order_idx" ON "products_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "products_blocks_logo_cloud_logos_parent_id_idx" ON "products_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_logo_cloud_logos_image_idx" ON "products_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "products_blocks_logo_cloud_order_idx" ON "products_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "products_blocks_logo_cloud_parent_id_idx" ON "products_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_logo_cloud_path_idx" ON "products_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_logo_cloud_locales_locale_parent_id_unique" ON "products_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_logo_cloud_locales_parent_id_idx" ON "products_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_faq_items_order_idx" ON "products_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "products_blocks_faq_items_parent_id_idx" ON "products_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_faq_items_locales_locale_parent_id_unique" ON "products_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_faq_items_locales_parent_id_idx" ON "products_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_faq_order_idx" ON "products_blocks_faq" USING btree ("_order");
  CREATE INDEX "products_blocks_faq_parent_id_idx" ON "products_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_faq_path_idx" ON "products_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_faq_locales_locale_parent_id_unique" ON "products_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_faq_locales_parent_id_idx" ON "products_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_testimonials_quotes_order_idx" ON "products_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "products_blocks_testimonials_quotes_parent_id_idx" ON "products_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_testimonials_quotes_avatar_idx" ON "products_blocks_testimonials_quotes" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "products_blocks_testimonials_quotes_locales_locale_parent_id" ON "products_blocks_testimonials_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_testimonials_quotes_locales_parent_id_idx" ON "products_blocks_testimonials_quotes_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_testimonials_order_idx" ON "products_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "products_blocks_testimonials_parent_id_idx" ON "products_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_testimonials_path_idx" ON "products_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_testimonials_locales_locale_parent_id_unique" ON "products_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_testimonials_locales_parent_id_idx" ON "products_blocks_testimonials_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_video_captions_order_idx" ON "products_blocks_video_captions" USING btree ("_order");
  CREATE INDEX "products_blocks_video_captions_parent_id_idx" ON "products_blocks_video_captions" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_video_captions_file_idx" ON "products_blocks_video_captions" USING btree ("file_id");
  CREATE INDEX "products_blocks_video_order_idx" ON "products_blocks_video" USING btree ("_order");
  CREATE INDEX "products_blocks_video_parent_id_idx" ON "products_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_video_path_idx" ON "products_blocks_video" USING btree ("_path");
  CREATE INDEX "products_blocks_video_file_idx" ON "products_blocks_video" USING btree ("file_id");
  CREATE INDEX "products_blocks_video_poster_idx" ON "products_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "products_blocks_video_locales_locale_parent_id_unique" ON "products_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_video_locales_parent_id_idx" ON "products_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_spacer_order_idx" ON "products_blocks_spacer" USING btree ("_order");
  CREATE INDEX "products_blocks_spacer_parent_id_idx" ON "products_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_spacer_path_idx" ON "products_blocks_spacer" USING btree ("_path");
  CREATE INDEX "products_blocks_category_showcase_links_order_idx" ON "products_blocks_category_showcase_links" USING btree ("_order");
  CREATE INDEX "products_blocks_category_showcase_links_parent_id_idx" ON "products_blocks_category_showcase_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_category_showcase_links_locales_locale_paren" ON "products_blocks_category_showcase_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_category_showcase_links_locales_parent_i_idx" ON "products_blocks_category_showcase_links_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_category_showcase_cs_items_order_idx" ON "products_blocks_category_showcase_cs_items" USING btree ("_order");
  CREATE INDEX "products_blocks_category_showcase_cs_items_parent_id_idx" ON "products_blocks_category_showcase_cs_items" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_category_showcase_cs_items_category_idx" ON "products_blocks_category_showcase_cs_items" USING btree ("category_id");
  CREATE INDEX "products_blocks_category_showcase_cs_items_image_idx" ON "products_blocks_category_showcase_cs_items" USING btree ("image_id");
  CREATE UNIQUE INDEX "products_blocks_category_showcase_cs_items_locales_locale_pa" ON "products_blocks_category_showcase_cs_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_category_showcase_cs_items_locales_paren_idx" ON "products_blocks_category_showcase_cs_items_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_category_showcase_order_idx" ON "products_blocks_category_showcase" USING btree ("_order");
  CREATE INDEX "products_blocks_category_showcase_parent_id_idx" ON "products_blocks_category_showcase" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_category_showcase_path_idx" ON "products_blocks_category_showcase" USING btree ("_path");
  CREATE INDEX "products_blocks_category_showcase_category_source_catego_idx" ON "products_blocks_category_showcase" USING btree ("category_source_parent_id");
  CREATE UNIQUE INDEX "products_blocks_category_showcase_locales_locale_parent_id_u" ON "products_blocks_category_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_category_showcase_locales_parent_id_idx" ON "products_blocks_category_showcase_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_product_collection_links_order_idx" ON "products_blocks_product_collection_links" USING btree ("_order");
  CREATE INDEX "products_blocks_product_collection_links_parent_id_idx" ON "products_blocks_product_collection_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_product_collection_links_locales_locale_pare" ON "products_blocks_product_collection_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_product_collection_links_locales_parent__idx" ON "products_blocks_product_collection_links_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_product_collection_tabs_order_idx" ON "products_blocks_product_collection_tabs" USING btree ("_order");
  CREATE INDEX "products_blocks_product_collection_tabs_parent_id_idx" ON "products_blocks_product_collection_tabs" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_product_collection_tabs_product_source_p_idx" ON "products_blocks_product_collection_tabs" USING btree ("product_source_collection_id");
  CREATE INDEX "products_blocks_product_collection_tabs_product_source_1_idx" ON "products_blocks_product_collection_tabs" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "products_blocks_product_collection_tabs_locales_locale_paren" ON "products_blocks_product_collection_tabs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_product_collection_tabs_locales_parent_i_idx" ON "products_blocks_product_collection_tabs_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_product_collection_order_idx" ON "products_blocks_product_collection" USING btree ("_order");
  CREATE INDEX "products_blocks_product_collection_parent_id_idx" ON "products_blocks_product_collection" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_product_collection_path_idx" ON "products_blocks_product_collection" USING btree ("_path");
  CREATE INDEX "products_blocks_product_collection_media_idx" ON "products_blocks_product_collection" USING btree ("media_id");
  CREATE INDEX "products_blocks_product_collection_product_source_produc_idx" ON "products_blocks_product_collection" USING btree ("product_source_collection_id");
  CREATE INDEX "products_blocks_product_collection_product_source_prod_1_idx" ON "products_blocks_product_collection" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "products_blocks_product_collection_locales_locale_parent_id_" ON "products_blocks_product_collection_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_product_collection_locales_parent_id_idx" ON "products_blocks_product_collection_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_featured_product_order_idx" ON "products_blocks_featured_product" USING btree ("_order");
  CREATE INDEX "products_blocks_featured_product_parent_id_idx" ON "products_blocks_featured_product" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_featured_product_path_idx" ON "products_blocks_featured_product" USING btree ("_path");
  CREATE INDEX "products_blocks_featured_product_product_idx" ON "products_blocks_featured_product" USING btree ("product_id");
  CREATE INDEX "products_blocks_featured_product_media_idx" ON "products_blocks_featured_product" USING btree ("media_id");
  CREATE UNIQUE INDEX "products_blocks_featured_product_locales_locale_parent_id_un" ON "products_blocks_featured_product_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_featured_product_locales_parent_id_idx" ON "products_blocks_featured_product_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_bundle_order_idx" ON "products_blocks_bundle" USING btree ("_order");
  CREATE INDEX "products_blocks_bundle_parent_id_idx" ON "products_blocks_bundle" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_bundle_path_idx" ON "products_blocks_bundle" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_bundle_locales_locale_parent_id_unique" ON "products_blocks_bundle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_bundle_locales_parent_id_idx" ON "products_blocks_bundle_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_promo_banner_links_order_idx" ON "products_blocks_promo_banner_links" USING btree ("_order");
  CREATE INDEX "products_blocks_promo_banner_links_parent_id_idx" ON "products_blocks_promo_banner_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_promo_banner_links_locales_locale_parent_id_" ON "products_blocks_promo_banner_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_promo_banner_links_locales_parent_id_idx" ON "products_blocks_promo_banner_links_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_promo_banner_order_idx" ON "products_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "products_blocks_promo_banner_parent_id_idx" ON "products_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_promo_banner_path_idx" ON "products_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "products_blocks_promo_banner_media_idx" ON "products_blocks_promo_banner" USING btree ("media_id");
  CREATE UNIQUE INDEX "products_blocks_promo_banner_locales_locale_parent_id_unique" ON "products_blocks_promo_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_promo_banner_locales_parent_id_idx" ON "products_blocks_promo_banner_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_comparison_rows_order_idx" ON "products_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "products_blocks_comparison_rows_parent_id_idx" ON "products_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_comparison_rows_locales_locale_parent_id_uni" ON "products_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_comparison_rows_locales_parent_id_idx" ON "products_blocks_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_comparison_order_idx" ON "products_blocks_comparison" USING btree ("_order");
  CREATE INDEX "products_blocks_comparison_parent_id_idx" ON "products_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_comparison_path_idx" ON "products_blocks_comparison" USING btree ("_path");
  CREATE INDEX "products_blocks_comparison_pick_idx" ON "products_blocks_comparison" USING btree ("pick_id");
  CREATE UNIQUE INDEX "products_blocks_comparison_locales_locale_parent_id_unique" ON "products_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_comparison_locales_parent_id_idx" ON "products_blocks_comparison_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_collection_spotlight_order_idx" ON "products_blocks_collection_spotlight" USING btree ("_order");
  CREATE INDEX "products_blocks_collection_spotlight_parent_id_idx" ON "products_blocks_collection_spotlight" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_collection_spotlight_path_idx" ON "products_blocks_collection_spotlight" USING btree ("_path");
  CREATE INDEX "products_blocks_collection_spotlight_collection_idx" ON "products_blocks_collection_spotlight" USING btree ("collection_id");
  CREATE INDEX "products_blocks_collection_spotlight_media_idx" ON "products_blocks_collection_spotlight" USING btree ("media_id");
  CREATE UNIQUE INDEX "products_blocks_collection_spotlight_locales_locale_parent_i" ON "products_blocks_collection_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_collection_spotlight_locales_parent_id_idx" ON "products_blocks_collection_spotlight_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_newsletter_order_idx" ON "products_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "products_blocks_newsletter_parent_id_idx" ON "products_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_newsletter_path_idx" ON "products_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "products_blocks_newsletter_media_idx" ON "products_blocks_newsletter" USING btree ("media_id");
  CREATE INDEX "products_blocks_newsletter_form_idx" ON "products_blocks_newsletter" USING btree ("form_id");
  CREATE UNIQUE INDEX "products_blocks_newsletter_locales_locale_parent_id_unique" ON "products_blocks_newsletter_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_newsletter_locales_parent_id_idx" ON "products_blocks_newsletter_locales" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_form_block_order_idx" ON "products_blocks_form_block" USING btree ("_order");
  CREATE INDEX "products_blocks_form_block_parent_id_idx" ON "products_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_form_block_path_idx" ON "products_blocks_form_block" USING btree ("_path");
  CREATE INDEX "products_blocks_form_block_form_idx" ON "products_blocks_form_block" USING btree ("form_id");
  CREATE UNIQUE INDEX "products_blocks_form_block_locales_locale_parent_id_unique" ON "products_blocks_form_block_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_form_block_locales_parent_id_idx" ON "products_blocks_form_block_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_rich_text_order_idx" ON "categories_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "categories_blocks_rich_text_parent_id_idx" ON "categories_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_rich_text_path_idx" ON "categories_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "categories_blocks_rich_text_locales_locale_parent_id_unique" ON "categories_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_rich_text_locales_parent_id_idx" ON "categories_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_media_with_text_links_order_idx" ON "categories_blocks_media_with_text_links" USING btree ("_order");
  CREATE INDEX "categories_blocks_media_with_text_links_parent_id_idx" ON "categories_blocks_media_with_text_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_media_with_text_links_locales_locale_paren" ON "categories_blocks_media_with_text_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_media_with_text_links_locales_parent_i_idx" ON "categories_blocks_media_with_text_links_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_media_with_text_order_idx" ON "categories_blocks_media_with_text" USING btree ("_order");
  CREATE INDEX "categories_blocks_media_with_text_parent_id_idx" ON "categories_blocks_media_with_text" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_media_with_text_path_idx" ON "categories_blocks_media_with_text" USING btree ("_path");
  CREATE INDEX "categories_blocks_media_with_text_media_idx" ON "categories_blocks_media_with_text" USING btree ("media_id");
  CREATE UNIQUE INDEX "categories_blocks_media_with_text_locales_locale_parent_id_u" ON "categories_blocks_media_with_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_media_with_text_locales_parent_id_idx" ON "categories_blocks_media_with_text_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_usp_bar_items_order_idx" ON "categories_blocks_usp_bar_items" USING btree ("_order");
  CREATE INDEX "categories_blocks_usp_bar_items_parent_id_idx" ON "categories_blocks_usp_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_usp_bar_items_locales_locale_parent_id_uni" ON "categories_blocks_usp_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_usp_bar_items_locales_parent_id_idx" ON "categories_blocks_usp_bar_items_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_usp_bar_order_idx" ON "categories_blocks_usp_bar" USING btree ("_order");
  CREATE INDEX "categories_blocks_usp_bar_parent_id_idx" ON "categories_blocks_usp_bar" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_usp_bar_path_idx" ON "categories_blocks_usp_bar" USING btree ("_path");
  CREATE INDEX "categories_blocks_logo_cloud_logos_order_idx" ON "categories_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "categories_blocks_logo_cloud_logos_parent_id_idx" ON "categories_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_logo_cloud_logos_image_idx" ON "categories_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "categories_blocks_logo_cloud_order_idx" ON "categories_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "categories_blocks_logo_cloud_parent_id_idx" ON "categories_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_logo_cloud_path_idx" ON "categories_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "categories_blocks_logo_cloud_locales_locale_parent_id_unique" ON "categories_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_logo_cloud_locales_parent_id_idx" ON "categories_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_faq_items_order_idx" ON "categories_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "categories_blocks_faq_items_parent_id_idx" ON "categories_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_faq_items_locales_locale_parent_id_unique" ON "categories_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_faq_items_locales_parent_id_idx" ON "categories_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_faq_order_idx" ON "categories_blocks_faq" USING btree ("_order");
  CREATE INDEX "categories_blocks_faq_parent_id_idx" ON "categories_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_faq_path_idx" ON "categories_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "categories_blocks_faq_locales_locale_parent_id_unique" ON "categories_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_faq_locales_parent_id_idx" ON "categories_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_testimonials_quotes_order_idx" ON "categories_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "categories_blocks_testimonials_quotes_parent_id_idx" ON "categories_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_testimonials_quotes_avatar_idx" ON "categories_blocks_testimonials_quotes" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "categories_blocks_testimonials_quotes_locales_locale_parent_" ON "categories_blocks_testimonials_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_testimonials_quotes_locales_parent_id_idx" ON "categories_blocks_testimonials_quotes_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_testimonials_order_idx" ON "categories_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "categories_blocks_testimonials_parent_id_idx" ON "categories_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_testimonials_path_idx" ON "categories_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "categories_blocks_testimonials_locales_locale_parent_id_uniq" ON "categories_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_testimonials_locales_parent_id_idx" ON "categories_blocks_testimonials_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_video_captions_order_idx" ON "categories_blocks_video_captions" USING btree ("_order");
  CREATE INDEX "categories_blocks_video_captions_parent_id_idx" ON "categories_blocks_video_captions" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_video_captions_file_idx" ON "categories_blocks_video_captions" USING btree ("file_id");
  CREATE INDEX "categories_blocks_video_order_idx" ON "categories_blocks_video" USING btree ("_order");
  CREATE INDEX "categories_blocks_video_parent_id_idx" ON "categories_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_video_path_idx" ON "categories_blocks_video" USING btree ("_path");
  CREATE INDEX "categories_blocks_video_file_idx" ON "categories_blocks_video" USING btree ("file_id");
  CREATE INDEX "categories_blocks_video_poster_idx" ON "categories_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "categories_blocks_video_locales_locale_parent_id_unique" ON "categories_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_video_locales_parent_id_idx" ON "categories_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_spacer_order_idx" ON "categories_blocks_spacer" USING btree ("_order");
  CREATE INDEX "categories_blocks_spacer_parent_id_idx" ON "categories_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_spacer_path_idx" ON "categories_blocks_spacer" USING btree ("_path");
  CREATE INDEX "categories_blocks_category_showcase_links_order_idx" ON "categories_blocks_category_showcase_links" USING btree ("_order");
  CREATE INDEX "categories_blocks_category_showcase_links_parent_id_idx" ON "categories_blocks_category_showcase_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_category_showcase_links_locales_locale_par" ON "categories_blocks_category_showcase_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_category_showcase_links_locales_parent_idx" ON "categories_blocks_category_showcase_links_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_category_showcase_cs_items_order_idx" ON "categories_blocks_category_showcase_cs_items" USING btree ("_order");
  CREATE INDEX "categories_blocks_category_showcase_cs_items_parent_id_idx" ON "categories_blocks_category_showcase_cs_items" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_category_showcase_cs_items_category_idx" ON "categories_blocks_category_showcase_cs_items" USING btree ("category_id");
  CREATE INDEX "categories_blocks_category_showcase_cs_items_image_idx" ON "categories_blocks_category_showcase_cs_items" USING btree ("image_id");
  CREATE UNIQUE INDEX "categories_blocks_category_showcase_cs_items_locales_locale_" ON "categories_blocks_category_showcase_cs_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_category_showcase_cs_items_locales_par_idx" ON "categories_blocks_category_showcase_cs_items_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_category_showcase_order_idx" ON "categories_blocks_category_showcase" USING btree ("_order");
  CREATE INDEX "categories_blocks_category_showcase_parent_id_idx" ON "categories_blocks_category_showcase" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_category_showcase_path_idx" ON "categories_blocks_category_showcase" USING btree ("_path");
  CREATE INDEX "categories_blocks_category_showcase_category_source_cate_idx" ON "categories_blocks_category_showcase" USING btree ("category_source_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_category_showcase_locales_locale_parent_id" ON "categories_blocks_category_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_category_showcase_locales_parent_id_idx" ON "categories_blocks_category_showcase_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_product_collection_links_order_idx" ON "categories_blocks_product_collection_links" USING btree ("_order");
  CREATE INDEX "categories_blocks_product_collection_links_parent_id_idx" ON "categories_blocks_product_collection_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_product_collection_links_locales_locale_pa" ON "categories_blocks_product_collection_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_product_collection_links_locales_paren_idx" ON "categories_blocks_product_collection_links_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_product_collection_tabs_order_idx" ON "categories_blocks_product_collection_tabs" USING btree ("_order");
  CREATE INDEX "categories_blocks_product_collection_tabs_parent_id_idx" ON "categories_blocks_product_collection_tabs" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_product_collection_tabs_product_source_idx" ON "categories_blocks_product_collection_tabs" USING btree ("product_source_collection_id");
  CREATE INDEX "categories_blocks_product_collection_tabs_product_sour_1_idx" ON "categories_blocks_product_collection_tabs" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "categories_blocks_product_collection_tabs_locales_locale_par" ON "categories_blocks_product_collection_tabs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_product_collection_tabs_locales_parent_idx" ON "categories_blocks_product_collection_tabs_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_product_collection_order_idx" ON "categories_blocks_product_collection" USING btree ("_order");
  CREATE INDEX "categories_blocks_product_collection_parent_id_idx" ON "categories_blocks_product_collection" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_product_collection_path_idx" ON "categories_blocks_product_collection" USING btree ("_path");
  CREATE INDEX "categories_blocks_product_collection_media_idx" ON "categories_blocks_product_collection" USING btree ("media_id");
  CREATE INDEX "categories_blocks_product_collection_product_source_prod_idx" ON "categories_blocks_product_collection" USING btree ("product_source_collection_id");
  CREATE INDEX "categories_blocks_product_collection_product_source_pr_1_idx" ON "categories_blocks_product_collection" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "categories_blocks_product_collection_locales_locale_parent_i" ON "categories_blocks_product_collection_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_product_collection_locales_parent_id_idx" ON "categories_blocks_product_collection_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_featured_product_order_idx" ON "categories_blocks_featured_product" USING btree ("_order");
  CREATE INDEX "categories_blocks_featured_product_parent_id_idx" ON "categories_blocks_featured_product" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_featured_product_path_idx" ON "categories_blocks_featured_product" USING btree ("_path");
  CREATE INDEX "categories_blocks_featured_product_product_idx" ON "categories_blocks_featured_product" USING btree ("product_id");
  CREATE INDEX "categories_blocks_featured_product_media_idx" ON "categories_blocks_featured_product" USING btree ("media_id");
  CREATE UNIQUE INDEX "categories_blocks_featured_product_locales_locale_parent_id_" ON "categories_blocks_featured_product_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_featured_product_locales_parent_id_idx" ON "categories_blocks_featured_product_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_bundle_order_idx" ON "categories_blocks_bundle" USING btree ("_order");
  CREATE INDEX "categories_blocks_bundle_parent_id_idx" ON "categories_blocks_bundle" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_bundle_path_idx" ON "categories_blocks_bundle" USING btree ("_path");
  CREATE UNIQUE INDEX "categories_blocks_bundle_locales_locale_parent_id_unique" ON "categories_blocks_bundle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_bundle_locales_parent_id_idx" ON "categories_blocks_bundle_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_promo_banner_links_order_idx" ON "categories_blocks_promo_banner_links" USING btree ("_order");
  CREATE INDEX "categories_blocks_promo_banner_links_parent_id_idx" ON "categories_blocks_promo_banner_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_promo_banner_links_locales_locale_parent_i" ON "categories_blocks_promo_banner_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_promo_banner_links_locales_parent_id_idx" ON "categories_blocks_promo_banner_links_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_promo_banner_order_idx" ON "categories_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "categories_blocks_promo_banner_parent_id_idx" ON "categories_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_promo_banner_path_idx" ON "categories_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "categories_blocks_promo_banner_media_idx" ON "categories_blocks_promo_banner" USING btree ("media_id");
  CREATE UNIQUE INDEX "categories_blocks_promo_banner_locales_locale_parent_id_uniq" ON "categories_blocks_promo_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_promo_banner_locales_parent_id_idx" ON "categories_blocks_promo_banner_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_comparison_rows_order_idx" ON "categories_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "categories_blocks_comparison_rows_parent_id_idx" ON "categories_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_blocks_comparison_rows_locales_locale_parent_id_u" ON "categories_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_comparison_rows_locales_parent_id_idx" ON "categories_blocks_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_comparison_order_idx" ON "categories_blocks_comparison" USING btree ("_order");
  CREATE INDEX "categories_blocks_comparison_parent_id_idx" ON "categories_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_comparison_path_idx" ON "categories_blocks_comparison" USING btree ("_path");
  CREATE INDEX "categories_blocks_comparison_pick_idx" ON "categories_blocks_comparison" USING btree ("pick_id");
  CREATE UNIQUE INDEX "categories_blocks_comparison_locales_locale_parent_id_unique" ON "categories_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_comparison_locales_parent_id_idx" ON "categories_blocks_comparison_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_collection_spotlight_order_idx" ON "categories_blocks_collection_spotlight" USING btree ("_order");
  CREATE INDEX "categories_blocks_collection_spotlight_parent_id_idx" ON "categories_blocks_collection_spotlight" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_collection_spotlight_path_idx" ON "categories_blocks_collection_spotlight" USING btree ("_path");
  CREATE INDEX "categories_blocks_collection_spotlight_collection_idx" ON "categories_blocks_collection_spotlight" USING btree ("collection_id");
  CREATE INDEX "categories_blocks_collection_spotlight_media_idx" ON "categories_blocks_collection_spotlight" USING btree ("media_id");
  CREATE UNIQUE INDEX "categories_blocks_collection_spotlight_locales_locale_parent" ON "categories_blocks_collection_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_collection_spotlight_locales_parent_id_idx" ON "categories_blocks_collection_spotlight_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_newsletter_order_idx" ON "categories_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "categories_blocks_newsletter_parent_id_idx" ON "categories_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_newsletter_path_idx" ON "categories_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "categories_blocks_newsletter_media_idx" ON "categories_blocks_newsletter" USING btree ("media_id");
  CREATE INDEX "categories_blocks_newsletter_form_idx" ON "categories_blocks_newsletter" USING btree ("form_id");
  CREATE UNIQUE INDEX "categories_blocks_newsletter_locales_locale_parent_id_unique" ON "categories_blocks_newsletter_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_newsletter_locales_parent_id_idx" ON "categories_blocks_newsletter_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_form_block_order_idx" ON "categories_blocks_form_block" USING btree ("_order");
  CREATE INDEX "categories_blocks_form_block_parent_id_idx" ON "categories_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "categories_blocks_form_block_path_idx" ON "categories_blocks_form_block" USING btree ("_path");
  CREATE INDEX "categories_blocks_form_block_form_idx" ON "categories_blocks_form_block" USING btree ("form_id");
  CREATE UNIQUE INDEX "categories_blocks_form_block_locales_locale_parent_id_unique" ON "categories_blocks_form_block_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_blocks_form_block_locales_parent_id_idx" ON "categories_blocks_form_block_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_rels_order_idx" ON "categories_rels" USING btree ("order");
  CREATE INDEX "categories_rels_parent_idx" ON "categories_rels" USING btree ("parent_id");
  CREATE INDEX "categories_rels_path_idx" ON "categories_rels" USING btree ("path");
  CREATE INDEX "categories_rels_categories_id_idx" ON "categories_rels" USING btree ("categories_id");
  CREATE INDEX "categories_rels_collections_id_idx" ON "categories_rels" USING btree ("collections_id");
  CREATE INDEX "categories_rels_products_id_idx" ON "categories_rels" USING btree ("products_id");
  CREATE INDEX "collections_blocks_rich_text_order_idx" ON "collections_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "collections_blocks_rich_text_parent_id_idx" ON "collections_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_rich_text_path_idx" ON "collections_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "collections_blocks_rich_text_locales_locale_parent_id_unique" ON "collections_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_rich_text_locales_parent_id_idx" ON "collections_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_media_with_text_links_order_idx" ON "collections_blocks_media_with_text_links" USING btree ("_order");
  CREATE INDEX "collections_blocks_media_with_text_links_parent_id_idx" ON "collections_blocks_media_with_text_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_media_with_text_links_locales_locale_pare" ON "collections_blocks_media_with_text_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_media_with_text_links_locales_parent__idx" ON "collections_blocks_media_with_text_links_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_media_with_text_order_idx" ON "collections_blocks_media_with_text" USING btree ("_order");
  CREATE INDEX "collections_blocks_media_with_text_parent_id_idx" ON "collections_blocks_media_with_text" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_media_with_text_path_idx" ON "collections_blocks_media_with_text" USING btree ("_path");
  CREATE INDEX "collections_blocks_media_with_text_media_idx" ON "collections_blocks_media_with_text" USING btree ("media_id");
  CREATE UNIQUE INDEX "collections_blocks_media_with_text_locales_locale_parent_id_" ON "collections_blocks_media_with_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_media_with_text_locales_parent_id_idx" ON "collections_blocks_media_with_text_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_usp_bar_items_order_idx" ON "collections_blocks_usp_bar_items" USING btree ("_order");
  CREATE INDEX "collections_blocks_usp_bar_items_parent_id_idx" ON "collections_blocks_usp_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_usp_bar_items_locales_locale_parent_id_un" ON "collections_blocks_usp_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_usp_bar_items_locales_parent_id_idx" ON "collections_blocks_usp_bar_items_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_usp_bar_order_idx" ON "collections_blocks_usp_bar" USING btree ("_order");
  CREATE INDEX "collections_blocks_usp_bar_parent_id_idx" ON "collections_blocks_usp_bar" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_usp_bar_path_idx" ON "collections_blocks_usp_bar" USING btree ("_path");
  CREATE INDEX "collections_blocks_logo_cloud_logos_order_idx" ON "collections_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "collections_blocks_logo_cloud_logos_parent_id_idx" ON "collections_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_logo_cloud_logos_image_idx" ON "collections_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "collections_blocks_logo_cloud_order_idx" ON "collections_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "collections_blocks_logo_cloud_parent_id_idx" ON "collections_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_logo_cloud_path_idx" ON "collections_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "collections_blocks_logo_cloud_locales_locale_parent_id_uniqu" ON "collections_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_logo_cloud_locales_parent_id_idx" ON "collections_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_faq_items_order_idx" ON "collections_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "collections_blocks_faq_items_parent_id_idx" ON "collections_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_faq_items_locales_locale_parent_id_unique" ON "collections_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_faq_items_locales_parent_id_idx" ON "collections_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_faq_order_idx" ON "collections_blocks_faq" USING btree ("_order");
  CREATE INDEX "collections_blocks_faq_parent_id_idx" ON "collections_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_faq_path_idx" ON "collections_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "collections_blocks_faq_locales_locale_parent_id_unique" ON "collections_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_faq_locales_parent_id_idx" ON "collections_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_testimonials_quotes_order_idx" ON "collections_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "collections_blocks_testimonials_quotes_parent_id_idx" ON "collections_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_testimonials_quotes_avatar_idx" ON "collections_blocks_testimonials_quotes" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "collections_blocks_testimonials_quotes_locales_locale_parent" ON "collections_blocks_testimonials_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_testimonials_quotes_locales_parent_id_idx" ON "collections_blocks_testimonials_quotes_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_testimonials_order_idx" ON "collections_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "collections_blocks_testimonials_parent_id_idx" ON "collections_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_testimonials_path_idx" ON "collections_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "collections_blocks_testimonials_locales_locale_parent_id_uni" ON "collections_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_testimonials_locales_parent_id_idx" ON "collections_blocks_testimonials_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_video_captions_order_idx" ON "collections_blocks_video_captions" USING btree ("_order");
  CREATE INDEX "collections_blocks_video_captions_parent_id_idx" ON "collections_blocks_video_captions" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_video_captions_file_idx" ON "collections_blocks_video_captions" USING btree ("file_id");
  CREATE INDEX "collections_blocks_video_order_idx" ON "collections_blocks_video" USING btree ("_order");
  CREATE INDEX "collections_blocks_video_parent_id_idx" ON "collections_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_video_path_idx" ON "collections_blocks_video" USING btree ("_path");
  CREATE INDEX "collections_blocks_video_file_idx" ON "collections_blocks_video" USING btree ("file_id");
  CREATE INDEX "collections_blocks_video_poster_idx" ON "collections_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "collections_blocks_video_locales_locale_parent_id_unique" ON "collections_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_video_locales_parent_id_idx" ON "collections_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_spacer_order_idx" ON "collections_blocks_spacer" USING btree ("_order");
  CREATE INDEX "collections_blocks_spacer_parent_id_idx" ON "collections_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_spacer_path_idx" ON "collections_blocks_spacer" USING btree ("_path");
  CREATE INDEX "collections_blocks_category_showcase_links_order_idx" ON "collections_blocks_category_showcase_links" USING btree ("_order");
  CREATE INDEX "collections_blocks_category_showcase_links_parent_id_idx" ON "collections_blocks_category_showcase_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_category_showcase_links_locales_locale_pa" ON "collections_blocks_category_showcase_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_category_showcase_links_locales_paren_idx" ON "collections_blocks_category_showcase_links_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_category_showcase_cs_items_order_idx" ON "collections_blocks_category_showcase_cs_items" USING btree ("_order");
  CREATE INDEX "collections_blocks_category_showcase_cs_items_parent_id_idx" ON "collections_blocks_category_showcase_cs_items" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_category_showcase_cs_items_category_idx" ON "collections_blocks_category_showcase_cs_items" USING btree ("category_id");
  CREATE INDEX "collections_blocks_category_showcase_cs_items_image_idx" ON "collections_blocks_category_showcase_cs_items" USING btree ("image_id");
  CREATE UNIQUE INDEX "collections_blocks_category_showcase_cs_items_locales_locale" ON "collections_blocks_category_showcase_cs_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_category_showcase_cs_items_locales_pa_idx" ON "collections_blocks_category_showcase_cs_items_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_category_showcase_order_idx" ON "collections_blocks_category_showcase" USING btree ("_order");
  CREATE INDEX "collections_blocks_category_showcase_parent_id_idx" ON "collections_blocks_category_showcase" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_category_showcase_path_idx" ON "collections_blocks_category_showcase" USING btree ("_path");
  CREATE INDEX "collections_blocks_category_showcase_category_source_cat_idx" ON "collections_blocks_category_showcase" USING btree ("category_source_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_category_showcase_locales_locale_parent_i" ON "collections_blocks_category_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_category_showcase_locales_parent_id_idx" ON "collections_blocks_category_showcase_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_product_collection_links_order_idx" ON "collections_blocks_product_collection_links" USING btree ("_order");
  CREATE INDEX "collections_blocks_product_collection_links_parent_id_idx" ON "collections_blocks_product_collection_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_product_collection_links_locales_locale_p" ON "collections_blocks_product_collection_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_product_collection_links_locales_pare_idx" ON "collections_blocks_product_collection_links_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_product_collection_tabs_order_idx" ON "collections_blocks_product_collection_tabs" USING btree ("_order");
  CREATE INDEX "collections_blocks_product_collection_tabs_parent_id_idx" ON "collections_blocks_product_collection_tabs" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_product_collection_tabs_product_sourc_idx" ON "collections_blocks_product_collection_tabs" USING btree ("product_source_collection_id");
  CREATE INDEX "collections_blocks_product_collection_tabs_product_sou_1_idx" ON "collections_blocks_product_collection_tabs" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "collections_blocks_product_collection_tabs_locales_locale_pa" ON "collections_blocks_product_collection_tabs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_product_collection_tabs_locales_paren_idx" ON "collections_blocks_product_collection_tabs_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_product_collection_order_idx" ON "collections_blocks_product_collection" USING btree ("_order");
  CREATE INDEX "collections_blocks_product_collection_parent_id_idx" ON "collections_blocks_product_collection" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_product_collection_path_idx" ON "collections_blocks_product_collection" USING btree ("_path");
  CREATE INDEX "collections_blocks_product_collection_media_idx" ON "collections_blocks_product_collection" USING btree ("media_id");
  CREATE INDEX "collections_blocks_product_collection_product_source_pro_idx" ON "collections_blocks_product_collection" USING btree ("product_source_collection_id");
  CREATE INDEX "collections_blocks_product_collection_product_source_p_1_idx" ON "collections_blocks_product_collection" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "collections_blocks_product_collection_locales_locale_parent_" ON "collections_blocks_product_collection_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_product_collection_locales_parent_id_idx" ON "collections_blocks_product_collection_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_featured_product_order_idx" ON "collections_blocks_featured_product" USING btree ("_order");
  CREATE INDEX "collections_blocks_featured_product_parent_id_idx" ON "collections_blocks_featured_product" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_featured_product_path_idx" ON "collections_blocks_featured_product" USING btree ("_path");
  CREATE INDEX "collections_blocks_featured_product_product_idx" ON "collections_blocks_featured_product" USING btree ("product_id");
  CREATE INDEX "collections_blocks_featured_product_media_idx" ON "collections_blocks_featured_product" USING btree ("media_id");
  CREATE UNIQUE INDEX "collections_blocks_featured_product_locales_locale_parent_id" ON "collections_blocks_featured_product_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_featured_product_locales_parent_id_idx" ON "collections_blocks_featured_product_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_bundle_order_idx" ON "collections_blocks_bundle" USING btree ("_order");
  CREATE INDEX "collections_blocks_bundle_parent_id_idx" ON "collections_blocks_bundle" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_bundle_path_idx" ON "collections_blocks_bundle" USING btree ("_path");
  CREATE UNIQUE INDEX "collections_blocks_bundle_locales_locale_parent_id_unique" ON "collections_blocks_bundle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_bundle_locales_parent_id_idx" ON "collections_blocks_bundle_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_promo_banner_links_order_idx" ON "collections_blocks_promo_banner_links" USING btree ("_order");
  CREATE INDEX "collections_blocks_promo_banner_links_parent_id_idx" ON "collections_blocks_promo_banner_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_promo_banner_links_locales_locale_parent_" ON "collections_blocks_promo_banner_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_promo_banner_links_locales_parent_id_idx" ON "collections_blocks_promo_banner_links_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_promo_banner_order_idx" ON "collections_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "collections_blocks_promo_banner_parent_id_idx" ON "collections_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_promo_banner_path_idx" ON "collections_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "collections_blocks_promo_banner_media_idx" ON "collections_blocks_promo_banner" USING btree ("media_id");
  CREATE UNIQUE INDEX "collections_blocks_promo_banner_locales_locale_parent_id_uni" ON "collections_blocks_promo_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_promo_banner_locales_parent_id_idx" ON "collections_blocks_promo_banner_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_comparison_rows_order_idx" ON "collections_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "collections_blocks_comparison_rows_parent_id_idx" ON "collections_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "collections_blocks_comparison_rows_locales_locale_parent_id_" ON "collections_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_comparison_rows_locales_parent_id_idx" ON "collections_blocks_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_comparison_order_idx" ON "collections_blocks_comparison" USING btree ("_order");
  CREATE INDEX "collections_blocks_comparison_parent_id_idx" ON "collections_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_comparison_path_idx" ON "collections_blocks_comparison" USING btree ("_path");
  CREATE INDEX "collections_blocks_comparison_pick_idx" ON "collections_blocks_comparison" USING btree ("pick_id");
  CREATE UNIQUE INDEX "collections_blocks_comparison_locales_locale_parent_id_uniqu" ON "collections_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_comparison_locales_parent_id_idx" ON "collections_blocks_comparison_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_collection_spotlight_order_idx" ON "collections_blocks_collection_spotlight" USING btree ("_order");
  CREATE INDEX "collections_blocks_collection_spotlight_parent_id_idx" ON "collections_blocks_collection_spotlight" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_collection_spotlight_path_idx" ON "collections_blocks_collection_spotlight" USING btree ("_path");
  CREATE INDEX "collections_blocks_collection_spotlight_collection_idx" ON "collections_blocks_collection_spotlight" USING btree ("collection_id");
  CREATE INDEX "collections_blocks_collection_spotlight_media_idx" ON "collections_blocks_collection_spotlight" USING btree ("media_id");
  CREATE UNIQUE INDEX "collections_blocks_collection_spotlight_locales_locale_paren" ON "collections_blocks_collection_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_collection_spotlight_locales_parent_i_idx" ON "collections_blocks_collection_spotlight_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_newsletter_order_idx" ON "collections_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "collections_blocks_newsletter_parent_id_idx" ON "collections_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_newsletter_path_idx" ON "collections_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "collections_blocks_newsletter_media_idx" ON "collections_blocks_newsletter" USING btree ("media_id");
  CREATE INDEX "collections_blocks_newsletter_form_idx" ON "collections_blocks_newsletter" USING btree ("form_id");
  CREATE UNIQUE INDEX "collections_blocks_newsletter_locales_locale_parent_id_uniqu" ON "collections_blocks_newsletter_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_newsletter_locales_parent_id_idx" ON "collections_blocks_newsletter_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_form_block_order_idx" ON "collections_blocks_form_block" USING btree ("_order");
  CREATE INDEX "collections_blocks_form_block_parent_id_idx" ON "collections_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "collections_blocks_form_block_path_idx" ON "collections_blocks_form_block" USING btree ("_path");
  CREATE INDEX "collections_blocks_form_block_form_idx" ON "collections_blocks_form_block" USING btree ("form_id");
  CREATE UNIQUE INDEX "collections_blocks_form_block_locales_locale_parent_id_uniqu" ON "collections_blocks_form_block_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_blocks_form_block_locales_parent_id_idx" ON "collections_blocks_form_block_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_rels_order_idx" ON "collections_rels" USING btree ("order");
  CREATE INDEX "collections_rels_parent_idx" ON "collections_rels" USING btree ("parent_id");
  CREATE INDEX "collections_rels_path_idx" ON "collections_rels" USING btree ("path");
  CREATE INDEX "collections_rels_categories_id_idx" ON "collections_rels" USING btree ("categories_id");
  CREATE INDEX "collections_rels_collections_id_idx" ON "collections_rels" USING btree ("collections_id");
  CREATE INDEX "collections_rels_products_id_idx" ON "collections_rels" USING btree ("products_id");
  CREATE INDEX "templates_blocks_rich_text_order_idx" ON "templates_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "templates_blocks_rich_text_parent_id_idx" ON "templates_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_rich_text_path_idx" ON "templates_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "templates_blocks_rich_text_locales_locale_parent_id_unique" ON "templates_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_rich_text_locales_parent_id_idx" ON "templates_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_media_with_text_links_order_idx" ON "templates_blocks_media_with_text_links" USING btree ("_order");
  CREATE INDEX "templates_blocks_media_with_text_links_parent_id_idx" ON "templates_blocks_media_with_text_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_media_with_text_links_locales_locale_parent" ON "templates_blocks_media_with_text_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_media_with_text_links_locales_parent_id_idx" ON "templates_blocks_media_with_text_links_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_media_with_text_order_idx" ON "templates_blocks_media_with_text" USING btree ("_order");
  CREATE INDEX "templates_blocks_media_with_text_parent_id_idx" ON "templates_blocks_media_with_text" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_media_with_text_path_idx" ON "templates_blocks_media_with_text" USING btree ("_path");
  CREATE INDEX "templates_blocks_media_with_text_media_idx" ON "templates_blocks_media_with_text" USING btree ("media_id");
  CREATE UNIQUE INDEX "templates_blocks_media_with_text_locales_locale_parent_id_un" ON "templates_blocks_media_with_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_media_with_text_locales_parent_id_idx" ON "templates_blocks_media_with_text_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_usp_bar_items_order_idx" ON "templates_blocks_usp_bar_items" USING btree ("_order");
  CREATE INDEX "templates_blocks_usp_bar_items_parent_id_idx" ON "templates_blocks_usp_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_usp_bar_items_locales_locale_parent_id_uniq" ON "templates_blocks_usp_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_usp_bar_items_locales_parent_id_idx" ON "templates_blocks_usp_bar_items_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_usp_bar_order_idx" ON "templates_blocks_usp_bar" USING btree ("_order");
  CREATE INDEX "templates_blocks_usp_bar_parent_id_idx" ON "templates_blocks_usp_bar" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_usp_bar_path_idx" ON "templates_blocks_usp_bar" USING btree ("_path");
  CREATE INDEX "templates_blocks_logo_cloud_logos_order_idx" ON "templates_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "templates_blocks_logo_cloud_logos_parent_id_idx" ON "templates_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_logo_cloud_logos_image_idx" ON "templates_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "templates_blocks_logo_cloud_order_idx" ON "templates_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "templates_blocks_logo_cloud_parent_id_idx" ON "templates_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_logo_cloud_path_idx" ON "templates_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "templates_blocks_logo_cloud_locales_locale_parent_id_unique" ON "templates_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_logo_cloud_locales_parent_id_idx" ON "templates_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_faq_items_order_idx" ON "templates_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "templates_blocks_faq_items_parent_id_idx" ON "templates_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_faq_items_locales_locale_parent_id_unique" ON "templates_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_faq_items_locales_parent_id_idx" ON "templates_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_faq_order_idx" ON "templates_blocks_faq" USING btree ("_order");
  CREATE INDEX "templates_blocks_faq_parent_id_idx" ON "templates_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_faq_path_idx" ON "templates_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "templates_blocks_faq_locales_locale_parent_id_unique" ON "templates_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_faq_locales_parent_id_idx" ON "templates_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_testimonials_quotes_order_idx" ON "templates_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "templates_blocks_testimonials_quotes_parent_id_idx" ON "templates_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_testimonials_quotes_avatar_idx" ON "templates_blocks_testimonials_quotes" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "templates_blocks_testimonials_quotes_locales_locale_parent_i" ON "templates_blocks_testimonials_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_testimonials_quotes_locales_parent_id_idx" ON "templates_blocks_testimonials_quotes_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_testimonials_order_idx" ON "templates_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "templates_blocks_testimonials_parent_id_idx" ON "templates_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_testimonials_path_idx" ON "templates_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "templates_blocks_testimonials_locales_locale_parent_id_uniqu" ON "templates_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_testimonials_locales_parent_id_idx" ON "templates_blocks_testimonials_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_video_captions_order_idx" ON "templates_blocks_video_captions" USING btree ("_order");
  CREATE INDEX "templates_blocks_video_captions_parent_id_idx" ON "templates_blocks_video_captions" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_video_captions_file_idx" ON "templates_blocks_video_captions" USING btree ("file_id");
  CREATE INDEX "templates_blocks_video_order_idx" ON "templates_blocks_video" USING btree ("_order");
  CREATE INDEX "templates_blocks_video_parent_id_idx" ON "templates_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_video_path_idx" ON "templates_blocks_video" USING btree ("_path");
  CREATE INDEX "templates_blocks_video_file_idx" ON "templates_blocks_video" USING btree ("file_id");
  CREATE INDEX "templates_blocks_video_poster_idx" ON "templates_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "templates_blocks_video_locales_locale_parent_id_unique" ON "templates_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_video_locales_parent_id_idx" ON "templates_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_spacer_order_idx" ON "templates_blocks_spacer" USING btree ("_order");
  CREATE INDEX "templates_blocks_spacer_parent_id_idx" ON "templates_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_spacer_path_idx" ON "templates_blocks_spacer" USING btree ("_path");
  CREATE INDEX "templates_blocks_category_showcase_links_order_idx" ON "templates_blocks_category_showcase_links" USING btree ("_order");
  CREATE INDEX "templates_blocks_category_showcase_links_parent_id_idx" ON "templates_blocks_category_showcase_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_category_showcase_links_locales_locale_pare" ON "templates_blocks_category_showcase_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_category_showcase_links_locales_parent__idx" ON "templates_blocks_category_showcase_links_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_category_showcase_cs_items_order_idx" ON "templates_blocks_category_showcase_cs_items" USING btree ("_order");
  CREATE INDEX "templates_blocks_category_showcase_cs_items_parent_id_idx" ON "templates_blocks_category_showcase_cs_items" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_category_showcase_cs_items_category_idx" ON "templates_blocks_category_showcase_cs_items" USING btree ("category_id");
  CREATE INDEX "templates_blocks_category_showcase_cs_items_image_idx" ON "templates_blocks_category_showcase_cs_items" USING btree ("image_id");
  CREATE UNIQUE INDEX "templates_blocks_category_showcase_cs_items_locales_locale_p" ON "templates_blocks_category_showcase_cs_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_category_showcase_cs_items_locales_pare_idx" ON "templates_blocks_category_showcase_cs_items_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_category_showcase_order_idx" ON "templates_blocks_category_showcase" USING btree ("_order");
  CREATE INDEX "templates_blocks_category_showcase_parent_id_idx" ON "templates_blocks_category_showcase" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_category_showcase_path_idx" ON "templates_blocks_category_showcase" USING btree ("_path");
  CREATE INDEX "templates_blocks_category_showcase_category_source_categ_idx" ON "templates_blocks_category_showcase" USING btree ("category_source_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_category_showcase_locales_locale_parent_id_" ON "templates_blocks_category_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_category_showcase_locales_parent_id_idx" ON "templates_blocks_category_showcase_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_product_collection_links_order_idx" ON "templates_blocks_product_collection_links" USING btree ("_order");
  CREATE INDEX "templates_blocks_product_collection_links_parent_id_idx" ON "templates_blocks_product_collection_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_product_collection_links_locales_locale_par" ON "templates_blocks_product_collection_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_product_collection_links_locales_parent_idx" ON "templates_blocks_product_collection_links_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_product_collection_tabs_order_idx" ON "templates_blocks_product_collection_tabs" USING btree ("_order");
  CREATE INDEX "templates_blocks_product_collection_tabs_parent_id_idx" ON "templates_blocks_product_collection_tabs" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_product_collection_tabs_product_source__idx" ON "templates_blocks_product_collection_tabs" USING btree ("product_source_collection_id");
  CREATE INDEX "templates_blocks_product_collection_tabs_product_sourc_1_idx" ON "templates_blocks_product_collection_tabs" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "templates_blocks_product_collection_tabs_locales_locale_pare" ON "templates_blocks_product_collection_tabs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_product_collection_tabs_locales_parent__idx" ON "templates_blocks_product_collection_tabs_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_product_collection_order_idx" ON "templates_blocks_product_collection" USING btree ("_order");
  CREATE INDEX "templates_blocks_product_collection_parent_id_idx" ON "templates_blocks_product_collection" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_product_collection_path_idx" ON "templates_blocks_product_collection" USING btree ("_path");
  CREATE INDEX "templates_blocks_product_collection_media_idx" ON "templates_blocks_product_collection" USING btree ("media_id");
  CREATE INDEX "templates_blocks_product_collection_product_source_produ_idx" ON "templates_blocks_product_collection" USING btree ("product_source_collection_id");
  CREATE INDEX "templates_blocks_product_collection_product_source_pro_1_idx" ON "templates_blocks_product_collection" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "templates_blocks_product_collection_locales_locale_parent_id" ON "templates_blocks_product_collection_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_product_collection_locales_parent_id_idx" ON "templates_blocks_product_collection_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_featured_product_order_idx" ON "templates_blocks_featured_product" USING btree ("_order");
  CREATE INDEX "templates_blocks_featured_product_parent_id_idx" ON "templates_blocks_featured_product" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_featured_product_path_idx" ON "templates_blocks_featured_product" USING btree ("_path");
  CREATE INDEX "templates_blocks_featured_product_product_idx" ON "templates_blocks_featured_product" USING btree ("product_id");
  CREATE INDEX "templates_blocks_featured_product_media_idx" ON "templates_blocks_featured_product" USING btree ("media_id");
  CREATE UNIQUE INDEX "templates_blocks_featured_product_locales_locale_parent_id_u" ON "templates_blocks_featured_product_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_featured_product_locales_parent_id_idx" ON "templates_blocks_featured_product_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_bundle_order_idx" ON "templates_blocks_bundle" USING btree ("_order");
  CREATE INDEX "templates_blocks_bundle_parent_id_idx" ON "templates_blocks_bundle" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_bundle_path_idx" ON "templates_blocks_bundle" USING btree ("_path");
  CREATE UNIQUE INDEX "templates_blocks_bundle_locales_locale_parent_id_unique" ON "templates_blocks_bundle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_bundle_locales_parent_id_idx" ON "templates_blocks_bundle_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_promo_banner_links_order_idx" ON "templates_blocks_promo_banner_links" USING btree ("_order");
  CREATE INDEX "templates_blocks_promo_banner_links_parent_id_idx" ON "templates_blocks_promo_banner_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_promo_banner_links_locales_locale_parent_id" ON "templates_blocks_promo_banner_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_promo_banner_links_locales_parent_id_idx" ON "templates_blocks_promo_banner_links_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_promo_banner_order_idx" ON "templates_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "templates_blocks_promo_banner_parent_id_idx" ON "templates_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_promo_banner_path_idx" ON "templates_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "templates_blocks_promo_banner_media_idx" ON "templates_blocks_promo_banner" USING btree ("media_id");
  CREATE UNIQUE INDEX "templates_blocks_promo_banner_locales_locale_parent_id_uniqu" ON "templates_blocks_promo_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_promo_banner_locales_parent_id_idx" ON "templates_blocks_promo_banner_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_comparison_rows_order_idx" ON "templates_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "templates_blocks_comparison_rows_parent_id_idx" ON "templates_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "templates_blocks_comparison_rows_locales_locale_parent_id_un" ON "templates_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_comparison_rows_locales_parent_id_idx" ON "templates_blocks_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_comparison_order_idx" ON "templates_blocks_comparison" USING btree ("_order");
  CREATE INDEX "templates_blocks_comparison_parent_id_idx" ON "templates_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_comparison_path_idx" ON "templates_blocks_comparison" USING btree ("_path");
  CREATE INDEX "templates_blocks_comparison_pick_idx" ON "templates_blocks_comparison" USING btree ("pick_id");
  CREATE UNIQUE INDEX "templates_blocks_comparison_locales_locale_parent_id_unique" ON "templates_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_comparison_locales_parent_id_idx" ON "templates_blocks_comparison_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_collection_spotlight_order_idx" ON "templates_blocks_collection_spotlight" USING btree ("_order");
  CREATE INDEX "templates_blocks_collection_spotlight_parent_id_idx" ON "templates_blocks_collection_spotlight" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_collection_spotlight_path_idx" ON "templates_blocks_collection_spotlight" USING btree ("_path");
  CREATE INDEX "templates_blocks_collection_spotlight_collection_idx" ON "templates_blocks_collection_spotlight" USING btree ("collection_id");
  CREATE INDEX "templates_blocks_collection_spotlight_media_idx" ON "templates_blocks_collection_spotlight" USING btree ("media_id");
  CREATE UNIQUE INDEX "templates_blocks_collection_spotlight_locales_locale_parent_" ON "templates_blocks_collection_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_collection_spotlight_locales_parent_id_idx" ON "templates_blocks_collection_spotlight_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_newsletter_order_idx" ON "templates_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "templates_blocks_newsletter_parent_id_idx" ON "templates_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_newsletter_path_idx" ON "templates_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "templates_blocks_newsletter_media_idx" ON "templates_blocks_newsletter" USING btree ("media_id");
  CREATE INDEX "templates_blocks_newsletter_form_idx" ON "templates_blocks_newsletter" USING btree ("form_id");
  CREATE UNIQUE INDEX "templates_blocks_newsletter_locales_locale_parent_id_unique" ON "templates_blocks_newsletter_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_newsletter_locales_parent_id_idx" ON "templates_blocks_newsletter_locales" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_form_block_order_idx" ON "templates_blocks_form_block" USING btree ("_order");
  CREATE INDEX "templates_blocks_form_block_parent_id_idx" ON "templates_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "templates_blocks_form_block_path_idx" ON "templates_blocks_form_block" USING btree ("_path");
  CREATE INDEX "templates_blocks_form_block_form_idx" ON "templates_blocks_form_block" USING btree ("form_id");
  CREATE UNIQUE INDEX "templates_blocks_form_block_locales_locale_parent_id_unique" ON "templates_blocks_form_block_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "templates_blocks_form_block_locales_parent_id_idx" ON "templates_blocks_form_block_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_rich_text_order_idx" ON "_templates_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_rich_text_parent_id_idx" ON "_templates_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_rich_text_path_idx" ON "_templates_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_templates_v_blocks_rich_text_locales_locale_parent_id_uniqu" ON "_templates_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_rich_text_locales_parent_id_idx" ON "_templates_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_media_with_text_links_order_idx" ON "_templates_v_blocks_media_with_text_links" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_media_with_text_links_parent_id_idx" ON "_templates_v_blocks_media_with_text_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_media_with_text_links_locales_locale_par" ON "_templates_v_blocks_media_with_text_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_media_with_text_links_locales_parent_idx" ON "_templates_v_blocks_media_with_text_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_media_with_text_order_idx" ON "_templates_v_blocks_media_with_text" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_media_with_text_parent_id_idx" ON "_templates_v_blocks_media_with_text" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_media_with_text_path_idx" ON "_templates_v_blocks_media_with_text" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_media_with_text_media_idx" ON "_templates_v_blocks_media_with_text" USING btree ("media_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_media_with_text_locales_locale_parent_id" ON "_templates_v_blocks_media_with_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_media_with_text_locales_parent_id_idx" ON "_templates_v_blocks_media_with_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_usp_bar_items_order_idx" ON "_templates_v_blocks_usp_bar_items" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_usp_bar_items_parent_id_idx" ON "_templates_v_blocks_usp_bar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_usp_bar_items_locales_locale_parent_id_u" ON "_templates_v_blocks_usp_bar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_usp_bar_items_locales_parent_id_idx" ON "_templates_v_blocks_usp_bar_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_usp_bar_order_idx" ON "_templates_v_blocks_usp_bar" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_usp_bar_parent_id_idx" ON "_templates_v_blocks_usp_bar" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_usp_bar_path_idx" ON "_templates_v_blocks_usp_bar" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_logo_cloud_logos_order_idx" ON "_templates_v_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_logo_cloud_logos_parent_id_idx" ON "_templates_v_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_logo_cloud_logos_image_idx" ON "_templates_v_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "_templates_v_blocks_logo_cloud_order_idx" ON "_templates_v_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_logo_cloud_parent_id_idx" ON "_templates_v_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_logo_cloud_path_idx" ON "_templates_v_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "_templates_v_blocks_logo_cloud_locales_locale_parent_id_uniq" ON "_templates_v_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_logo_cloud_locales_parent_id_idx" ON "_templates_v_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_faq_items_order_idx" ON "_templates_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_faq_items_parent_id_idx" ON "_templates_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_faq_items_locales_locale_parent_id_uniqu" ON "_templates_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_faq_items_locales_parent_id_idx" ON "_templates_v_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_faq_order_idx" ON "_templates_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_faq_parent_id_idx" ON "_templates_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_faq_path_idx" ON "_templates_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_templates_v_blocks_faq_locales_locale_parent_id_unique" ON "_templates_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_faq_locales_parent_id_idx" ON "_templates_v_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_testimonials_quotes_order_idx" ON "_templates_v_blocks_testimonials_quotes" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_testimonials_quotes_parent_id_idx" ON "_templates_v_blocks_testimonials_quotes" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_testimonials_quotes_avatar_idx" ON "_templates_v_blocks_testimonials_quotes" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_testimonials_quotes_locales_locale_paren" ON "_templates_v_blocks_testimonials_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_testimonials_quotes_locales_parent_i_idx" ON "_templates_v_blocks_testimonials_quotes_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_testimonials_order_idx" ON "_templates_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_testimonials_parent_id_idx" ON "_templates_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_testimonials_path_idx" ON "_templates_v_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "_templates_v_blocks_testimonials_locales_locale_parent_id_un" ON "_templates_v_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_testimonials_locales_parent_id_idx" ON "_templates_v_blocks_testimonials_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_video_captions_order_idx" ON "_templates_v_blocks_video_captions" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_video_captions_parent_id_idx" ON "_templates_v_blocks_video_captions" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_video_captions_file_idx" ON "_templates_v_blocks_video_captions" USING btree ("file_id");
  CREATE INDEX "_templates_v_blocks_video_order_idx" ON "_templates_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_video_parent_id_idx" ON "_templates_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_video_path_idx" ON "_templates_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_video_file_idx" ON "_templates_v_blocks_video" USING btree ("file_id");
  CREATE INDEX "_templates_v_blocks_video_poster_idx" ON "_templates_v_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_video_locales_locale_parent_id_unique" ON "_templates_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_video_locales_parent_id_idx" ON "_templates_v_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_spacer_order_idx" ON "_templates_v_blocks_spacer" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_spacer_parent_id_idx" ON "_templates_v_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_spacer_path_idx" ON "_templates_v_blocks_spacer" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_category_showcase_links_order_idx" ON "_templates_v_blocks_category_showcase_links" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_category_showcase_links_parent_id_idx" ON "_templates_v_blocks_category_showcase_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_category_showcase_links_locales_locale_p" ON "_templates_v_blocks_category_showcase_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_category_showcase_links_locales_pare_idx" ON "_templates_v_blocks_category_showcase_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_blocks_category_showcase_cs_items_v_order_idx" ON "_templates_blocks_category_showcase_cs_items_v" USING btree ("_order");
  CREATE INDEX "_templates_blocks_category_showcase_cs_items_v_parent_id_idx" ON "_templates_blocks_category_showcase_cs_items_v" USING btree ("_parent_id");
  CREATE INDEX "_templates_blocks_category_showcase_cs_items_v_category_idx" ON "_templates_blocks_category_showcase_cs_items_v" USING btree ("category_id");
  CREATE INDEX "_templates_blocks_category_showcase_cs_items_v_image_idx" ON "_templates_blocks_category_showcase_cs_items_v" USING btree ("image_id");
  CREATE UNIQUE INDEX "_templates_blocks_category_showcase_cs_items_v_locales_local" ON "_templates_blocks_category_showcase_cs_items_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_blocks_category_showcase_cs_items_v_locales_p_idx" ON "_templates_blocks_category_showcase_cs_items_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_category_showcase_order_idx" ON "_templates_v_blocks_category_showcase" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_category_showcase_parent_id_idx" ON "_templates_v_blocks_category_showcase" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_category_showcase_path_idx" ON "_templates_v_blocks_category_showcase" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_category_showcase_category_source_ca_idx" ON "_templates_v_blocks_category_showcase" USING btree ("category_source_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_category_showcase_locales_locale_parent_" ON "_templates_v_blocks_category_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_category_showcase_locales_parent_id_idx" ON "_templates_v_blocks_category_showcase_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_links_order_idx" ON "_templates_v_blocks_product_collection_links" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_product_collection_links_parent_id_idx" ON "_templates_v_blocks_product_collection_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_product_collection_links_locales_locale_" ON "_templates_v_blocks_product_collection_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_links_locales_par_idx" ON "_templates_v_blocks_product_collection_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_tabs_order_idx" ON "_templates_v_blocks_product_collection_tabs" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_product_collection_tabs_parent_id_idx" ON "_templates_v_blocks_product_collection_tabs" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_tabs_product_sour_idx" ON "_templates_v_blocks_product_collection_tabs" USING btree ("product_source_collection_id");
  CREATE INDEX "_templates_v_blocks_product_collection_tabs_product_so_1_idx" ON "_templates_v_blocks_product_collection_tabs" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_product_collection_tabs_locales_locale_p" ON "_templates_v_blocks_product_collection_tabs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_tabs_locales_pare_idx" ON "_templates_v_blocks_product_collection_tabs_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_order_idx" ON "_templates_v_blocks_product_collection" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_product_collection_parent_id_idx" ON "_templates_v_blocks_product_collection" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_path_idx" ON "_templates_v_blocks_product_collection" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_product_collection_media_idx" ON "_templates_v_blocks_product_collection" USING btree ("media_id");
  CREATE INDEX "_templates_v_blocks_product_collection_product_source_pr_idx" ON "_templates_v_blocks_product_collection" USING btree ("product_source_collection_id");
  CREATE INDEX "_templates_v_blocks_product_collection_product_source__1_idx" ON "_templates_v_blocks_product_collection" USING btree ("product_source_category_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_product_collection_locales_locale_parent" ON "_templates_v_blocks_product_collection_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_product_collection_locales_parent_id_idx" ON "_templates_v_blocks_product_collection_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_featured_product_order_idx" ON "_templates_v_blocks_featured_product" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_featured_product_parent_id_idx" ON "_templates_v_blocks_featured_product" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_featured_product_path_idx" ON "_templates_v_blocks_featured_product" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_featured_product_product_idx" ON "_templates_v_blocks_featured_product" USING btree ("product_id");
  CREATE INDEX "_templates_v_blocks_featured_product_media_idx" ON "_templates_v_blocks_featured_product" USING btree ("media_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_featured_product_locales_locale_parent_i" ON "_templates_v_blocks_featured_product_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_featured_product_locales_parent_id_idx" ON "_templates_v_blocks_featured_product_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_bundle_order_idx" ON "_templates_v_blocks_bundle" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_bundle_parent_id_idx" ON "_templates_v_blocks_bundle" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_bundle_path_idx" ON "_templates_v_blocks_bundle" USING btree ("_path");
  CREATE UNIQUE INDEX "_templates_v_blocks_bundle_locales_locale_parent_id_unique" ON "_templates_v_blocks_bundle_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_bundle_locales_parent_id_idx" ON "_templates_v_blocks_bundle_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_promo_banner_links_order_idx" ON "_templates_v_blocks_promo_banner_links" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_promo_banner_links_parent_id_idx" ON "_templates_v_blocks_promo_banner_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_promo_banner_links_locales_locale_parent" ON "_templates_v_blocks_promo_banner_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_promo_banner_links_locales_parent_id_idx" ON "_templates_v_blocks_promo_banner_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_promo_banner_order_idx" ON "_templates_v_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_promo_banner_parent_id_idx" ON "_templates_v_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_promo_banner_path_idx" ON "_templates_v_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_promo_banner_media_idx" ON "_templates_v_blocks_promo_banner" USING btree ("media_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_promo_banner_locales_locale_parent_id_un" ON "_templates_v_blocks_promo_banner_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_promo_banner_locales_parent_id_idx" ON "_templates_v_blocks_promo_banner_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_comparison_rows_order_idx" ON "_templates_v_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_comparison_rows_parent_id_idx" ON "_templates_v_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_comparison_rows_locales_locale_parent_id" ON "_templates_v_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_comparison_rows_locales_parent_id_idx" ON "_templates_v_blocks_comparison_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_comparison_order_idx" ON "_templates_v_blocks_comparison" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_comparison_parent_id_idx" ON "_templates_v_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_comparison_path_idx" ON "_templates_v_blocks_comparison" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_comparison_pick_idx" ON "_templates_v_blocks_comparison" USING btree ("pick_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_comparison_locales_locale_parent_id_uniq" ON "_templates_v_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_comparison_locales_parent_id_idx" ON "_templates_v_blocks_comparison_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_collection_spotlight_order_idx" ON "_templates_v_blocks_collection_spotlight" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_collection_spotlight_parent_id_idx" ON "_templates_v_blocks_collection_spotlight" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_collection_spotlight_path_idx" ON "_templates_v_blocks_collection_spotlight" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_collection_spotlight_collection_idx" ON "_templates_v_blocks_collection_spotlight" USING btree ("collection_id");
  CREATE INDEX "_templates_v_blocks_collection_spotlight_media_idx" ON "_templates_v_blocks_collection_spotlight" USING btree ("media_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_collection_spotlight_locales_locale_pare" ON "_templates_v_blocks_collection_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_collection_spotlight_locales_parent__idx" ON "_templates_v_blocks_collection_spotlight_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_newsletter_order_idx" ON "_templates_v_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_newsletter_parent_id_idx" ON "_templates_v_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_newsletter_path_idx" ON "_templates_v_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_newsletter_media_idx" ON "_templates_v_blocks_newsletter" USING btree ("media_id");
  CREATE INDEX "_templates_v_blocks_newsletter_form_idx" ON "_templates_v_blocks_newsletter" USING btree ("form_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_newsletter_locales_locale_parent_id_uniq" ON "_templates_v_blocks_newsletter_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_newsletter_locales_parent_id_idx" ON "_templates_v_blocks_newsletter_locales" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_form_block_order_idx" ON "_templates_v_blocks_form_block" USING btree ("_order");
  CREATE INDEX "_templates_v_blocks_form_block_parent_id_idx" ON "_templates_v_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "_templates_v_blocks_form_block_path_idx" ON "_templates_v_blocks_form_block" USING btree ("_path");
  CREATE INDEX "_templates_v_blocks_form_block_form_idx" ON "_templates_v_blocks_form_block" USING btree ("form_id");
  CREATE UNIQUE INDEX "_templates_v_blocks_form_block_locales_locale_parent_id_uniq" ON "_templates_v_blocks_form_block_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_templates_v_blocks_form_block_locales_parent_id_idx" ON "_templates_v_blocks_form_block_locales" USING btree ("_parent_id");
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_rels" ADD CONSTRAINT "templates_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "templates_rels" ADD CONSTRAINT "templates_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_rels" ADD CONSTRAINT "_templates_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_templates_v_rels" ADD CONSTRAINT "_templates_v_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_rels_categories_id_idx" ON "products_rels" USING btree ("categories_id");
  CREATE INDEX "products_rels_collections_id_idx" ON "products_rels" USING btree ("collections_id");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  CREATE INDEX "templates_rels_categories_id_idx" ON "templates_rels" USING btree ("categories_id");
  CREATE INDEX "templates_rels_collections_id_idx" ON "templates_rels" USING btree ("collections_id");
  CREATE INDEX "_templates_v_rels_categories_id_idx" ON "_templates_v_rels" USING btree ("categories_id");
  CREATE INDEX "_templates_v_rels_collections_id_idx" ON "_templates_v_rels" USING btree ("collections_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_media_with_text_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_media_with_text_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_media_with_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_media_with_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_usp_bar_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_usp_bar_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_usp_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_logo_cloud_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_logo_cloud" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_logo_cloud_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_testimonials_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_testimonials_quotes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_video_captions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_spacer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_category_showcase_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_category_showcase_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_category_showcase_cs_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_category_showcase_cs_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_category_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_category_showcase_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_product_collection_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_product_collection_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_product_collection_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_product_collection_tabs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_product_collection" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_product_collection_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_featured_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_featured_product_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_bundle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_bundle_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_promo_banner_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_promo_banner_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_promo_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_promo_banner_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_comparison_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_comparison_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_comparison" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_comparison_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_collection_spotlight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_collection_spotlight_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_newsletter_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_form_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_blocks_form_block_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_media_with_text_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_media_with_text_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_media_with_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_media_with_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_usp_bar_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_usp_bar_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_usp_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_logo_cloud_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_logo_cloud" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_logo_cloud_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_testimonials_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_testimonials_quotes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_video_captions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_spacer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_category_showcase_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_category_showcase_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_category_showcase_cs_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_category_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_category_showcase_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_product_collection_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_product_collection_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_product_collection_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_product_collection_tabs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_product_collection" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_product_collection_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_featured_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_featured_product_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_bundle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_bundle_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_promo_banner_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_promo_banner_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_promo_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_promo_banner_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_comparison_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_comparison_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_comparison" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_comparison_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_collection_spotlight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_collection_spotlight_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_newsletter_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_form_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_blocks_form_block_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_media_with_text_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_media_with_text_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_media_with_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_media_with_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_usp_bar_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_usp_bar_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_usp_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_logo_cloud_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_logo_cloud" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_logo_cloud_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_testimonials_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_testimonials_quotes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_video_captions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_spacer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_category_showcase_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_category_showcase_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_category_showcase_cs_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_category_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_category_showcase_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_product_collection_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_product_collection_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_product_collection_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_product_collection_tabs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_product_collection" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_product_collection_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_featured_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_featured_product_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_bundle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_bundle_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_promo_banner_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_promo_banner_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_promo_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_promo_banner_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_comparison_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_comparison_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_comparison" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_comparison_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_collection_spotlight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_collection_spotlight_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_newsletter_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_form_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_blocks_form_block_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_media_with_text_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_media_with_text_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_media_with_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_media_with_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_usp_bar_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_usp_bar_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_usp_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_logo_cloud_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_logo_cloud" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_logo_cloud_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_testimonials_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_testimonials_quotes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_video_captions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_spacer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_category_showcase_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_category_showcase_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_category_showcase_cs_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_category_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_category_showcase_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_product_collection_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_product_collection_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_product_collection_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_product_collection_tabs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_product_collection" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_product_collection_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_featured_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_featured_product_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_bundle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_bundle_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_promo_banner_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_promo_banner_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_promo_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_promo_banner_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_comparison_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_comparison_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_comparison" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_comparison_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_collection_spotlight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_collection_spotlight_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_newsletter_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_form_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "templates_blocks_form_block_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_media_with_text_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_media_with_text_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_media_with_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_media_with_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_usp_bar_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_usp_bar_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_usp_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_logo_cloud_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_logo_cloud" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_logo_cloud_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_testimonials_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_testimonials_quotes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_video_captions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_spacer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_category_showcase_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_category_showcase_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_category_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_category_showcase_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_product_collection_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_product_collection_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_product_collection" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_product_collection_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_featured_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_featured_product_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_bundle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_bundle_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_promo_banner_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_promo_banner_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_promo_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_promo_banner_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_comparison_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_comparison_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_comparison" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_comparison_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_collection_spotlight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_collection_spotlight_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_newsletter_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_form_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_templates_v_blocks_form_block_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_blocks_rich_text" CASCADE;
  DROP TABLE "products_blocks_rich_text_locales" CASCADE;
  DROP TABLE "products_blocks_media_with_text_links" CASCADE;
  DROP TABLE "products_blocks_media_with_text_links_locales" CASCADE;
  DROP TABLE "products_blocks_media_with_text" CASCADE;
  DROP TABLE "products_blocks_media_with_text_locales" CASCADE;
  DROP TABLE "products_blocks_usp_bar_items" CASCADE;
  DROP TABLE "products_blocks_usp_bar_items_locales" CASCADE;
  DROP TABLE "products_blocks_usp_bar" CASCADE;
  DROP TABLE "products_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "products_blocks_logo_cloud" CASCADE;
  DROP TABLE "products_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "products_blocks_faq_items" CASCADE;
  DROP TABLE "products_blocks_faq_items_locales" CASCADE;
  DROP TABLE "products_blocks_faq" CASCADE;
  DROP TABLE "products_blocks_faq_locales" CASCADE;
  DROP TABLE "products_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "products_blocks_testimonials_quotes_locales" CASCADE;
  DROP TABLE "products_blocks_testimonials" CASCADE;
  DROP TABLE "products_blocks_testimonials_locales" CASCADE;
  DROP TABLE "products_blocks_video_captions" CASCADE;
  DROP TABLE "products_blocks_video" CASCADE;
  DROP TABLE "products_blocks_video_locales" CASCADE;
  DROP TABLE "products_blocks_spacer" CASCADE;
  DROP TABLE "products_blocks_category_showcase_links" CASCADE;
  DROP TABLE "products_blocks_category_showcase_links_locales" CASCADE;
  DROP TABLE "products_blocks_category_showcase_cs_items" CASCADE;
  DROP TABLE "products_blocks_category_showcase_cs_items_locales" CASCADE;
  DROP TABLE "products_blocks_category_showcase" CASCADE;
  DROP TABLE "products_blocks_category_showcase_locales" CASCADE;
  DROP TABLE "products_blocks_product_collection_links" CASCADE;
  DROP TABLE "products_blocks_product_collection_links_locales" CASCADE;
  DROP TABLE "products_blocks_product_collection_tabs" CASCADE;
  DROP TABLE "products_blocks_product_collection_tabs_locales" CASCADE;
  DROP TABLE "products_blocks_product_collection" CASCADE;
  DROP TABLE "products_blocks_product_collection_locales" CASCADE;
  DROP TABLE "products_blocks_featured_product" CASCADE;
  DROP TABLE "products_blocks_featured_product_locales" CASCADE;
  DROP TABLE "products_blocks_bundle" CASCADE;
  DROP TABLE "products_blocks_bundle_locales" CASCADE;
  DROP TABLE "products_blocks_promo_banner_links" CASCADE;
  DROP TABLE "products_blocks_promo_banner_links_locales" CASCADE;
  DROP TABLE "products_blocks_promo_banner" CASCADE;
  DROP TABLE "products_blocks_promo_banner_locales" CASCADE;
  DROP TABLE "products_blocks_comparison_rows" CASCADE;
  DROP TABLE "products_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "products_blocks_comparison" CASCADE;
  DROP TABLE "products_blocks_comparison_locales" CASCADE;
  DROP TABLE "products_blocks_collection_spotlight" CASCADE;
  DROP TABLE "products_blocks_collection_spotlight_locales" CASCADE;
  DROP TABLE "products_blocks_newsletter" CASCADE;
  DROP TABLE "products_blocks_newsletter_locales" CASCADE;
  DROP TABLE "products_blocks_form_block" CASCADE;
  DROP TABLE "products_blocks_form_block_locales" CASCADE;
  DROP TABLE "categories_blocks_rich_text" CASCADE;
  DROP TABLE "categories_blocks_rich_text_locales" CASCADE;
  DROP TABLE "categories_blocks_media_with_text_links" CASCADE;
  DROP TABLE "categories_blocks_media_with_text_links_locales" CASCADE;
  DROP TABLE "categories_blocks_media_with_text" CASCADE;
  DROP TABLE "categories_blocks_media_with_text_locales" CASCADE;
  DROP TABLE "categories_blocks_usp_bar_items" CASCADE;
  DROP TABLE "categories_blocks_usp_bar_items_locales" CASCADE;
  DROP TABLE "categories_blocks_usp_bar" CASCADE;
  DROP TABLE "categories_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "categories_blocks_logo_cloud" CASCADE;
  DROP TABLE "categories_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "categories_blocks_faq_items" CASCADE;
  DROP TABLE "categories_blocks_faq_items_locales" CASCADE;
  DROP TABLE "categories_blocks_faq" CASCADE;
  DROP TABLE "categories_blocks_faq_locales" CASCADE;
  DROP TABLE "categories_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "categories_blocks_testimonials_quotes_locales" CASCADE;
  DROP TABLE "categories_blocks_testimonials" CASCADE;
  DROP TABLE "categories_blocks_testimonials_locales" CASCADE;
  DROP TABLE "categories_blocks_video_captions" CASCADE;
  DROP TABLE "categories_blocks_video" CASCADE;
  DROP TABLE "categories_blocks_video_locales" CASCADE;
  DROP TABLE "categories_blocks_spacer" CASCADE;
  DROP TABLE "categories_blocks_category_showcase_links" CASCADE;
  DROP TABLE "categories_blocks_category_showcase_links_locales" CASCADE;
  DROP TABLE "categories_blocks_category_showcase_cs_items" CASCADE;
  DROP TABLE "categories_blocks_category_showcase_cs_items_locales" CASCADE;
  DROP TABLE "categories_blocks_category_showcase" CASCADE;
  DROP TABLE "categories_blocks_category_showcase_locales" CASCADE;
  DROP TABLE "categories_blocks_product_collection_links" CASCADE;
  DROP TABLE "categories_blocks_product_collection_links_locales" CASCADE;
  DROP TABLE "categories_blocks_product_collection_tabs" CASCADE;
  DROP TABLE "categories_blocks_product_collection_tabs_locales" CASCADE;
  DROP TABLE "categories_blocks_product_collection" CASCADE;
  DROP TABLE "categories_blocks_product_collection_locales" CASCADE;
  DROP TABLE "categories_blocks_featured_product" CASCADE;
  DROP TABLE "categories_blocks_featured_product_locales" CASCADE;
  DROP TABLE "categories_blocks_bundle" CASCADE;
  DROP TABLE "categories_blocks_bundle_locales" CASCADE;
  DROP TABLE "categories_blocks_promo_banner_links" CASCADE;
  DROP TABLE "categories_blocks_promo_banner_links_locales" CASCADE;
  DROP TABLE "categories_blocks_promo_banner" CASCADE;
  DROP TABLE "categories_blocks_promo_banner_locales" CASCADE;
  DROP TABLE "categories_blocks_comparison_rows" CASCADE;
  DROP TABLE "categories_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "categories_blocks_comparison" CASCADE;
  DROP TABLE "categories_blocks_comparison_locales" CASCADE;
  DROP TABLE "categories_blocks_collection_spotlight" CASCADE;
  DROP TABLE "categories_blocks_collection_spotlight_locales" CASCADE;
  DROP TABLE "categories_blocks_newsletter" CASCADE;
  DROP TABLE "categories_blocks_newsletter_locales" CASCADE;
  DROP TABLE "categories_blocks_form_block" CASCADE;
  DROP TABLE "categories_blocks_form_block_locales" CASCADE;
  DROP TABLE "categories_rels" CASCADE;
  DROP TABLE "collections_blocks_rich_text" CASCADE;
  DROP TABLE "collections_blocks_rich_text_locales" CASCADE;
  DROP TABLE "collections_blocks_media_with_text_links" CASCADE;
  DROP TABLE "collections_blocks_media_with_text_links_locales" CASCADE;
  DROP TABLE "collections_blocks_media_with_text" CASCADE;
  DROP TABLE "collections_blocks_media_with_text_locales" CASCADE;
  DROP TABLE "collections_blocks_usp_bar_items" CASCADE;
  DROP TABLE "collections_blocks_usp_bar_items_locales" CASCADE;
  DROP TABLE "collections_blocks_usp_bar" CASCADE;
  DROP TABLE "collections_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "collections_blocks_logo_cloud" CASCADE;
  DROP TABLE "collections_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "collections_blocks_faq_items" CASCADE;
  DROP TABLE "collections_blocks_faq_items_locales" CASCADE;
  DROP TABLE "collections_blocks_faq" CASCADE;
  DROP TABLE "collections_blocks_faq_locales" CASCADE;
  DROP TABLE "collections_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "collections_blocks_testimonials_quotes_locales" CASCADE;
  DROP TABLE "collections_blocks_testimonials" CASCADE;
  DROP TABLE "collections_blocks_testimonials_locales" CASCADE;
  DROP TABLE "collections_blocks_video_captions" CASCADE;
  DROP TABLE "collections_blocks_video" CASCADE;
  DROP TABLE "collections_blocks_video_locales" CASCADE;
  DROP TABLE "collections_blocks_spacer" CASCADE;
  DROP TABLE "collections_blocks_category_showcase_links" CASCADE;
  DROP TABLE "collections_blocks_category_showcase_links_locales" CASCADE;
  DROP TABLE "collections_blocks_category_showcase_cs_items" CASCADE;
  DROP TABLE "collections_blocks_category_showcase_cs_items_locales" CASCADE;
  DROP TABLE "collections_blocks_category_showcase" CASCADE;
  DROP TABLE "collections_blocks_category_showcase_locales" CASCADE;
  DROP TABLE "collections_blocks_product_collection_links" CASCADE;
  DROP TABLE "collections_blocks_product_collection_links_locales" CASCADE;
  DROP TABLE "collections_blocks_product_collection_tabs" CASCADE;
  DROP TABLE "collections_blocks_product_collection_tabs_locales" CASCADE;
  DROP TABLE "collections_blocks_product_collection" CASCADE;
  DROP TABLE "collections_blocks_product_collection_locales" CASCADE;
  DROP TABLE "collections_blocks_featured_product" CASCADE;
  DROP TABLE "collections_blocks_featured_product_locales" CASCADE;
  DROP TABLE "collections_blocks_bundle" CASCADE;
  DROP TABLE "collections_blocks_bundle_locales" CASCADE;
  DROP TABLE "collections_blocks_promo_banner_links" CASCADE;
  DROP TABLE "collections_blocks_promo_banner_links_locales" CASCADE;
  DROP TABLE "collections_blocks_promo_banner" CASCADE;
  DROP TABLE "collections_blocks_promo_banner_locales" CASCADE;
  DROP TABLE "collections_blocks_comparison_rows" CASCADE;
  DROP TABLE "collections_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "collections_blocks_comparison" CASCADE;
  DROP TABLE "collections_blocks_comparison_locales" CASCADE;
  DROP TABLE "collections_blocks_collection_spotlight" CASCADE;
  DROP TABLE "collections_blocks_collection_spotlight_locales" CASCADE;
  DROP TABLE "collections_blocks_newsletter" CASCADE;
  DROP TABLE "collections_blocks_newsletter_locales" CASCADE;
  DROP TABLE "collections_blocks_form_block" CASCADE;
  DROP TABLE "collections_blocks_form_block_locales" CASCADE;
  DROP TABLE "collections_rels" CASCADE;
  DROP TABLE "templates_blocks_rich_text" CASCADE;
  DROP TABLE "templates_blocks_rich_text_locales" CASCADE;
  DROP TABLE "templates_blocks_media_with_text_links" CASCADE;
  DROP TABLE "templates_blocks_media_with_text_links_locales" CASCADE;
  DROP TABLE "templates_blocks_media_with_text" CASCADE;
  DROP TABLE "templates_blocks_media_with_text_locales" CASCADE;
  DROP TABLE "templates_blocks_usp_bar_items" CASCADE;
  DROP TABLE "templates_blocks_usp_bar_items_locales" CASCADE;
  DROP TABLE "templates_blocks_usp_bar" CASCADE;
  DROP TABLE "templates_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "templates_blocks_logo_cloud" CASCADE;
  DROP TABLE "templates_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "templates_blocks_faq_items" CASCADE;
  DROP TABLE "templates_blocks_faq_items_locales" CASCADE;
  DROP TABLE "templates_blocks_faq" CASCADE;
  DROP TABLE "templates_blocks_faq_locales" CASCADE;
  DROP TABLE "templates_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "templates_blocks_testimonials_quotes_locales" CASCADE;
  DROP TABLE "templates_blocks_testimonials" CASCADE;
  DROP TABLE "templates_blocks_testimonials_locales" CASCADE;
  DROP TABLE "templates_blocks_video_captions" CASCADE;
  DROP TABLE "templates_blocks_video" CASCADE;
  DROP TABLE "templates_blocks_video_locales" CASCADE;
  DROP TABLE "templates_blocks_spacer" CASCADE;
  DROP TABLE "templates_blocks_category_showcase_links" CASCADE;
  DROP TABLE "templates_blocks_category_showcase_links_locales" CASCADE;
  DROP TABLE "templates_blocks_category_showcase_cs_items" CASCADE;
  DROP TABLE "templates_blocks_category_showcase_cs_items_locales" CASCADE;
  DROP TABLE "templates_blocks_category_showcase" CASCADE;
  DROP TABLE "templates_blocks_category_showcase_locales" CASCADE;
  DROP TABLE "templates_blocks_product_collection_links" CASCADE;
  DROP TABLE "templates_blocks_product_collection_links_locales" CASCADE;
  DROP TABLE "templates_blocks_product_collection_tabs" CASCADE;
  DROP TABLE "templates_blocks_product_collection_tabs_locales" CASCADE;
  DROP TABLE "templates_blocks_product_collection" CASCADE;
  DROP TABLE "templates_blocks_product_collection_locales" CASCADE;
  DROP TABLE "templates_blocks_featured_product" CASCADE;
  DROP TABLE "templates_blocks_featured_product_locales" CASCADE;
  DROP TABLE "templates_blocks_bundle" CASCADE;
  DROP TABLE "templates_blocks_bundle_locales" CASCADE;
  DROP TABLE "templates_blocks_promo_banner_links" CASCADE;
  DROP TABLE "templates_blocks_promo_banner_links_locales" CASCADE;
  DROP TABLE "templates_blocks_promo_banner" CASCADE;
  DROP TABLE "templates_blocks_promo_banner_locales" CASCADE;
  DROP TABLE "templates_blocks_comparison_rows" CASCADE;
  DROP TABLE "templates_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "templates_blocks_comparison" CASCADE;
  DROP TABLE "templates_blocks_comparison_locales" CASCADE;
  DROP TABLE "templates_blocks_collection_spotlight" CASCADE;
  DROP TABLE "templates_blocks_collection_spotlight_locales" CASCADE;
  DROP TABLE "templates_blocks_newsletter" CASCADE;
  DROP TABLE "templates_blocks_newsletter_locales" CASCADE;
  DROP TABLE "templates_blocks_form_block" CASCADE;
  DROP TABLE "templates_blocks_form_block_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_rich_text" CASCADE;
  DROP TABLE "_templates_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_media_with_text_links" CASCADE;
  DROP TABLE "_templates_v_blocks_media_with_text_links_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_media_with_text" CASCADE;
  DROP TABLE "_templates_v_blocks_media_with_text_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_usp_bar_items" CASCADE;
  DROP TABLE "_templates_v_blocks_usp_bar_items_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_usp_bar" CASCADE;
  DROP TABLE "_templates_v_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "_templates_v_blocks_logo_cloud" CASCADE;
  DROP TABLE "_templates_v_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_faq_items" CASCADE;
  DROP TABLE "_templates_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_faq" CASCADE;
  DROP TABLE "_templates_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_testimonials_quotes" CASCADE;
  DROP TABLE "_templates_v_blocks_testimonials_quotes_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_testimonials" CASCADE;
  DROP TABLE "_templates_v_blocks_testimonials_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_video_captions" CASCADE;
  DROP TABLE "_templates_v_blocks_video" CASCADE;
  DROP TABLE "_templates_v_blocks_video_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_spacer" CASCADE;
  DROP TABLE "_templates_v_blocks_category_showcase_links" CASCADE;
  DROP TABLE "_templates_v_blocks_category_showcase_links_locales" CASCADE;
  DROP TABLE "_templates_blocks_category_showcase_cs_items_v" CASCADE;
  DROP TABLE "_templates_blocks_category_showcase_cs_items_v_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_category_showcase" CASCADE;
  DROP TABLE "_templates_v_blocks_category_showcase_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_product_collection_links" CASCADE;
  DROP TABLE "_templates_v_blocks_product_collection_links_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_product_collection_tabs" CASCADE;
  DROP TABLE "_templates_v_blocks_product_collection_tabs_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_product_collection" CASCADE;
  DROP TABLE "_templates_v_blocks_product_collection_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_featured_product" CASCADE;
  DROP TABLE "_templates_v_blocks_featured_product_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_bundle" CASCADE;
  DROP TABLE "_templates_v_blocks_bundle_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_promo_banner_links" CASCADE;
  DROP TABLE "_templates_v_blocks_promo_banner_links_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_promo_banner" CASCADE;
  DROP TABLE "_templates_v_blocks_promo_banner_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_comparison_rows" CASCADE;
  DROP TABLE "_templates_v_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_comparison" CASCADE;
  DROP TABLE "_templates_v_blocks_comparison_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_collection_spotlight" CASCADE;
  DROP TABLE "_templates_v_blocks_collection_spotlight_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_newsletter" CASCADE;
  DROP TABLE "_templates_v_blocks_newsletter_locales" CASCADE;
  DROP TABLE "_templates_v_blocks_form_block" CASCADE;
  DROP TABLE "_templates_v_blocks_form_block_locales" CASCADE;
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_categories_fk";
  
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_collections_fk";
  
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_products_fk";
  
  ALTER TABLE "templates_rels" DROP CONSTRAINT "templates_rels_categories_fk";
  
  ALTER TABLE "templates_rels" DROP CONSTRAINT "templates_rels_collections_fk";
  
  ALTER TABLE "_templates_v_rels" DROP CONSTRAINT "_templates_v_rels_categories_fk";
  
  ALTER TABLE "_templates_v_rels" DROP CONSTRAINT "_templates_v_rels_collections_fk";
  
  DROP INDEX "products_rels_categories_id_idx";
  DROP INDEX "products_rels_collections_id_idx";
  DROP INDEX "products_rels_products_id_idx";
  DROP INDEX "templates_rels_categories_id_idx";
  DROP INDEX "templates_rels_collections_id_idx";
  DROP INDEX "_templates_v_rels_categories_id_idx";
  DROP INDEX "_templates_v_rels_collections_id_idx";
  ALTER TABLE "products" DROP COLUMN "sections_mode";
  ALTER TABLE "products_rels" DROP COLUMN "categories_id";
  ALTER TABLE "products_rels" DROP COLUMN "collections_id";
  ALTER TABLE "products_rels" DROP COLUMN "products_id";
  ALTER TABLE "categories" DROP COLUMN "sections_mode";
  ALTER TABLE "collections" DROP COLUMN "sections_mode";
  ALTER TABLE "templates_rels" DROP COLUMN "categories_id";
  ALTER TABLE "templates_rels" DROP COLUMN "collections_id";
  ALTER TABLE "_templates_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_templates_v_rels" DROP COLUMN "collections_id";
  DROP TYPE "public"."enum_products_blocks_rich_text_variant";
  DROP TYPE "public"."enum_products_blocks_rich_text_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_rich_text_ss_surface";
  DROP TYPE "public"."enum_products_blocks_rich_text_ss_container";
  DROP TYPE "public"."enum_products_blocks_rich_text_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_media_with_text_links_link_type";
  DROP TYPE "public"."enum_products_blocks_media_with_text_links_link_appearance";
  DROP TYPE "public"."enum_products_blocks_media_with_text_variant";
  DROP TYPE "public"."enum_products_blocks_media_with_text_image_side";
  DROP TYPE "public"."enum_products_blocks_media_with_text_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_media_with_text_ss_surface";
  DROP TYPE "public"."enum_products_blocks_media_with_text_ss_container";
  DROP TYPE "public"."enum_products_blocks_media_with_text_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_usp_bar_items_icon";
  DROP TYPE "public"."enum_products_blocks_usp_bar_variant";
  DROP TYPE "public"."enum_products_blocks_usp_bar_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_usp_bar_ss_surface";
  DROP TYPE "public"."enum_products_blocks_usp_bar_ss_container";
  DROP TYPE "public"."enum_products_blocks_usp_bar_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_logo_cloud_variant";
  DROP TYPE "public"."enum_products_blocks_logo_cloud_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_logo_cloud_ss_surface";
  DROP TYPE "public"."enum_products_blocks_logo_cloud_ss_container";
  DROP TYPE "public"."enum_products_blocks_logo_cloud_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_faq_variant";
  DROP TYPE "public"."enum_products_blocks_faq_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_faq_ss_surface";
  DROP TYPE "public"."enum_products_blocks_faq_ss_container";
  DROP TYPE "public"."enum_products_blocks_faq_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_testimonials_variant";
  DROP TYPE "public"."enum_products_blocks_testimonials_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_testimonials_ss_surface";
  DROP TYPE "public"."enum_products_blocks_testimonials_ss_container";
  DROP TYPE "public"."enum_products_blocks_testimonials_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_video_captions_language";
  DROP TYPE "public"."enum_products_blocks_video_variant";
  DROP TYPE "public"."enum_products_blocks_video_source";
  DROP TYPE "public"."enum_products_blocks_video_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_video_ss_surface";
  DROP TYPE "public"."enum_products_blocks_video_ss_container";
  DROP TYPE "public"."enum_products_blocks_video_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_spacer_variant";
  DROP TYPE "public"."enum_products_blocks_spacer_size";
  DROP TYPE "public"."enum_products_blocks_spacer_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_spacer_ss_surface";
  DROP TYPE "public"."enum_products_blocks_spacer_ss_container";
  DROP TYPE "public"."enum_products_blocks_spacer_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_category_showcase_links_link_type";
  DROP TYPE "public"."enum_products_blocks_category_showcase_links_link_appearance";
  DROP TYPE "public"."enum_products_blocks_category_showcase_variant";
  DROP TYPE "public"."enum_products_blocks_category_showcase_cs_mode";
  DROP TYPE "public"."enum_products_blocks_category_showcase_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_category_showcase_ss_surface";
  DROP TYPE "public"."enum_products_blocks_category_showcase_ss_container";
  DROP TYPE "public"."enum_products_blocks_category_showcase_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_product_collection_links_link_type";
  DROP TYPE "public"."enum_products_blocks_product_collection_links_link_appearance";
  DROP TYPE "public"."enum_products_blocks_product_collection_tabs_ps_mode";
  DROP TYPE "public"."enum_products_blocks_product_collection_tabs_ps_sort";
  DROP TYPE "public"."enum_products_blocks_product_collection_variant";
  DROP TYPE "public"."enum_products_blocks_product_collection_display";
  DROP TYPE "public"."enum_products_blocks_product_collection_ps_mode";
  DROP TYPE "public"."enum_products_blocks_product_collection_ps_sort";
  DROP TYPE "public"."enum_products_blocks_product_collection_ps_empty";
  DROP TYPE "public"."enum_products_blocks_product_collection_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_product_collection_ss_surface";
  DROP TYPE "public"."enum_products_blocks_product_collection_ss_container";
  DROP TYPE "public"."enum_products_blocks_product_collection_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_featured_product_variant";
  DROP TYPE "public"."enum_products_blocks_featured_product_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_featured_product_ss_surface";
  DROP TYPE "public"."enum_products_blocks_featured_product_ss_container";
  DROP TYPE "public"."enum_products_blocks_featured_product_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_bundle_variant";
  DROP TYPE "public"."enum_products_blocks_bundle_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_bundle_ss_surface";
  DROP TYPE "public"."enum_products_blocks_bundle_ss_container";
  DROP TYPE "public"."enum_products_blocks_bundle_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_promo_banner_links_link_type";
  DROP TYPE "public"."enum_products_blocks_promo_banner_links_link_appearance";
  DROP TYPE "public"."enum_products_blocks_promo_banner_variant";
  DROP TYPE "public"."enum_products_blocks_promo_banner_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_promo_banner_ss_surface";
  DROP TYPE "public"."enum_products_blocks_promo_banner_ss_container";
  DROP TYPE "public"."enum_products_blocks_promo_banner_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_comparison_variant";
  DROP TYPE "public"."enum_products_blocks_comparison_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_comparison_ss_surface";
  DROP TYPE "public"."enum_products_blocks_comparison_ss_container";
  DROP TYPE "public"."enum_products_blocks_comparison_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_collection_spotlight_variant";
  DROP TYPE "public"."enum_products_blocks_collection_spotlight_sort";
  DROP TYPE "public"."enum_products_blocks_collection_spotlight_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_collection_spotlight_ss_surface";
  DROP TYPE "public"."enum_products_blocks_collection_spotlight_ss_container";
  DROP TYPE "public"."enum_products_blocks_collection_spotlight_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_newsletter_variant";
  DROP TYPE "public"."enum_products_blocks_newsletter_privacy_type";
  DROP TYPE "public"."enum_products_blocks_newsletter_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_newsletter_ss_surface";
  DROP TYPE "public"."enum_products_blocks_newsletter_ss_container";
  DROP TYPE "public"."enum_products_blocks_newsletter_ss_visibility";
  DROP TYPE "public"."enum_products_blocks_form_block_variant";
  DROP TYPE "public"."enum_products_blocks_form_block_ss_spacing";
  DROP TYPE "public"."enum_products_blocks_form_block_ss_surface";
  DROP TYPE "public"."enum_products_blocks_form_block_ss_container";
  DROP TYPE "public"."enum_products_blocks_form_block_ss_visibility";
  DROP TYPE "public"."enum_products_sections_mode";
  DROP TYPE "public"."enum_categories_blocks_rich_text_variant";
  DROP TYPE "public"."enum_categories_blocks_rich_text_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_rich_text_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_rich_text_ss_container";
  DROP TYPE "public"."enum_categories_blocks_rich_text_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_links_link_type";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_links_link_appearance";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_variant";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_image_side";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_ss_container";
  DROP TYPE "public"."enum_categories_blocks_media_with_text_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_usp_bar_items_icon";
  DROP TYPE "public"."enum_categories_blocks_usp_bar_variant";
  DROP TYPE "public"."enum_categories_blocks_usp_bar_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_usp_bar_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_usp_bar_ss_container";
  DROP TYPE "public"."enum_categories_blocks_usp_bar_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_logo_cloud_variant";
  DROP TYPE "public"."enum_categories_blocks_logo_cloud_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_logo_cloud_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_logo_cloud_ss_container";
  DROP TYPE "public"."enum_categories_blocks_logo_cloud_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_faq_variant";
  DROP TYPE "public"."enum_categories_blocks_faq_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_faq_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_faq_ss_container";
  DROP TYPE "public"."enum_categories_blocks_faq_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_testimonials_variant";
  DROP TYPE "public"."enum_categories_blocks_testimonials_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_testimonials_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_testimonials_ss_container";
  DROP TYPE "public"."enum_categories_blocks_testimonials_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_video_captions_language";
  DROP TYPE "public"."enum_categories_blocks_video_variant";
  DROP TYPE "public"."enum_categories_blocks_video_source";
  DROP TYPE "public"."enum_categories_blocks_video_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_video_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_video_ss_container";
  DROP TYPE "public"."enum_categories_blocks_video_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_spacer_variant";
  DROP TYPE "public"."enum_categories_blocks_spacer_size";
  DROP TYPE "public"."enum_categories_blocks_spacer_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_spacer_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_spacer_ss_container";
  DROP TYPE "public"."enum_categories_blocks_spacer_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_links_link_type";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_links_link_appearance";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_variant";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_cs_mode";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_ss_container";
  DROP TYPE "public"."enum_categories_blocks_category_showcase_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_product_collection_links_link_type";
  DROP TYPE "public"."enum_categories_blocks_product_collection_links_link_appearance";
  DROP TYPE "public"."enum_categories_blocks_product_collection_tabs_ps_mode";
  DROP TYPE "public"."enum_categories_blocks_product_collection_tabs_ps_sort";
  DROP TYPE "public"."enum_categories_blocks_product_collection_variant";
  DROP TYPE "public"."enum_categories_blocks_product_collection_display";
  DROP TYPE "public"."enum_categories_blocks_product_collection_ps_mode";
  DROP TYPE "public"."enum_categories_blocks_product_collection_ps_sort";
  DROP TYPE "public"."enum_categories_blocks_product_collection_ps_empty";
  DROP TYPE "public"."enum_categories_blocks_product_collection_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_product_collection_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_product_collection_ss_container";
  DROP TYPE "public"."enum_categories_blocks_product_collection_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_featured_product_variant";
  DROP TYPE "public"."enum_categories_blocks_featured_product_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_featured_product_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_featured_product_ss_container";
  DROP TYPE "public"."enum_categories_blocks_featured_product_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_bundle_variant";
  DROP TYPE "public"."enum_categories_blocks_bundle_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_bundle_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_bundle_ss_container";
  DROP TYPE "public"."enum_categories_blocks_bundle_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_promo_banner_links_link_type";
  DROP TYPE "public"."enum_categories_blocks_promo_banner_links_link_appearance";
  DROP TYPE "public"."enum_categories_blocks_promo_banner_variant";
  DROP TYPE "public"."enum_categories_blocks_promo_banner_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_promo_banner_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_promo_banner_ss_container";
  DROP TYPE "public"."enum_categories_blocks_promo_banner_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_comparison_variant";
  DROP TYPE "public"."enum_categories_blocks_comparison_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_comparison_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_comparison_ss_container";
  DROP TYPE "public"."enum_categories_blocks_comparison_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_collection_spotlight_variant";
  DROP TYPE "public"."enum_categories_blocks_collection_spotlight_sort";
  DROP TYPE "public"."enum_categories_blocks_collection_spotlight_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_collection_spotlight_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_collection_spotlight_ss_container";
  DROP TYPE "public"."enum_categories_blocks_collection_spotlight_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_newsletter_variant";
  DROP TYPE "public"."enum_categories_blocks_newsletter_privacy_type";
  DROP TYPE "public"."enum_categories_blocks_newsletter_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_newsletter_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_newsletter_ss_container";
  DROP TYPE "public"."enum_categories_blocks_newsletter_ss_visibility";
  DROP TYPE "public"."enum_categories_blocks_form_block_variant";
  DROP TYPE "public"."enum_categories_blocks_form_block_ss_spacing";
  DROP TYPE "public"."enum_categories_blocks_form_block_ss_surface";
  DROP TYPE "public"."enum_categories_blocks_form_block_ss_container";
  DROP TYPE "public"."enum_categories_blocks_form_block_ss_visibility";
  DROP TYPE "public"."enum_categories_sections_mode";
  DROP TYPE "public"."enum_collections_blocks_rich_text_variant";
  DROP TYPE "public"."enum_collections_blocks_rich_text_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_rich_text_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_rich_text_ss_container";
  DROP TYPE "public"."enum_collections_blocks_rich_text_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_links_link_type";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_links_link_appearance";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_variant";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_image_side";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_ss_container";
  DROP TYPE "public"."enum_collections_blocks_media_with_text_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_usp_bar_items_icon";
  DROP TYPE "public"."enum_collections_blocks_usp_bar_variant";
  DROP TYPE "public"."enum_collections_blocks_usp_bar_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_usp_bar_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_usp_bar_ss_container";
  DROP TYPE "public"."enum_collections_blocks_usp_bar_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_logo_cloud_variant";
  DROP TYPE "public"."enum_collections_blocks_logo_cloud_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_logo_cloud_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_logo_cloud_ss_container";
  DROP TYPE "public"."enum_collections_blocks_logo_cloud_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_faq_variant";
  DROP TYPE "public"."enum_collections_blocks_faq_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_faq_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_faq_ss_container";
  DROP TYPE "public"."enum_collections_blocks_faq_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_testimonials_variant";
  DROP TYPE "public"."enum_collections_blocks_testimonials_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_testimonials_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_testimonials_ss_container";
  DROP TYPE "public"."enum_collections_blocks_testimonials_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_video_captions_language";
  DROP TYPE "public"."enum_collections_blocks_video_variant";
  DROP TYPE "public"."enum_collections_blocks_video_source";
  DROP TYPE "public"."enum_collections_blocks_video_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_video_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_video_ss_container";
  DROP TYPE "public"."enum_collections_blocks_video_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_spacer_variant";
  DROP TYPE "public"."enum_collections_blocks_spacer_size";
  DROP TYPE "public"."enum_collections_blocks_spacer_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_spacer_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_spacer_ss_container";
  DROP TYPE "public"."enum_collections_blocks_spacer_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_links_link_type";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_links_link_appearance";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_variant";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_cs_mode";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_ss_container";
  DROP TYPE "public"."enum_collections_blocks_category_showcase_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_product_collection_links_link_type";
  DROP TYPE "public"."enum_collections_blocks_product_collection_links_link_look";
  DROP TYPE "public"."enum_collections_blocks_product_collection_tabs_ps_mode";
  DROP TYPE "public"."enum_collections_blocks_product_collection_tabs_ps_sort";
  DROP TYPE "public"."enum_collections_blocks_product_collection_variant";
  DROP TYPE "public"."enum_collections_blocks_product_collection_display";
  DROP TYPE "public"."enum_collections_blocks_product_collection_ps_mode";
  DROP TYPE "public"."enum_collections_blocks_product_collection_ps_sort";
  DROP TYPE "public"."enum_collections_blocks_product_collection_ps_empty";
  DROP TYPE "public"."enum_collections_blocks_product_collection_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_product_collection_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_product_collection_ss_container";
  DROP TYPE "public"."enum_collections_blocks_product_collection_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_featured_product_variant";
  DROP TYPE "public"."enum_collections_blocks_featured_product_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_featured_product_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_featured_product_ss_container";
  DROP TYPE "public"."enum_collections_blocks_featured_product_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_bundle_variant";
  DROP TYPE "public"."enum_collections_blocks_bundle_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_bundle_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_bundle_ss_container";
  DROP TYPE "public"."enum_collections_blocks_bundle_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_promo_banner_links_link_type";
  DROP TYPE "public"."enum_collections_blocks_promo_banner_links_link_appearance";
  DROP TYPE "public"."enum_collections_blocks_promo_banner_variant";
  DROP TYPE "public"."enum_collections_blocks_promo_banner_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_promo_banner_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_promo_banner_ss_container";
  DROP TYPE "public"."enum_collections_blocks_promo_banner_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_comparison_variant";
  DROP TYPE "public"."enum_collections_blocks_comparison_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_comparison_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_comparison_ss_container";
  DROP TYPE "public"."enum_collections_blocks_comparison_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_collection_spotlight_variant";
  DROP TYPE "public"."enum_collections_blocks_collection_spotlight_sort";
  DROP TYPE "public"."enum_collections_blocks_collection_spotlight_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_collection_spotlight_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_collection_spotlight_ss_container";
  DROP TYPE "public"."enum_collections_blocks_collection_spotlight_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_newsletter_variant";
  DROP TYPE "public"."enum_collections_blocks_newsletter_privacy_type";
  DROP TYPE "public"."enum_collections_blocks_newsletter_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_newsletter_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_newsletter_ss_container";
  DROP TYPE "public"."enum_collections_blocks_newsletter_ss_visibility";
  DROP TYPE "public"."enum_collections_blocks_form_block_variant";
  DROP TYPE "public"."enum_collections_blocks_form_block_ss_spacing";
  DROP TYPE "public"."enum_collections_blocks_form_block_ss_surface";
  DROP TYPE "public"."enum_collections_blocks_form_block_ss_container";
  DROP TYPE "public"."enum_collections_blocks_form_block_ss_visibility";
  DROP TYPE "public"."enum_collections_sections_mode";
  DROP TYPE "public"."enum_templates_blocks_rich_text_variant";
  DROP TYPE "public"."enum_templates_blocks_rich_text_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_rich_text_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_rich_text_ss_container";
  DROP TYPE "public"."enum_templates_blocks_rich_text_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_links_link_type";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_links_link_appearance";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_variant";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_image_side";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_ss_container";
  DROP TYPE "public"."enum_templates_blocks_media_with_text_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_usp_bar_items_icon";
  DROP TYPE "public"."enum_templates_blocks_usp_bar_variant";
  DROP TYPE "public"."enum_templates_blocks_usp_bar_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_usp_bar_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_usp_bar_ss_container";
  DROP TYPE "public"."enum_templates_blocks_usp_bar_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_logo_cloud_variant";
  DROP TYPE "public"."enum_templates_blocks_logo_cloud_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_logo_cloud_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_logo_cloud_ss_container";
  DROP TYPE "public"."enum_templates_blocks_logo_cloud_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_faq_variant";
  DROP TYPE "public"."enum_templates_blocks_faq_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_faq_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_faq_ss_container";
  DROP TYPE "public"."enum_templates_blocks_faq_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_testimonials_variant";
  DROP TYPE "public"."enum_templates_blocks_testimonials_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_testimonials_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_testimonials_ss_container";
  DROP TYPE "public"."enum_templates_blocks_testimonials_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_video_captions_language";
  DROP TYPE "public"."enum_templates_blocks_video_variant";
  DROP TYPE "public"."enum_templates_blocks_video_source";
  DROP TYPE "public"."enum_templates_blocks_video_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_video_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_video_ss_container";
  DROP TYPE "public"."enum_templates_blocks_video_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_spacer_variant";
  DROP TYPE "public"."enum_templates_blocks_spacer_size";
  DROP TYPE "public"."enum_templates_blocks_spacer_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_spacer_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_spacer_ss_container";
  DROP TYPE "public"."enum_templates_blocks_spacer_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_links_link_type";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_links_link_appearance";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_variant";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_cs_mode";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_ss_container";
  DROP TYPE "public"."enum_templates_blocks_category_showcase_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_product_collection_links_link_type";
  DROP TYPE "public"."enum_templates_blocks_product_collection_links_link_appearance";
  DROP TYPE "public"."enum_templates_blocks_product_collection_tabs_ps_mode";
  DROP TYPE "public"."enum_templates_blocks_product_collection_tabs_ps_sort";
  DROP TYPE "public"."enum_templates_blocks_product_collection_variant";
  DROP TYPE "public"."enum_templates_blocks_product_collection_display";
  DROP TYPE "public"."enum_templates_blocks_product_collection_ps_mode";
  DROP TYPE "public"."enum_templates_blocks_product_collection_ps_sort";
  DROP TYPE "public"."enum_templates_blocks_product_collection_ps_empty";
  DROP TYPE "public"."enum_templates_blocks_product_collection_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_product_collection_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_product_collection_ss_container";
  DROP TYPE "public"."enum_templates_blocks_product_collection_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_featured_product_variant";
  DROP TYPE "public"."enum_templates_blocks_featured_product_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_featured_product_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_featured_product_ss_container";
  DROP TYPE "public"."enum_templates_blocks_featured_product_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_bundle_variant";
  DROP TYPE "public"."enum_templates_blocks_bundle_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_bundle_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_bundle_ss_container";
  DROP TYPE "public"."enum_templates_blocks_bundle_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_promo_banner_links_link_type";
  DROP TYPE "public"."enum_templates_blocks_promo_banner_links_link_appearance";
  DROP TYPE "public"."enum_templates_blocks_promo_banner_variant";
  DROP TYPE "public"."enum_templates_blocks_promo_banner_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_promo_banner_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_promo_banner_ss_container";
  DROP TYPE "public"."enum_templates_blocks_promo_banner_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_comparison_variant";
  DROP TYPE "public"."enum_templates_blocks_comparison_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_comparison_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_comparison_ss_container";
  DROP TYPE "public"."enum_templates_blocks_comparison_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_collection_spotlight_variant";
  DROP TYPE "public"."enum_templates_blocks_collection_spotlight_sort";
  DROP TYPE "public"."enum_templates_blocks_collection_spotlight_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_collection_spotlight_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_collection_spotlight_ss_container";
  DROP TYPE "public"."enum_templates_blocks_collection_spotlight_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_newsletter_variant";
  DROP TYPE "public"."enum_templates_blocks_newsletter_privacy_type";
  DROP TYPE "public"."enum_templates_blocks_newsletter_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_newsletter_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_newsletter_ss_container";
  DROP TYPE "public"."enum_templates_blocks_newsletter_ss_visibility";
  DROP TYPE "public"."enum_templates_blocks_form_block_variant";
  DROP TYPE "public"."enum_templates_blocks_form_block_ss_spacing";
  DROP TYPE "public"."enum_templates_blocks_form_block_ss_surface";
  DROP TYPE "public"."enum_templates_blocks_form_block_ss_container";
  DROP TYPE "public"."enum_templates_blocks_form_block_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_rich_text_variant";
  DROP TYPE "public"."enum__templates_v_blocks_rich_text_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_rich_text_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_rich_text_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_rich_text_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_links_link_type";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_links_link_appearance";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_variant";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_image_side";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_media_with_text_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_usp_bar_items_icon";
  DROP TYPE "public"."enum__templates_v_blocks_usp_bar_variant";
  DROP TYPE "public"."enum__templates_v_blocks_usp_bar_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_usp_bar_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_usp_bar_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_usp_bar_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_logo_cloud_variant";
  DROP TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_logo_cloud_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_faq_variant";
  DROP TYPE "public"."enum__templates_v_blocks_faq_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_faq_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_faq_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_faq_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_testimonials_variant";
  DROP TYPE "public"."enum__templates_v_blocks_testimonials_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_testimonials_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_testimonials_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_testimonials_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_video_captions_language";
  DROP TYPE "public"."enum__templates_v_blocks_video_variant";
  DROP TYPE "public"."enum__templates_v_blocks_video_source";
  DROP TYPE "public"."enum__templates_v_blocks_video_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_video_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_video_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_video_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_spacer_variant";
  DROP TYPE "public"."enum__templates_v_blocks_spacer_size";
  DROP TYPE "public"."enum__templates_v_blocks_spacer_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_spacer_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_spacer_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_spacer_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_links_link_type";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_links_link_look";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_variant";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_cs_mode";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_category_showcase_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_links_link_type";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_links_link_look";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_tabs_ps_mode";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_tabs_ps_sort";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_variant";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_display";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_ps_mode";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_ps_sort";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_ps_empty";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_product_collection_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_featured_product_variant";
  DROP TYPE "public"."enum__templates_v_blocks_featured_product_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_featured_product_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_featured_product_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_featured_product_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_bundle_variant";
  DROP TYPE "public"."enum__templates_v_blocks_bundle_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_bundle_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_bundle_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_bundle_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_promo_banner_links_link_type";
  DROP TYPE "public"."enum__templates_v_blocks_promo_banner_links_link_appearance";
  DROP TYPE "public"."enum__templates_v_blocks_promo_banner_variant";
  DROP TYPE "public"."enum__templates_v_blocks_promo_banner_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_promo_banner_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_promo_banner_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_promo_banner_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_comparison_variant";
  DROP TYPE "public"."enum__templates_v_blocks_comparison_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_comparison_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_comparison_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_comparison_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_collection_spotlight_variant";
  DROP TYPE "public"."enum__templates_v_blocks_collection_spotlight_sort";
  DROP TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_collection_spotlight_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_newsletter_variant";
  DROP TYPE "public"."enum__templates_v_blocks_newsletter_privacy_type";
  DROP TYPE "public"."enum__templates_v_blocks_newsletter_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_newsletter_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_newsletter_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_newsletter_ss_visibility";
  DROP TYPE "public"."enum__templates_v_blocks_form_block_variant";
  DROP TYPE "public"."enum__templates_v_blocks_form_block_ss_spacing";
  DROP TYPE "public"."enum__templates_v_blocks_form_block_ss_surface";
  DROP TYPE "public"."enum__templates_v_blocks_form_block_ss_container";
  DROP TYPE "public"."enum__templates_v_blocks_form_block_ss_visibility";`)
}
