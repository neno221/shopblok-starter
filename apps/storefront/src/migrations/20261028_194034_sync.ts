import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"medusa_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"handle" varchar NOT NULL,
  	"thumbnail" varchar,
  	"deleted_in_medusa" boolean DEFAULT false,
  	"medusa_updated_at" timestamp(3) with time zone,
  	"synced_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"medusa_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"handle" varchar NOT NULL,
  	"parent_id" integer,
  	"rank" numeric,
  	"deleted_in_medusa" boolean DEFAULT false,
  	"medusa_updated_at" timestamp(3) with time zone,
  	"synced_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"medusa_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"handle" varchar NOT NULL,
  	"deleted_in_medusa" boolean DEFAULT false,
  	"medusa_updated_at" timestamp(3) with time zone,
  	"synced_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "markets_synced_regions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"medusa_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"currency" varchar NOT NULL
  );
  
  CREATE TABLE "markets_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "collections_id" integer;
  ALTER TABLE "markets" ADD COLUMN "synced_default_currency" varchar;
  ALTER TABLE "markets" ADD COLUMN "synced_synced_at" timestamp(3) with time zone;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "markets_synced_regions" ADD CONSTRAINT "markets_synced_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "markets_texts" ADD CONSTRAINT "markets_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "products_medusa_id_idx" ON "products" USING btree ("medusa_id");
  CREATE INDEX "products_handle_idx" ON "products" USING btree ("handle");
  CREATE INDEX "products_deleted_in_medusa_idx" ON "products" USING btree ("deleted_in_medusa");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_medusa_id_idx" ON "categories" USING btree ("medusa_id");
  CREATE INDEX "categories_handle_idx" ON "categories" USING btree ("handle");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_deleted_in_medusa_idx" ON "categories" USING btree ("deleted_in_medusa");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "collections_medusa_id_idx" ON "collections" USING btree ("medusa_id");
  CREATE INDEX "collections_handle_idx" ON "collections" USING btree ("handle");
  CREATE INDEX "collections_deleted_in_medusa_idx" ON "collections" USING btree ("deleted_in_medusa");
  CREATE INDEX "collections_updated_at_idx" ON "collections" USING btree ("updated_at");
  CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");
  CREATE INDEX "markets_synced_regions_order_idx" ON "markets_synced_regions" USING btree ("_order");
  CREATE INDEX "markets_synced_regions_parent_id_idx" ON "markets_synced_regions" USING btree ("_parent_id");
  CREATE INDEX "markets_texts_order_parent" ON "markets_texts" USING btree ("order","parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("collections_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "markets_synced_regions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "markets_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "collections" CASCADE;
  DROP TABLE "markets_synced_regions" CASCADE;
  DROP TABLE "markets_texts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_products_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_collections_fk";
  
  DROP INDEX "payload_locked_documents_rels_products_id_idx";
  DROP INDEX "payload_locked_documents_rels_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_collections_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "products_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "collections_id";
  ALTER TABLE "markets" DROP COLUMN "synced_default_currency";
  ALTER TABLE "markets" DROP COLUMN "synced_synced_at";`);
}
