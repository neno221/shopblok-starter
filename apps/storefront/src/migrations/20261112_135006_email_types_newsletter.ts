import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_newsletter_confirmations_destination" AS ENUM('resend', 'submission');
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'order-placed';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'order-shipped';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'order-canceled';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'return-requested';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'refund-issued';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'welcome';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'admin-invite';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'newsletter-confirm';
  ALTER TYPE "public"."enum_email_templates_type" ADD VALUE 'form-message';
  CREATE TABLE "newsletter_confirmations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token_id" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"form" numeric,
  	"market" varchar NOT NULL,
  	"language" varchar NOT NULL,
  	"destination" "enum_newsletter_confirmations_destination",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forms_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email_to" varchar,
  	"cc" varchar,
  	"bcc" varchar,
  	"reply_to" varchar
  );
  
  CREATE TABLE "forms_emails_locales" (
  	"subject" varchar DEFAULT 'New answer to {{form}}' NOT NULL,
  	"message" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "newsletter_confirmations_id" integer;
  ALTER TABLE "forms_emails" ADD CONSTRAINT "forms_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_emails_locales" ADD CONSTRAINT "forms_emails_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_emails"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "newsletter_confirmations_token_id_idx" ON "newsletter_confirmations" USING btree ("token_id");
  CREATE INDEX "newsletter_confirmations_updated_at_idx" ON "newsletter_confirmations" USING btree ("updated_at");
  CREATE INDEX "newsletter_confirmations_created_at_idx" ON "newsletter_confirmations" USING btree ("created_at");
  CREATE INDEX "forms_emails_order_idx" ON "forms_emails" USING btree ("_order");
  CREATE INDEX "forms_emails_parent_id_idx" ON "forms_emails" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_emails_locales_locale_parent_id_unique" ON "forms_emails_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_emails_locales_parent_id_idx" ON "forms_emails_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_confirmations_fk" FOREIGN KEY ("newsletter_confirmations_id") REFERENCES "public"."newsletter_confirmations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_newsletter_confirmations_i_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_confirmations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "newsletter_confirmations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_emails_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "newsletter_confirmations" CASCADE;
  DROP TABLE "forms_emails" CASCADE;
  DROP TABLE "forms_emails_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_newsletter_confirmations_fk";
  
  DELETE FROM "email_templates" WHERE "type" NOT IN ('verify-email', 'password-reset', 'order-transfer');
  ALTER TABLE "email_templates" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_email_templates_type";
  CREATE TYPE "public"."enum_email_templates_type" AS ENUM('verify-email', 'password-reset', 'order-transfer');
  ALTER TABLE "email_templates" ALTER COLUMN "type" SET DATA TYPE "public"."enum_email_templates_type" USING "type"::"public"."enum_email_templates_type";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_newsletter_confirmations_i_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "newsletter_confirmations_id";
  DROP TYPE "public"."enum_newsletter_confirmations_destination";`)
}
