import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createHash } from "node:crypto";

import { adminLink } from "../lib/admin-url";
import { sendEmail } from "../lib/storefront-mail";

/**
 * An invite to Medusa Admin (D122, SPEC §6.2): `invite.created` and `invite.resent` (a new token)
 * send `admin-invite` to the invited address, in English (D122: English for Medusa Admin's users),
 * with the link to the admin's invite page (`MEDUSA_BACKEND_URL/app/invite?token=…`). Once per token.
 */
export default async function inviteCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const invite = await container
    .resolve(Modules.USER)
    .retrieveInvite(data.id, { select: ["id", "email", "token", "accepted"] })
    .catch(() => null);
  if (invite === null || invite.accepted) return;
  const url = adminLink(process.env["MEDUSA_BACKEND_URL"], "/invite", invite.token);
  if (url === undefined) {
    logger.error("admin-invite: MEDUSA_BACKEND_URL is not an http(s) URL, so no link was sent.");
    return;
  }
  await sendEmail(container, {
    to: invite.email,
    template: "admin-invite",
    type: "admin-invite",
    language: "en",
    url,
    idempotencyKey: `invite-${createHash("sha256").update(invite.token).digest("hex")}`,
  });
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
};
