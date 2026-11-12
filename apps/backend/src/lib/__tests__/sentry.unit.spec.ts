import { readFileSync } from "node:fs"
import path from "node:path"
import { MedusaError } from "@medusajs/framework/utils"
import { SubscriberLoader } from "@medusajs/framework/subscribers"
import { TransactionOrchestrator } from "@medusajs/framework/orchestration"
import {
  hookSubscribers,
  hookWorkflowSteps,
  isServerError,
  reportRequestError,
  scrubOtelSpan,
  sentryOptions,
  tracesRate,
  useSentry,
} from "../sentry"
import { FILTERED, scrubEvent, scrubHooks, scrubText, scrubUrl } from "../sentry-scrub"

// The cases the storefront's scrubber runs too (M6 D125, T96): the two copies cannot drift.
const cases = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../../../../packages/integrations/src/sentry-scrub-cases.json"),
    "utf8"
  )
) as { url: [string, string][]; text: [string, string][] }

const SECRETS = ["s3cr3t-token", "c0de-42", "ann@example.com", "ann%40example.com", "sid=abc"]
const leaks = (value: unknown) => SECRETS.filter((secret) => JSON.stringify(value).includes(secret))

/** A fake SDK: each report as the event Sentry would build from its scope, scrubbed. */
function fakeSentry() {
  const events: { error: unknown; tags: Record<string, unknown>; request?: unknown }[] = []
  type Processor = (event: Record<string, unknown>) => Record<string, unknown>
  let scope: { tags: Record<string, unknown>; processors: Processor[] } | undefined
  const sentry = {
    withScope(run: (scope: unknown) => void) {
      const current = { tags: {} as Record<string, unknown>, processors: [] as Processor[] }
      scope = current
      run({
        setTag: (name: string, value: unknown) => (current.tags[name] = value),
        addEventProcessor: (processor: Processor) => current.processors.push(processor),
      })
      scope = undefined
    },
    captureException(error: unknown) {
      const event = (scope?.processors ?? []).reduce<Record<string, unknown>>(
        (built, processor) => processor(built),
        {}
      )
      events.push({ error, tags: scope?.tags ?? {}, request: scrubEvent(event).request })
      return ""
    },
  }
  return { sentry: sentry as never, events }
}

describe("the scrubber (the shared cases)", () => {
  it.each(cases.url)("scrubUrl(%j)", (input, expected) => {
    expect(scrubUrl(input)).toBe(expected)
  })
  it.each(cases.text)("scrubText(%j)", (input, expected) => {
    expect(scrubText(input)).toBe(expected)
  })

  it("beforeSend keeps no cookie, authorization, body, token, code or e-mail", () => {
    const out = scrubHooks.beforeSend({
      type: undefined,
      request: {
        url: "/store/customers?token=s3cr3t-token&email=ann%40example.com",
        cookies: { connect: "sid=abc" },
        headers: { cookie: "sid=abc", authorization: "Bearer s3cr3t-token", "user-agent": "jest" },
        data: { password: "s3cr3t-token" },
      },
      user: { id: "cus_1", email: "ann@example.com" },
      exception: { values: [{ value: "GET /auth/verify?code=c0de-42 failed" }] },
      breadcrumbs: [{ category: "http", data: { url: "/x?code=c0de-42" } }],
    })
    expect(leaks(out)).toEqual([])
    expect(out.request?.url).toBe(`/store/customers?token=${FILTERED}&email=${FILTERED}`)
    expect(out.request?.headers).toEqual({ "user-agent": "jest" })
    expect(out.user).toEqual({ id: "cus_1" })
  })

  it("scrubs a span sent over OTLP, in place", () => {
    const span = {
      name: "GET /auth/verify?code=c0de-42",
      attributes: { "http.url": "/reset?token=s3cr3t-token", "query.fields": "id,title" },
    }
    scrubOtelSpan(span)
    expect(leaks(span)).toEqual([])
    expect(span.attributes["query.fields"]).toBe("id,title")
  })
})

describe("the options", () => {
  it("start nothing without a DSN and send no personal data with one", () => {
    expect(sentryOptions({}).dsn).toBeUndefined()
    const options = sentryOptions({
      SENTRY_DSN: " https://k@o1.ingest.de.sentry.io/2 ",
      SENTRY_ENVIRONMENT: "staging",
      GITHUB_SHA: "abc123",
    })
    expect(options).toMatchObject({
      dsn: "https://k@o1.ingest.de.sentry.io/2",
      environment: "staging",
      release: "abc123",
      enableOpenTelemetrySetup: false,
      dataCollection: { userInfo: false, cookies: false, httpBodies: [], stackFrameVariables: false },
    })
  })

  it.each([
    [undefined, 0],
    ["", 0],
    ["0", 0],
    ["0.25", 0.25],
    ["1", 1],
    ["2", 0],
    ["-1", 0],
    ["all", 0],
  ])("reads SENTRY_TRACES_SAMPLE_RATE=%j as %j", (value, rate) => {
    expect(tracesRate(value)).toBe(rate)
  })
})

