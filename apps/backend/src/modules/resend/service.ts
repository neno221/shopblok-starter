import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils";
import { Resend } from "resend";

/** The provider's options (`modules.ts`, from `RESEND_API_KEY` and `RESEND_FROM_EMAIL`). */
export type ResendOptions = {
  api_key: string;
  /** The sender: an address (`onboarding@resend.dev`) or `Name <address>`. */
  from: string;
  /** Resend's API; only a test's fake sets it (the SDK also reads `RESEND_BASE_URL`). */
  base_url?: string;
};

type InjectedDependencies = { logger: Logger };

/** Resend's error messages can quote an address (the recipient's, the account's): never logged. */
const ADDRESS = /[^\s@<>"(),;:]+@[^\s@<>"'(),;:]*[^\s@<>"'(),;:.]/g;
export const withoutAddresses = (message: string): string => message.replace(ADDRESS, "<address>");

/**
 * Medusa's notifications on the `email` channel through Resend (M6 D121, SPEC §6.2 `modules/resend`),
 * in the shape of Medusa's Resend guide. It sends what the notification carries in `content`: the
 * subject, the HTML and the plain text `@shopblok/emails` rendered (`lib/storefront-mail.ts`), from
 * `RESEND_FROM_EMAIL`. It logs Resend's id with the template, never the address, and returns the id,
 * which Medusa keeps as the notification's `external_id`. A refusal throws, so Medusa marks the
 * notification failed and the subscriber's error names Resend's answer.
 */
export class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend";

  protected readonly logger_: Logger;
  protected readonly options_: ResendOptions;
  protected readonly client_: Resend;

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super();
    this.logger_ = logger;
    this.options_ = options;
    this.client_ = new Resend(options.api_key, {
      ...(options.base_url ? { baseUrl: options.base_url } : {}),
    });
  }

  static validateOptions(options: Record<string, unknown>): void {
    for (const key of ["api_key", "from"] as const) {
      const value = options[key];
      if (typeof value !== "string" || value.trim() === "") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The Resend notification provider needs the option ${key} (RESEND_API_KEY and RESEND_FROM_EMAIL).`,
        );
      }
    }
  }

  async send(
    notification: ProviderSendNotificationDTO,
  ): Promise<ProviderSendNotificationResultsDTO> {
    const content = notification.content;
    if (!content?.subject || !content.html) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `resend: the ${notification.template ?? "e-mail"} notification has no rendered content (subject and HTML), so nothing was sent.`,
      );
    }
    const { data, error } = await this.client_.emails.send({
      from: notification.from?.trim() || this.options_.from,
      to: [notification.to],
      subject: content.subject,
      html: content.html,
      ...(content.text ? { text: content.text } : {}),
    });
    if (error || !data?.id) {
      const reason = error
        ? withoutAddresses(`${error.name}: ${error.message}`)
        : "no id in the answer";
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `resend: ${notification.template ?? "the e-mail"} was not accepted (${reason}).`,
      );
    }
    this.logger_.info(`resend: ${notification.template ?? "e-mail"} sent, Resend id ${data.id}`);
    return { id: data.id };
  }
}
