import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261031003441 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "market_language" drop constraint if exists "market_language_code_unique";`);
    this.addSql(`alter table if exists "market_country" drop constraint if exists "market_country_domain_unique";`);
    this.addSql(`alter table if exists "market_country" drop constraint if exists "market_country_code_unique";`);
    this.addSql(`create table if not exists "market_country" ("id" text not null, "code" text not null, "enabled" boolean not null default false, "languages" text[] not null default '{}', "domain" text null, "time_zone" text null, "rank" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "market_country_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_market_country_code_unique" ON "market_country" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_market_country_domain_unique" ON "market_country" ("domain") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_market_country_deleted_at" ON "market_country" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "market_language" ("id" text not null, "code" text not null, "medusa_locale" text not null, "html_lang" text null, "rank" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "market_language_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_market_language_code_unique" ON "market_language" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_market_language_deleted_at" ON "market_language" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "market_settings" ("id" text not null, "primary_country" text null, "fallback_market" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "market_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_market_settings_deleted_at" ON "market_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "market_country" cascade;`);

    this.addSql(`drop table if exists "market_language" cascade;`);

    this.addSql(`drop table if exists "market_settings" cascade;`);
  }

}