describe("what is reported", () => {
  afterEach(() => useSentry(undefined))

  it("sends nothing before the SDK started", () => {
    expect(() => reportRequestError(new Error("boom"), { url: "/x" })).not.toThrow()
  })

  it("a route's 5xx, with its route and a scrubbed request, and never a 4xx", () => {
    const { sentry, events } = fakeSentry()
    useSentry(sentry)
    const req = {
      method: "GET",
      originalUrl: "/e2e/throw?marker=m1&token=s3cr3t-token",
      headers: { cookie: "sid=abc", authorization: "Bearer s3cr3t-token", "user-agent": "jest" },
      route: { path: "/e2e/throw" },
    }
    reportRequestError(new Error("boom"), req)
    reportRequestError(new MedusaError(MedusaError.Types.INVALID_DATA, "bad"), req)
    reportRequestError(new MedusaError(MedusaError.Types.NOT_FOUND, "none"), req)
    expect(events).toHaveLength(1)
    expect(events[0]!.tags).toMatchObject({ app: "medusa", "medusa.route": "/e2e/throw" })
    expect(events[0]!.request).toEqual({
      method: "GET",
      url: `/e2e/throw?marker=m1&token=${FILTERED}`,
      headers: { "user-agent": "jest" },
    })
    expect(isServerError(new MedusaError(MedusaError.Types.DB_ERROR, "db"))).toBe(true)
  })

  it("a workflow step's server error, inside Medusa's own tracing when it has one", async () => {
    const { sentry, events } = fakeSentry()
    useSentry(sentry)
    const traced: string[] = []
    const orchestrator: { traceStep?: NonNullable<typeof TransactionOrchestrator.traceStep> } = {
      traceStep: async (handler, metadata) => {
        traced.push(metadata.action)
        return handler()
      },
    }
    hookWorkflowSteps(orchestrator)
    const metadata = {
      action: "payload-reconcile-as-step",
      type: "invoke" as const,
      step_id: "s",
      step_uuid: "u",
      attempts: 1,
      failures: 0,
      async: false,
      idempotency_key: "k",
    }
    await expect(orchestrator.traceStep!(async () => "done", metadata)).resolves.toBe("done")
    const boom = new Error("job failed")
    await expect(orchestrator.traceStep!(async () => Promise.reject(boom), metadata)).rejects.toBe(boom)
    await expect(
      orchestrator.traceStep!(
        async () => Promise.reject(new MedusaError(MedusaError.Types.INVALID_DATA, "no")),
        metadata
      )
    ).rejects.toThrow("no")
    expect(traced).toHaveLength(3)
    expect(events.map((event) => event.error)).toEqual([boom])
    expect(events[0]!.tags).toMatchObject({ "medusa.step": "payload-reconcile-as-step" })
  })

  it("a subscriber that failed, keeping the handler's name (Medusa's subscriber id)", async () => {
    const { sentry, events } = fakeSentry()
    useSentry(sentry)
    const registered: { handler: (input: { event: { name: string } }) => unknown }[] = []
    const loader = {
      createSubscriber(args: { handler: (input: { event: { name: string } }) => unknown }) {
        registered.push(args)
      },
    }
    hookSubscribers(loader as never)
    async function orderPlacedHandler() {
      throw new Error("subscriber failed")
    }
    loader.createSubscriber({
      fileName: "order-placed.ts",
      config: { event: "order.placed" },
      handler: orderPlacedHandler,
    } as never)
    expect(registered[0]!.handler.name).toBe("orderPlacedHandler")
    await expect(registered[0]!.handler({ event: { name: "order.placed" } })).rejects.toThrow(
      "subscriber failed"
    )
    expect(events[0]!.tags).toMatchObject({
      "medusa.subscriber": "order-placed.ts",
      "medusa.event": "order.placed",
    })
  })

  it("finds Medusa's hook points (an upgrade that moves them fails here)", () => {
    expect(typeof (SubscriberLoader.prototype as { createSubscriber?: unknown }).createSubscriber).toBe(
      "function"
    )
    expect(typeof TransactionOrchestrator.isExpectedError).toBe("function")
    expect("traceStep" in TransactionOrchestrator || TransactionOrchestrator.traceStep === undefined).toBe(
      true
    )
  })
})
