// Payload 3.94.1 (M7 T105): "(drizzle): backport long index and foreign key names to 3.x" (#19372).
// A foreign key whose generated name is longer than Postgres's 63 bytes now gets a short name with a
// hash (`…_6c9f2c1e_fk`) instead of the name Postgres truncated. 76 of ours are renamed: each is
// dropped and added again on the same columns, with the same ON DELETE; no data changes.
import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero" DROP CONSTRAINT "pages_blocks_hero_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_category_showcase_cs_items" DROP CONSTRAINT "pages_blocks_category_showcase_cs_items_category_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_category_showcase" DROP CONSTRAINT "pages_blocks_category_showcase_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection_tabs" DROP CONSTRAINT "pages_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection_tabs" DROP CONSTRAINT "pages_blocks_product_collection_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection" DROP CONSTRAINT "pages_blocks_product_collection_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection" DROP CONSTRAINT "pages_blocks_product_collection_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_collection_spotlight" DROP CONSTRAINT "pages_blocks_collection_spotlight_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_hero_2" DROP CONSTRAINT "pages_blocks_hero_2_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" DROP CONSTRAINT "pages_blocks_category_showcase_2_cs_items_category_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_category_showcase_2" DROP CONSTRAINT "pages_blocks_category_showcase_2_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2_tabs" DROP CONSTRAINT "pages_blocks_product_collection_2_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2_tabs" DROP CONSTRAINT "pages_blocks_product_collection_2_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2" DROP CONSTRAINT "pages_blocks_product_collection_2_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2" DROP CONSTRAINT "pages_blocks_product_collection_2_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "pages_blocks_collection_spotlight_2" DROP CONSTRAINT "pages_blocks_collection_spotlight_2_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_collections" DROP CONSTRAINT "_pages_v_blocks_hero_collections_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v" DROP CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_v_blocks_category_showcase" DROP CONSTRAINT "_pages_v_blocks_category_showcase_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection" DROP CONSTRAINT "_pages_v_blocks_product_collection_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection" DROP CONSTRAINT "_pages_v_blocks_product_collection_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_v_blocks_collection_spotlight" DROP CONSTRAINT "_pages_v_blocks_collection_spotlight_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_2_collections" DROP CONSTRAINT "_pages_v_blocks_hero_2_collections_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_2" DROP CONSTRAINT "_pages_v_blocks_hero_2_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_2" DROP CONSTRAINT "_pages_v_blocks_hero_2_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" DROP CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" DROP CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_category_showcase_2" DROP CONSTRAINT "_pages_v_blocks_category_showcase_2_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" DROP CONSTRAINT "_pages_v_blocks_collection_spotlight_2_collection_id_collections_id_fk";
  
  ALTER TABLE "products_blocks_category_showcase_cs_items" DROP CONSTRAINT "products_blocks_category_showcase_cs_items_category_id_categories_id_fk";
  
  ALTER TABLE "products_blocks_category_showcase" DROP CONSTRAINT "products_blocks_category_showcase_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "products_blocks_product_collection_tabs" DROP CONSTRAINT "products_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "products_blocks_product_collection_tabs" DROP CONSTRAINT "products_blocks_product_collection_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "products_blocks_product_collection" DROP CONSTRAINT "products_blocks_product_collection_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "products_blocks_product_collection" DROP CONSTRAINT "products_blocks_product_collection_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "products_blocks_collection_spotlight" DROP CONSTRAINT "products_blocks_collection_spotlight_collection_id_collections_id_fk";
  
  ALTER TABLE "categories_blocks_category_showcase_cs_items" DROP CONSTRAINT "categories_blocks_category_showcase_cs_items_category_id_categories_id_fk";
  
  ALTER TABLE "categories_blocks_category_showcase_cs_items" DROP CONSTRAINT "categories_blocks_category_showcase_cs_items_image_id_media_id_fk";
  
  ALTER TABLE "categories_blocks_category_showcase" DROP CONSTRAINT "categories_blocks_category_showcase_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "categories_blocks_product_collection_tabs" DROP CONSTRAINT "categories_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "categories_blocks_product_collection_tabs" DROP CONSTRAINT "categories_blocks_product_collection_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "categories_blocks_product_collection" DROP CONSTRAINT "categories_blocks_product_collection_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "categories_blocks_product_collection" DROP CONSTRAINT "categories_blocks_product_collection_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "categories_blocks_collection_spotlight" DROP CONSTRAINT "categories_blocks_collection_spotlight_collection_id_collections_id_fk";
  
  ALTER TABLE "collections_blocks_category_showcase_cs_items" DROP CONSTRAINT "collections_blocks_category_showcase_cs_items_category_id_categories_id_fk";
  
  ALTER TABLE "collections_blocks_category_showcase_cs_items" DROP CONSTRAINT "collections_blocks_category_showcase_cs_items_image_id_media_id_fk";
  
  ALTER TABLE "collections_blocks_category_showcase" DROP CONSTRAINT "collections_blocks_category_showcase_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "collections_blocks_product_collection_tabs" DROP CONSTRAINT "collections_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "collections_blocks_product_collection_tabs" DROP CONSTRAINT "collections_blocks_product_collection_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "collections_blocks_product_collection" DROP CONSTRAINT "collections_blocks_product_collection_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "collections_blocks_product_collection" DROP CONSTRAINT "collections_blocks_product_collection_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "collections_blocks_collection_spotlight" DROP CONSTRAINT "collections_blocks_collection_spotlight_collection_id_collections_id_fk";
  
  ALTER TABLE "templates_blocks_category_showcase_cs_items" DROP CONSTRAINT "templates_blocks_category_showcase_cs_items_category_id_categories_id_fk";
  
  ALTER TABLE "templates_blocks_category_showcase_cs_items" DROP CONSTRAINT "templates_blocks_category_showcase_cs_items_image_id_media_id_fk";
  
  ALTER TABLE "templates_blocks_category_showcase" DROP CONSTRAINT "templates_blocks_category_showcase_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "templates_blocks_product_collection_tabs" DROP CONSTRAINT "templates_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "templates_blocks_product_collection_tabs" DROP CONSTRAINT "templates_blocks_product_collection_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "templates_blocks_product_collection" DROP CONSTRAINT "templates_blocks_product_collection_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "templates_blocks_product_collection" DROP CONSTRAINT "templates_blocks_product_collection_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "templates_blocks_collection_spotlight" DROP CONSTRAINT "templates_blocks_collection_spotlight_collection_id_collections_id_fk";
  
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" DROP CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_category_id_categories_id_fk";
  
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" DROP CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_image_id_media_id_fk";
  
  ALTER TABLE "_templates_v_blocks_category_showcase" DROP CONSTRAINT "_templates_v_blocks_category_showcase_category_source_parent_id_categories_id_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" DROP CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" DROP CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection" DROP CONSTRAINT "_templates_v_blocks_product_collection_product_source_collection_id_collections_id_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection" DROP CONSTRAINT "_templates_v_blocks_product_collection_product_source_category_id_categories_id_fk";
  
  ALTER TABLE "_templates_v_blocks_collection_spotlight" DROP CONSTRAINT "_templates_v_blocks_collection_spotlight_collection_id_collections_id_fk";
  
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_product_source_collection_id_coll_6c9f2c1e_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_cs_items_category_id_cdb78753_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase" ADD CONSTRAINT "pages_blocks_category_showcase_category_source_pare_d3f8f4e8_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_tabs" ADD CONSTRAINT "pages_blocks_product_collection_tabs_product_source_5a231237_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_tabs" ADD CONSTRAINT "pages_blocks_product_collection_tabs_product_source_2953483a_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_product_source_coll_32035f7e_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_product_source_cate_67c8d401_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight" ADD CONSTRAINT "pages_blocks_collection_spotlight_collection_id_col_db8484ff_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2" ADD CONSTRAINT "pages_blocks_hero_2_product_source_collection_id_co_87914399_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_2_cs_items_category__2ee9549e_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2" ADD CONSTRAINT "pages_blocks_category_showcase_2_category_source_pa_9deb04db_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2_tabs" ADD CONSTRAINT "pages_blocks_product_collection_2_tabs_product_sour_b56fd302_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2_tabs" ADD CONSTRAINT "pages_blocks_product_collection_2_tabs_product_sour_9ec2d275_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2" ADD CONSTRAINT "pages_blocks_product_collection_2_product_source_co_197bfe39_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2" ADD CONSTRAINT "pages_blocks_product_collection_2_product_source_ca_ae348018_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight_2" ADD CONSTRAINT "pages_blocks_collection_spotlight_2_collection_id_c_c858c09e_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_collections" ADD CONSTRAINT "_pages_v_blocks_hero_collections_collection_id_coll_760e120a_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_product_source_collection_id_c_796f4482_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_product_source_category_id_cat_d848b6f5_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_category_cea4587f_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase" ADD CONSTRAINT "_pages_v_blocks_category_showcase_category_source_p_bd09cdb4_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_sou_da5cae43_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_sou_5ae12db6_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_product_source_c_e3b3e0b2_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_product_source_c_155b0fa5_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_collection_id__15fe36eb_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2_collections" ADD CONSTRAINT "_pages_v_blocks_hero_2_collections_collection_id_co_b25d4173_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_product_source_collection_id_8aa48155_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_product_source_category_id_c_55576e64_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_catego_6ce0c9c6_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_image__51cba5ef_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_2" ADD CONSTRAINT "_pages_v_blocks_category_showcase_2_category_source_e27caeaf_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_s_d95410e6_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_s_af52dbd9_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_1f244085_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_a061db54_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_2_collection_i_d6250142_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_cs_items" ADD CONSTRAINT "products_blocks_category_showcase_cs_items_category_f5d1b395_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase" ADD CONSTRAINT "products_blocks_category_showcase_category_source_p_f5bdd582_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs" ADD CONSTRAINT "products_blocks_product_collection_tabs_product_sou_70d62fb5_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs" ADD CONSTRAINT "products_blocks_product_collection_tabs_product_sou_ae0b6d44_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_product_source_c_a280e7ec_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_product_source_c_01282a1b_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_collection_spotlight" ADD CONSTRAINT "products_blocks_collection_spotlight_collection_id__c2ad71e5_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_catego_2f289775_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_image__a3ad25e4_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase" ADD CONSTRAINT "categories_blocks_category_showcase_category_source_46058e62_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs" ADD CONSTRAINT "categories_blocks_product_collection_tabs_product_s_6aea36d5_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs" ADD CONSTRAINT "categories_blocks_product_collection_tabs_product_s_f8819ee4_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_product_source_98314ecc_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_product_source_0959f9fb_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_collection_spotlight" ADD CONSTRAINT "categories_blocks_collection_spotlight_collection_i_af5649c5_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_categ_611c2860_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_image_8bd6b029_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase" ADD CONSTRAINT "collections_blocks_category_showcase_category_sourc_ac2e85dd_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs" ADD CONSTRAINT "collections_blocks_product_collection_tabs_product__ae419cba_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs" ADD CONSTRAINT "collections_blocks_product_collection_tabs_product__d110957d_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_product_sourc_197a15d1_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_product_sourc_18312e20_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_collection_spotlight" ADD CONSTRAINT "collections_blocks_collection_spotlight_collection__c610da7e_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_categor_11103b0e_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_image_i_d496be17_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase" ADD CONSTRAINT "templates_blocks_category_showcase_category_source__5cce568b_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs" ADD CONSTRAINT "templates_blocks_product_collection_tabs_product_so_5f1e972c_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs" ADD CONSTRAINT "templates_blocks_product_collection_tabs_product_so_20d0695b_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_product_source__4511ea0b_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_product_source__e736696e_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_collection_spotlight" ADD CONSTRAINT "templates_blocks_collection_spotlight_collection_id_c3390f50_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_cate_602a875a_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_imag_aa9b547b_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_category_showcase" ADD CONSTRAINT "_templates_v_blocks_category_showcase_category_sour_7a921a17_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_cc088368_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_fec06b17_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_product_sour_9901613f_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_product_sour_4bd452d2_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_collection_spotlight" ADD CONSTRAINT "_templates_v_blocks_collection_spotlight_collection_1028605c_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero" DROP CONSTRAINT "pages_blocks_hero_product_source_collection_id_coll_6c9f2c1e_fk";
  
  ALTER TABLE "pages_blocks_category_showcase_cs_items" DROP CONSTRAINT "pages_blocks_category_showcase_cs_items_category_id_cdb78753_fk";
  
  ALTER TABLE "pages_blocks_category_showcase" DROP CONSTRAINT "pages_blocks_category_showcase_category_source_pare_d3f8f4e8_fk";
  
  ALTER TABLE "pages_blocks_product_collection_tabs" DROP CONSTRAINT "pages_blocks_product_collection_tabs_product_source_5a231237_fk";
  
  ALTER TABLE "pages_blocks_product_collection_tabs" DROP CONSTRAINT "pages_blocks_product_collection_tabs_product_source_2953483a_fk";
  
  ALTER TABLE "pages_blocks_product_collection" DROP CONSTRAINT "pages_blocks_product_collection_product_source_coll_32035f7e_fk";
  
  ALTER TABLE "pages_blocks_product_collection" DROP CONSTRAINT "pages_blocks_product_collection_product_source_cate_67c8d401_fk";
  
  ALTER TABLE "pages_blocks_collection_spotlight" DROP CONSTRAINT "pages_blocks_collection_spotlight_collection_id_col_db8484ff_fk";
  
  ALTER TABLE "pages_blocks_hero_2" DROP CONSTRAINT "pages_blocks_hero_2_product_source_collection_id_co_87914399_fk";
  
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" DROP CONSTRAINT "pages_blocks_category_showcase_2_cs_items_category__2ee9549e_fk";
  
  ALTER TABLE "pages_blocks_category_showcase_2" DROP CONSTRAINT "pages_blocks_category_showcase_2_category_source_pa_9deb04db_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2_tabs" DROP CONSTRAINT "pages_blocks_product_collection_2_tabs_product_sour_b56fd302_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2_tabs" DROP CONSTRAINT "pages_blocks_product_collection_2_tabs_product_sour_9ec2d275_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2" DROP CONSTRAINT "pages_blocks_product_collection_2_product_source_co_197bfe39_fk";
  
  ALTER TABLE "pages_blocks_product_collection_2" DROP CONSTRAINT "pages_blocks_product_collection_2_product_source_ca_ae348018_fk";
  
  ALTER TABLE "pages_blocks_collection_spotlight_2" DROP CONSTRAINT "pages_blocks_collection_spotlight_2_collection_id_c_c858c09e_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_collections" DROP CONSTRAINT "_pages_v_blocks_hero_collections_collection_id_coll_760e120a_fk";
  
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_product_source_collection_id_c_796f4482_fk";
  
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_product_source_category_id_cat_d848b6f5_fk";
  
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v" DROP CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_category_cea4587f_fk";
  
  ALTER TABLE "_pages_v_blocks_category_showcase" DROP CONSTRAINT "_pages_v_blocks_category_showcase_category_source_p_bd09cdb4_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_sou_da5cae43_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_sou_5ae12db6_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection" DROP CONSTRAINT "_pages_v_blocks_product_collection_product_source_c_e3b3e0b2_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection" DROP CONSTRAINT "_pages_v_blocks_product_collection_product_source_c_155b0fa5_fk";
  
  ALTER TABLE "_pages_v_blocks_collection_spotlight" DROP CONSTRAINT "_pages_v_blocks_collection_spotlight_collection_id__15fe36eb_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_2_collections" DROP CONSTRAINT "_pages_v_blocks_hero_2_collections_collection_id_co_b25d4173_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_2" DROP CONSTRAINT "_pages_v_blocks_hero_2_product_source_collection_id_8aa48155_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_2" DROP CONSTRAINT "_pages_v_blocks_hero_2_product_source_category_id_c_55576e64_fk";
  
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" DROP CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_catego_6ce0c9c6_fk";
  
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" DROP CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_image__51cba5ef_fk";
  
  ALTER TABLE "_pages_v_blocks_category_showcase_2" DROP CONSTRAINT "_pages_v_blocks_category_showcase_2_category_source_e27caeaf_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_s_d95410e6_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_s_af52dbd9_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_1f244085_fk";
  
  ALTER TABLE "_pages_v_blocks_product_collection_2" DROP CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_a061db54_fk";
  
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" DROP CONSTRAINT "_pages_v_blocks_collection_spotlight_2_collection_i_d6250142_fk";
  
  ALTER TABLE "products_blocks_category_showcase_cs_items" DROP CONSTRAINT "products_blocks_category_showcase_cs_items_category_f5d1b395_fk";
  
  ALTER TABLE "products_blocks_category_showcase" DROP CONSTRAINT "products_blocks_category_showcase_category_source_p_f5bdd582_fk";
  
  ALTER TABLE "products_blocks_product_collection_tabs" DROP CONSTRAINT "products_blocks_product_collection_tabs_product_sou_70d62fb5_fk";
  
  ALTER TABLE "products_blocks_product_collection_tabs" DROP CONSTRAINT "products_blocks_product_collection_tabs_product_sou_ae0b6d44_fk";
  
  ALTER TABLE "products_blocks_product_collection" DROP CONSTRAINT "products_blocks_product_collection_product_source_c_a280e7ec_fk";
  
  ALTER TABLE "products_blocks_product_collection" DROP CONSTRAINT "products_blocks_product_collection_product_source_c_01282a1b_fk";
  
  ALTER TABLE "products_blocks_collection_spotlight" DROP CONSTRAINT "products_blocks_collection_spotlight_collection_id__c2ad71e5_fk";
  
  ALTER TABLE "categories_blocks_category_showcase_cs_items" DROP CONSTRAINT "categories_blocks_category_showcase_cs_items_catego_2f289775_fk";
  
  ALTER TABLE "categories_blocks_category_showcase_cs_items" DROP CONSTRAINT "categories_blocks_category_showcase_cs_items_image__a3ad25e4_fk";
  
  ALTER TABLE "categories_blocks_category_showcase" DROP CONSTRAINT "categories_blocks_category_showcase_category_source_46058e62_fk";
  
  ALTER TABLE "categories_blocks_product_collection_tabs" DROP CONSTRAINT "categories_blocks_product_collection_tabs_product_s_6aea36d5_fk";
  
  ALTER TABLE "categories_blocks_product_collection_tabs" DROP CONSTRAINT "categories_blocks_product_collection_tabs_product_s_f8819ee4_fk";
  
  ALTER TABLE "categories_blocks_product_collection" DROP CONSTRAINT "categories_blocks_product_collection_product_source_98314ecc_fk";
  
  ALTER TABLE "categories_blocks_product_collection" DROP CONSTRAINT "categories_blocks_product_collection_product_source_0959f9fb_fk";
  
  ALTER TABLE "categories_blocks_collection_spotlight" DROP CONSTRAINT "categories_blocks_collection_spotlight_collection_i_af5649c5_fk";
  
  ALTER TABLE "collections_blocks_category_showcase_cs_items" DROP CONSTRAINT "collections_blocks_category_showcase_cs_items_categ_611c2860_fk";
  
  ALTER TABLE "collections_blocks_category_showcase_cs_items" DROP CONSTRAINT "collections_blocks_category_showcase_cs_items_image_8bd6b029_fk";
  
  ALTER TABLE "collections_blocks_category_showcase" DROP CONSTRAINT "collections_blocks_category_showcase_category_sourc_ac2e85dd_fk";
  
  ALTER TABLE "collections_blocks_product_collection_tabs" DROP CONSTRAINT "collections_blocks_product_collection_tabs_product__ae419cba_fk";
  
  ALTER TABLE "collections_blocks_product_collection_tabs" DROP CONSTRAINT "collections_blocks_product_collection_tabs_product__d110957d_fk";
  
  ALTER TABLE "collections_blocks_product_collection" DROP CONSTRAINT "collections_blocks_product_collection_product_sourc_197a15d1_fk";
  
  ALTER TABLE "collections_blocks_product_collection" DROP CONSTRAINT "collections_blocks_product_collection_product_sourc_18312e20_fk";
  
  ALTER TABLE "collections_blocks_collection_spotlight" DROP CONSTRAINT "collections_blocks_collection_spotlight_collection__c610da7e_fk";
  
  ALTER TABLE "templates_blocks_category_showcase_cs_items" DROP CONSTRAINT "templates_blocks_category_showcase_cs_items_categor_11103b0e_fk";
  
  ALTER TABLE "templates_blocks_category_showcase_cs_items" DROP CONSTRAINT "templates_blocks_category_showcase_cs_items_image_i_d496be17_fk";
  
  ALTER TABLE "templates_blocks_category_showcase" DROP CONSTRAINT "templates_blocks_category_showcase_category_source__5cce568b_fk";
  
  ALTER TABLE "templates_blocks_product_collection_tabs" DROP CONSTRAINT "templates_blocks_product_collection_tabs_product_so_5f1e972c_fk";
  
  ALTER TABLE "templates_blocks_product_collection_tabs" DROP CONSTRAINT "templates_blocks_product_collection_tabs_product_so_20d0695b_fk";
  
  ALTER TABLE "templates_blocks_product_collection" DROP CONSTRAINT "templates_blocks_product_collection_product_source__4511ea0b_fk";
  
  ALTER TABLE "templates_blocks_product_collection" DROP CONSTRAINT "templates_blocks_product_collection_product_source__e736696e_fk";
  
  ALTER TABLE "templates_blocks_collection_spotlight" DROP CONSTRAINT "templates_blocks_collection_spotlight_collection_id_c3390f50_fk";
  
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" DROP CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_cate_602a875a_fk";
  
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" DROP CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_imag_aa9b547b_fk";
  
  ALTER TABLE "_templates_v_blocks_category_showcase" DROP CONSTRAINT "_templates_v_blocks_category_showcase_category_sour_7a921a17_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" DROP CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_cc088368_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" DROP CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_fec06b17_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection" DROP CONSTRAINT "_templates_v_blocks_product_collection_product_sour_9901613f_fk";
  
  ALTER TABLE "_templates_v_blocks_product_collection" DROP CONSTRAINT "_templates_v_blocks_product_collection_product_sour_4bd452d2_fk";
  
  ALTER TABLE "_templates_v_blocks_collection_spotlight" DROP CONSTRAINT "_templates_v_blocks_collection_spotlight_collection_1028605c_fk";
  
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase" ADD CONSTRAINT "pages_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_tabs" ADD CONSTRAINT "pages_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_tabs" ADD CONSTRAINT "pages_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection" ADD CONSTRAINT "pages_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight" ADD CONSTRAINT "pages_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_2" ADD CONSTRAINT "pages_blocks_hero_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2_cs_items" ADD CONSTRAINT "pages_blocks_category_showcase_2_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_category_showcase_2" ADD CONSTRAINT "pages_blocks_category_showcase_2_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2_tabs" ADD CONSTRAINT "pages_blocks_product_collection_2_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2_tabs" ADD CONSTRAINT "pages_blocks_product_collection_2_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2" ADD CONSTRAINT "pages_blocks_product_collection_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_collection_2" ADD CONSTRAINT "pages_blocks_product_collection_2_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_collection_spotlight_2" ADD CONSTRAINT "pages_blocks_collection_spotlight_2_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_collections" ADD CONSTRAINT "_pages_v_blocks_hero_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_cs_items_v_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase" ADD CONSTRAINT "_pages_v_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection" ADD CONSTRAINT "_pages_v_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2_collections" ADD CONSTRAINT "_pages_v_blocks_hero_2_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_2" ADD CONSTRAINT "_pages_v_blocks_hero_2_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_blocks_category_showcase_2_cs_items_v" ADD CONSTRAINT "_pages_blocks_category_showcase_2_cs_items_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_category_showcase_2" ADD CONSTRAINT "_pages_v_blocks_category_showcase_2_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2_tabs" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_collection_2" ADD CONSTRAINT "_pages_v_blocks_product_collection_2_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_collection_spotlight_2" ADD CONSTRAINT "_pages_v_blocks_collection_spotlight_2_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase_cs_items" ADD CONSTRAINT "products_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_category_showcase" ADD CONSTRAINT "products_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs" ADD CONSTRAINT "products_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection_tabs" ADD CONSTRAINT "products_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_collection" ADD CONSTRAINT "products_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_collection_spotlight" ADD CONSTRAINT "products_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase_cs_items" ADD CONSTRAINT "categories_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_category_showcase" ADD CONSTRAINT "categories_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs" ADD CONSTRAINT "categories_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection_tabs" ADD CONSTRAINT "categories_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_product_collection" ADD CONSTRAINT "categories_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_blocks_collection_spotlight" ADD CONSTRAINT "categories_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase_cs_items" ADD CONSTRAINT "collections_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_category_showcase" ADD CONSTRAINT "collections_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs" ADD CONSTRAINT "collections_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection_tabs" ADD CONSTRAINT "collections_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_product_collection" ADD CONSTRAINT "collections_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_blocks_collection_spotlight" ADD CONSTRAINT "collections_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase_cs_items" ADD CONSTRAINT "templates_blocks_category_showcase_cs_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_category_showcase" ADD CONSTRAINT "templates_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs" ADD CONSTRAINT "templates_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection_tabs" ADD CONSTRAINT "templates_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_product_collection" ADD CONSTRAINT "templates_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "templates_blocks_collection_spotlight" ADD CONSTRAINT "templates_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_blocks_category_showcase_cs_items_v" ADD CONSTRAINT "_templates_blocks_category_showcase_cs_items_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_category_showcase" ADD CONSTRAINT "_templates_v_blocks_category_showcase_category_source_parent_id_categories_id_fk" FOREIGN KEY ("category_source_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection_tabs" ADD CONSTRAINT "_templates_v_blocks_product_collection_tabs_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_product_source_collection_id_collections_id_fk" FOREIGN KEY ("product_source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_product_collection" ADD CONSTRAINT "_templates_v_blocks_product_collection_product_source_category_id_categories_id_fk" FOREIGN KEY ("product_source_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_templates_v_blocks_collection_spotlight" ADD CONSTRAINT "_templates_v_blocks_collection_spotlight_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;`);
}
