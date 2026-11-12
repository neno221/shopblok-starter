import { expect } from "@playwright/test";

// Mailpit, the compose stack's inbox (infra/README.md): where Payload's e-mails go without a Resend
// key (`SMTP_HOST`, `payload/email.ts`), the newsletter's confirmation among them (T99). Its API
// answers on the web UI's port: a search by recipient, then the message.

const base = () => (process.env["E2E_MAILPIT_URL"] || "http://localhost:8025").replace(/\/+$/, "");

type Found = { messages: { ID: string; Created: string }[] };
export type Mail = { Subject: string; Text: string; HTML: string };

/** The newest e-mail to `to`, waiting up to 30 s for it to arrive. */
export async function mailTo(to: string): Promise<Mail> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const query = new URLSearchParams({ query: `to:"${to}"` });
        const response = await fetch(`${base()}/api/v1/search?${query}`);
        if (!response.ok) return `Mailpit answered ${response.status}`;
        const { messages } = (await response.json()) as Found;
        id = messages[0]?.ID;
        return id === undefined ? "none yet" : "found";
      },
      { timeout: 30_000, message: `an e-mail to ${to} in Mailpit (${base()})` },
    )
    .toBe("found");
  const response = await fetch(`${base()}/api/v1/message/${id}`);
  expect(response.status, "Mailpit's message").toBe(200);
  return (await response.json()) as Mail;
}

/** The first link in `mail`'s text part that matches `pattern`, as a path to open on the server under test. */
export function linkIn(mail: Mail, pattern: RegExp): string {
  const found = mail.Text.match(/https?:\/\/[^\s<>"]+/g)?.find((url) => pattern.test(url));
  if (found === undefined) throw new Error(`no link matching ${pattern} in "${mail.Subject}"`);
  const url = new URL(found);
  return url.pathname + url.search;
}
