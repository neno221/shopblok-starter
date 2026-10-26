import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

type VerificationRule = { entity_type: string; auth_provider: string };

/**
 * `POST /store/customers`, after Medusa's `authenticate`: the account is created only for an
 * auth identity whose e-mail is verified, and only under that e-mail (D64, SPEC §8.4). Medusa's
 * `authVerificationsPerActor` makes an unverified login answer `verification_required` with a
 * restricted token, but that token, like the one `/register` gives, still creates the customer,
 * and the route takes the customer's `email` from the body unchecked, so the gate is here.
 *
 * The rules are the config's (`authVerificationsPerActor.customer`): an identity from a provider
 * no rule names (a social login later) is not held back. With no rules, nothing is checked.
 */
export async function requireVerifiedCustomer(
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const { projectConfig } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE);
  const rules = ((projectConfig.http as { authVerificationsPerActor?: Record<string, VerificationRule[]> })
    .authVerificationsPerActor?.customer ?? []) as VerificationRule[];
  const authIdentityId = req.auth_context?.auth_identity_id;

  // No identity: `authenticate` has already answered 401, or the route will.
  if (rules.length === 0 || !authIdentityId) {
    return next();
  }

  const auth = req.scope.resolve(Modules.AUTH);
  const identity = await auth.retrieveAuthIdentity(authIdentityId, {
    relations: ["provider_identities"],
  });
  // The identity's addresses under a rule. Its verifications are a handful of rows, read in one
  // query and matched here rather than one query per rule × provider.
  const required = rules.flatMap((rule) =>
    (identity.provider_identities ?? [])
      .filter((provider) => provider.provider === rule.auth_provider)
      .map((provider) => ({ entity_id: provider.entity_id, entity_type: rule.entity_type })),
  );
  const verifications = required.length
    ? await auth.listAuthVerifications({ auth_identity_id: identity.id })
    : [];
  const isVerified = ({ entity_id, entity_type }: (typeof required)[number]) =>
    verifications.some(
      (verification) =>
        verification.verified_at &&
        verification.entity_id === entity_id &&
        verification.entity_type === entity_type,
    );

  if (!required.every(isVerified)) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "Verify your e-mail address before creating your account.",
    );
  }

  /** The addresses this identity has verified under a rule: the only ones it may create. */
  const verified = required.map((r) => r.entity_id.toLowerCase());

  const body = (req.validatedBody ?? req.body) as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.toLowerCase() : undefined;

  if (verified.length > 0 && (!email || !verified.includes(email))) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "An account can only be created with the e-mail address you verified.",
    );
  }

  next();
}
