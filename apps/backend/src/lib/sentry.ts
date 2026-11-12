/**
 * Medusa's errors to Sentry (M6 D125, T96), only with `SENTRY_DSN`. `instrumentation.ts` calls
 * `startSentry` when the backend starts; without a DSN nothing here loads Sentry's SDK and every
 * report below does nothing.
 *
 * What is reported: an error a route or a middleware threw that Medusa answers with a 5xx (the
 * error handler in `api/middlewares.ts`), a subscriber that failed (Medusa's event bus only logs
 * it), and a workflow step that failed with a server error (a scheduled job is a workflow of one
 * step, so its failure is one). A 4xx is the caller's (a validation error, a missing product) and is
 * not reported. Every event goes through `sentry-scrub.ts`'s hooks.
 *
 * Tracing (D125): at `SENTRY_TRACES_SAMPLE_RATE` (0, none, by default). Sentry 11's SDK no longer
 * takes over an OpenTelemetry setup and has no span processor or propagator of its own to hand over
 * any more, so Medusa's `registerOtel` keeps the provider and Sentry receives its spans over OTLP
 * (`getOtlpTracesEndpoint`), as Sentry's "use your own OpenTelemetry pipeline" says; the spans are
 * scrubbed before they leave, since Sentry's `beforeSendSpan` never sees spans sent that way.
 */
import { getHttpResponseFromError } from "@medusajs/framework/http"
import { TransactionOrchestrator } from "@medusajs/framework/orchestration"
import { SubscriberLoader } from "@medusajs/framework/subscribers"
import { MedusaError } from "@medusajs/framework/utils"
import type * as SentryNode from "@sentry/node"
import { dataCollection, scrubAttributes, scrubHooks, scrubUrl } from "./sentry-scrub"

type Env = Readonly<Record<string, string | undefined>>
type Sentry = Pick<typeof SentryNode, "captureException" | "withScope">

/**
 * The SDK once started. On `globalThis`, because `instrumentation.ts` and the API's middlewares may
 * reach this file through different loaders (Medusa imports the instrumentation file itself).
 */
const STATE = Symbol.for("shopblok.sentry")
const state = globalThis as { [STATE]?: Sentry }

export const sentryDsn = (env: Env): string | undefined => env.SENTRY_DSN?.trim() || undefined

/** `SENTRY_TRACES_SAMPLE_RATE` as a rate, 0 (no tracing, D125's default) when blank or invalid. */
export function tracesRate(value: string | undefined): number {
  const rate = Number((value ?? "").trim() || "0")
  return Number.isFinite(rate) && rate > 0 && rate <= 1 ? rate : 0
}

/** The release: `SENTRY_RELEASE`, else the commit Railway or GitHub Actions runs. */
export const sentryRelease = (env: Env): string | undefined =>
  env.SENTRY_RELEASE?.trim() ||
  env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
  env.GITHUB_SHA?.trim() ||
  undefined

/** The options of Medusa's `Sentry.init`, without the SDK's own integrations. */
export function sentryOptions(env: Env) {
  return {
    dsn: sentryDsn(env),
    environment: env.SENTRY_ENVIRONMENT?.trim() || undefined,
    release: sentryRelease(env),
    dataCollection,
    ...scrubHooks,
    // OpenTelemetry owns tracing (see the top of this file): Sentry samples nothing itself.
    enableOpenTelemetrySetup: false,
  }
}

/** Whether Medusa answers `error` with a 5xx (the rule its error handler follows). */
export function isServerError(error: unknown): boolean {
  return getHttpResponseFromError(error).statusCode >= 500
}

export type ReportContext = {
  tags?: Record<string, string | number | boolean | undefined>
  request?: { method?: string; url?: string; headers?: Record<string, unknown> }
}

/** The SDK `report` sends through (`startSentry` sets it; a test sets a fake). */
export function useSentry(sentry: Sentry | undefined): void {
  state[STATE] = sentry
}

/** Sends `error` to Sentry with `context`; nothing without a started SDK. */
export function report(error: unknown, context: ReportContext = {}): void {
  const sentry = state[STATE]
  if (sentry === undefined) return
  sentry.withScope((scope) => {
    scope.setTag("app", "medusa")
    for (const [name, value] of Object.entries(context.tags ?? {}))
      if (value !== undefined) scope.setTag(name, value)
    const request = context.request
    if (request !== undefined)
      scope.addEventProcessor((event) => ({
        ...event,
        request: {
          ...event.request,
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(
            Object.entries(request.headers ?? {}).flatMap(([name, value]) =>
              typeof value === "string" ? [[name, value]] : [],
            ),
          ),
        },
      }))
    sentry.captureException(error)
  })
}

type RequestLike = {
  method?: string
  originalUrl?: string
  url?: string
  headers?: Record<string, unknown>
  route?: { path?: unknown }
}

/** The API's error handler (`api/middlewares.ts`): a 5xx goes to Sentry, a 4xx does not. */
export function reportRequestError(error: unknown, req: RequestLike): void {
  if (!isServerError(error)) return
  report(error, {
    tags: { "medusa.route": typeof req.route?.path === "string" ? req.route.path : undefined },
    // The scrubber (`beforeSend`) keeps only the harmless headers and no value of a key.
    request: { method: req.method, url: req.originalUrl ?? req.url, headers: req.headers },
  })
}

type StepTrace = NonNullable<typeof TransactionOrchestrator.traceStep>
type StepMetadata = Parameters<StepTrace>[1]

