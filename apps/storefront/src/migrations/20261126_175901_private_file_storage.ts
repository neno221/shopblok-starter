import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "exports" ADD COLUMN "prefix" varchar DEFAULT 'payload-exports';
  ALTER TABLE "exports" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "imports" ADD COLUMN "prefix" varchar DEFAULT 'payload-imports';
  ALTER TABLE "imports" ADD COLUMN "_objectkey" varchar;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "exports" DROP COLUMN "prefix";
  ALTER TABLE "exports" DROP COLUMN "_objectkey";
  ALTER TABLE "imports" DROP COLUMN "prefix";
  ALTER TABLE "imports" DROP COLUMN "_objectkey";`);
}
