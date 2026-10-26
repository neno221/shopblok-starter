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
 * auth identity whose e-mail is verified (D64, SPEC §8.4). Medusa's `authVerificationsPerActor`
 * makes an unverified login answer `verification_required` with a restricted token, but that
 * token, like the one `/register` gives, still creates the customer, so the gate is here.
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

  for (const rule of rules) {
    for (const provider of identity.provider_identities ?? []) {
      if (provider.provider !== rule.auth_provider) {
        continue;
      }

      const verifications = await auth.listAuthVerifications({
        auth_identity_id: identity.id,
        entity_id: provider.entity_id,
        entity_type: rule.entity_type,
      });

      if (!verifications.some((verification) => verification.verified_at)) {
        throw new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Verify your e-mail address before creating your account.",
        );
      }
    }
  }

  next();
}
