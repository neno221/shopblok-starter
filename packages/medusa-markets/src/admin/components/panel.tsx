import { XMark } from "@medusajs/icons";
import { Alert, Drawer, Heading, IconButton, Kbd, Skeleton, Text } from "@medusajs/ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Problem } from "../lib/types";

/** The title row every panel starts with, like Medusa's own sections. */
export const PanelHeader = ({
  description,
  action,
}: {
  description: string;
  action?: ReactNode;
}) => {
  const { t } = useTranslation("markets");
  return (
    <div className="flex items-center justify-between gap-x-4 px-6 py-4">
      <div>
        <Heading level="h2">{t("title")}</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {description}
        </Text>
      </div>
      {action}
    </div>
  );
};

/**
 * The header of a drawer: `Drawer.Header` as @medusajs/ui 4.2.6 draws it, with a name on the close
 * button. The library's own has an icon-only close button with no accessible name (axe:
 * `button-name`), and takes no props for it.
 */
export const DrawerHeading = ({ title, description }: { title: string; description: string }) => {
  const { t } = useTranslation("markets");
  return (
    <div className="border-ui-border-base flex items-start justify-between gap-x-4 border-b px-6 py-4">
      <div className="flex flex-col gap-y-1">
        <Drawer.Title>{title}</Drawer.Title>
        <Drawer.Description>{description}</Drawer.Description>
      </div>
      <div className="flex items-center gap-x-2">
        <Kbd>esc</Kbd>
        <Drawer.Close asChild>
          <IconButton
            size="small"
            type="button"
            variant="transparent"
            aria-label={t("drawer.close")}
          >
            <XMark />
          </IconButton>
        </Drawer.Close>
      </div>
    </div>
  );
};

/** A panel's body while `GET /admin/markets` loads. */
export const PanelLoading = () => {
  const { t } = useTranslation("markets");
  return (
    <div className="flex flex-col gap-y-2 px-6 py-4" role="status" aria-label={t("loading")}>
      <Skeleton className="h-5 w-full max-w-[320px]" />
      <Skeleton className="h-5 w-full max-w-[240px]" />
    </div>
  );
};

/** A panel's body when `GET /admin/markets` failed. */
export const PanelError = ({ error }: { error: unknown }) => {
  const { t } = useTranslation("markets");
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="px-6 py-4">
      <Alert variant="error">{t("loadFailed", { message })}</Alert>
    </div>
  );
};

/** The reasons a save was refused (the 400 body's `problems`), or the error's own text. */
export const SaveFailure = ({
  title,
  reasons,
  message,
}: {
  title: string;
  reasons: string[];
  message: string;
}) => (
  <Alert variant="error" role="alert">
    {reasons.length === 0 ? (
      message
    ) : (
      <>
        <Text size="small" leading="compact" weight="plus">
          {title}
        </Text>
        <ul className="mt-1 list-disc pl-4">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </>
    )}
  </Alert>
);

/** The warnings of `GET /admin/markets` (D91): what is stored no longer fits Medusa's data. */
export const Warnings = ({ problems, title }: { problems: Problem[]; title: string }) => (
  <Alert variant="warning">
    <Text size="small" leading="compact" weight="plus">
      {title}
    </Text>
    <ul className="mt-1 list-disc pl-4">
      {problems.map((problem) => (
        <li key={`${problem.code}:${problem.message}`}>{problem.message}</li>
      ))}
    </ul>
  </Alert>
);
