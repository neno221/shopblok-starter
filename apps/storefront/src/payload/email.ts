import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { resendAdapter } from "@payloadcms/email-resend";
import type { EmailAdapter } from "payload";

// Payload's e-mail adapter, by env (M6 D121, T98): Payload's own e-mails (a user's password reset),
// the form e-mails and the newsletter's confirmation (T99) go
// - through Resend with `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (the integration's storefront
//   part, `@shopblok/integrations`);
// - else to Mailpit with `SMTP_HOST` (the compose stack's inbox, http://localhost:8025; `.env.example`
//   sets `localhost:1025`, so W6's "No email adapter" log is gone in development);
// - else nowhere: Payload writes them to its log, as before (CI's builds with no `.env`).
// Pure: the env comes in, so a test can feed every case.

export type EmailEnv = Readonly<Record<string, string | undefined>>;

/** The sender's name in every Payload e-mail. */
export const EMAIL_FROM_NAME = "Shopblok";
/** Mailpit takes any sender; this one says where the e-mail came from. */
const MAILPIT_FROM = "payload@localhost.test";

const value = (env: EmailEnv, key: string): string | undefined => env[key]?.trim() || undefined;

/** Which adapter `env` turns on, for the config and its test. */
export function emailTransport(
  env: EmailEnv,
):
  | { kind: "resend"; apiKey: string; from: string }
  | { kind: "smtp"; host: string; port: number }
  | { kind: "none" } {
  const apiKey = value(env, "RESEND_API_KEY");
  const from = value(env, "RESEND_FROM_EMAIL");
  if (apiKey !== undefined && from !== undefined) return { kind: "resend", apiKey, from };
  const host = value(env, "SMTP_HOST");
  if (host !== undefined) {
    const port = Number(value(env, "SMTP_PORT") ?? "1025");
    return { kind: "smtp", host, port: Number.isInteger(port) && port > 0 ? port : 1025 };
  }
  return { kind: "none" };
}

/** Payload's `email` option: Resend, Mailpit, or `undefined` (none). */
export function emailAdapter(
  env: EmailEnv = process.env,
): EmailAdapter | Promise<EmailAdapter> | undefined {
  const transport = emailTransport(env);
  if (transport.kind === "resend")
    return resendAdapter({
      apiKey: transport.apiKey,
      defaultFromAddress: transport.from,
      defaultFromName: EMAIL_FROM_NAME,
    });
  if (transport.kind === "smtp")
    return nodemailerAdapter({
      defaultFromAddress: MAILPIT_FROM,
      defaultFromName: EMAIL_FROM_NAME,
      // Mailpit takes plain SMTP with no login. No `verify()` at start: Payload starts in every
      // build worker, and a stopped Mailpit would print an error there; a send to it fails loudly.
      skipVerify: true,
      transportOptions: { host: transport.host, port: transport.port, secure: false },
    });
  return undefined;
}