/**
 * A failed workflow step: wraps the step's handler (inside Medusa's own tracing span when
 * `registerOtel` set one), reports a server error and throws it on unchanged. The orchestrator's
 * expected errors (a step skipped, a transaction already moving on) are control flow, not failures.
 */
export function hookWorkflowSteps(orchestrator: { traceStep?: StepTrace } = TransactionOrchestrator) {
  const previous = orchestrator.traceStep
  const traced: StepTrace = (handler, metadata) => {
    const reported = async (...args: unknown[]) => {
      try {
        return await handler(...args)
      } catch (error) {
        reportStepFailure(error, metadata)
        throw error
      }
    }
    return previous ? previous(reported, metadata) : reported()
  }
  orchestrator.traceStep = traced
}

export function reportStepFailure(error: unknown, metadata: StepMetadata): void {
  if (error instanceof Error && TransactionOrchestrator.isExpectedError(error)) return
  if (!isServerError(error)) return
  report(error, {
    tags: {
      "medusa.step": metadata.action,
      "medusa.step_type": metadata.type,
      "medusa.step_attempt": metadata.attempts,
    },
  })
}

type SubscriberArgs = {
  fileName: string
  config: { event: string | string[]; context?: { subscriberId?: string } }
  handler: (input: { event: { name: string } }) => unknown
}
type LoaderLike = { createSubscriber?: (this: unknown, args: SubscriberArgs) => void }

/**
 * A failed subscriber: Medusa's event bus catches what a subscriber throws and only logs a warning,
 * so each subscriber Medusa loads (the shop's, its plugins' and Medusa's own) is wrapped where the
 * loader registers it. The wrapper keeps the handler's name, from which Medusa takes the
 * subscriber's id. `backend` fails its unit test if the loader stops having `createSubscriber`.
 */
export function hookSubscribers(loader: LoaderLike = SubscriberLoader.prototype as LoaderLike) {
  const original = loader.createSubscriber
  if (typeof original !== "function")
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "sentry: Medusa's SubscriberLoader has no createSubscriber to wrap",
    )
  loader.createSubscriber = function (this: unknown, args: SubscriberArgs) {
    const { handler } = args
    const reported = async function (this: unknown, input: { event: { name: string } }) {
      try {
        return await handler.call(this, input)
      } catch (error) {
        report(error, {
          tags: {
            "medusa.subscriber": args.config.context?.subscriberId ?? args.fileName,
            "medusa.event": input?.event?.name,
          },
        })
        throw error
      }
    }
    Object.defineProperty(reported, "name", { value: handler.name })
    return original.call(this, { ...args, handler: reported })
  }
}

type ReadableSpanLike = { name: string; attributes: Record<string, unknown> }

/** A span on its way out over OTLP, scrubbed in place (its name and every text attribute). */
export function scrubOtelSpan(span: ReadableSpanLike): void {
  ;(span as { name: string }).name = scrubUrl(span.name)
  Object.assign(span.attributes, scrubAttributes(span.attributes))
}

/**
 * Starts Sentry with `env`'s DSN: the SDK, then the hooks. Returns whether it did. With a traces'
 * rate, Medusa's OpenTelemetry first (Sentry's custom-setup guide: the provider before
 * `Sentry.init`), its spans exported to Sentry's OTLP endpoint, scrubbed, at that rate.
 */
export async function startSentry(env: Env): Promise<boolean> {
  const dsn = sentryDsn(env)
  if (dsn === undefined) return false
  const Sentry = await import("@sentry/node")
  const rate = tracesRate(env.SENTRY_TRACES_SAMPLE_RATE)
  if (rate > 0) await startTracing(dsn, rate, Sentry)
  Sentry.init({
    ...sentryOptions(env),
    ...(rate > 0 ? { integrations: [Sentry.openTelemetryIntegration()] } : {}),
  })
  useSentry(Sentry)
  hookWorkflowSteps()
  hookSubscribers()
  return true
}

async function startTracing(dsn: string, rate: number, Sentry: typeof SentryNode) {
  const endpoint = Sentry.getOtlpTracesEndpoint(dsn)
  if (endpoint === undefined)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "sentry: SENTRY_DSN is not a DSN Sentry can read",
    )
  const [{ registerOtel }, { OTLPTraceExporter }, { BatchSpanProcessor, TraceIdRatioBasedSampler }] =
    await Promise.all([
      import("@medusajs/medusa"),
      import("@opentelemetry/exporter-trace-otlp-http"),
      import("@medusajs/framework/opentelemetry/sdk-trace-node"),
    ])
  const exporter = new OTLPTraceExporter(endpoint)
  type Spans = Parameters<typeof exporter.export>[0]
  const scrubbing = {
    export: (spans: Spans, done: Parameters<typeof exporter.export>[1]) => {
      for (const span of spans) scrubOtelSpan(span as unknown as ReadableSpanLike)
      exporter.export(spans, done)
    },
    shutdown: () => exporter.shutdown(),
    forceFlush: () => exporter.forceFlush(),
  }
  registerOtel({
    serviceName: "medusa",
    exporter: scrubbing,
    spanProcessors: [new BatchSpanProcessor(scrubbing)],
    sampler: new TraceIdRatioBasedSampler(rate),
    // Medusa's HTTP spans keep only `fields`, `expand`, `limit`, `offset`, `order` and
    // `with_deleted` of a query, and no header that can carry a credential.
    instrument: { http: true, workflows: true, query: true },
  })
}
