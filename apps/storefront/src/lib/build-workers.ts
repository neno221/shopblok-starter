import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { env, type RawEnv } from "./env";

// How hard `next build` leans on the stack it prerenders against (W6 item 7). Next starts one
// static-generation worker per logical processor less one, and each worker renders up to eight
// pages at once with its own Payload database pool (pg's default: up to 10 connections). On a
// 12-thread PC that is 11 workers: Postgres (100 connections) runs out, and with more connections
// `medusa develop` cannot answer the prerender requests within 10 s. CI's runners and the cloud VM
// have 4 threads, so 3 workers, and never see it. So the build caps the workers (Next's
// `experimental.cpus`) and, during the build only, Payload's pool.

/**
 * The most static-generation workers a build starts unless `STOREFRONT_BUILD_WORKERS` says: CI's
 * count, which the W6 laptop built at against `medusa develop` (more were not tried there).
 */
export const BUILD_WORKERS_CAP = 3;

/**
 * Payload's pool per build worker: a worker renders up to eight pages at once, and a query holds
 * a connection for milliseconds, so five keep it busy; 11 workers then stay at 55 of Postgres's 100.
 */
export const BUILD_DB_POOL_MAX = 5;

/**
 * The static-generation workers of `next build`: `STOREFRONT_BUILD_WORKERS` when set (a whole
 * number from 1), else Next's own count (`cpus - 1`, at least 1) capped at `BUILD_WORKERS_CAP`.
 */
export function buildWorkers(cpus: number, source: RawEnv = env): number {
  const raw = source.STOREFRONT_BUILD_WORKERS?.trim();
  if (raw !== undefined && raw !== "") {
    if (!/^\d+$/.test(raw) || Number(raw) < 1)
      throw new Error(`STOREFRONT_BUILD_WORKERS must be a whole number from 1, not "${raw}"`);
    return Number(raw);
  }
  return Math.max(1, Math.min(cpus - 1, BUILD_WORKERS_CAP));
}

/** Whether this process is part of `next build` (its workers included). */
export function isBuildPhase(source: RawEnv = env): boolean {
  return source.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
}
