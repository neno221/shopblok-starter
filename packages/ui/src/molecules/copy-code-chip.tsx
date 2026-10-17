// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). A discount code to copy: the code
// in monospace beside a "Copy" button named "Copy code SUMMER20", with a line that says "Copied" or,
// when the clipboard is refused or missing, to select the code and copy it. This is the server half:
// it formats the button's name from the copy (an ICU message with the code in it) and hands every
// string to CopyCodeControl, the small client part that holds the clipboard and the state. Before it
// hydrates the code is plain text a reader can select and the button does nothing.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { DiscountCode } from "@shopblok/registry/contracts";
import { CopyCodeControl, type CopyStatus } from "@shopblok/ui/molecules/copy-code-control";
import type * as React from "react";

type CopyCodeChipProps = Omit<React.ComponentProps<"div">, "children"> & {
  discount: DiscountCode;
  /** The wording, from the catalog's `molecules.copyCodeChip`. */
  copy: Messages["molecules"]["copyCodeChip"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** Where it starts: `copied` and `failed` are what a press leads to, which the design system draws. */
  initialStatus?: CopyStatus;
};

function CopyCodeChip({ discount, copy, locale, initialStatus, ...props }: CopyCodeChipProps) {
  const { code } = discount;
  return (
    <CopyCodeControl
      code={code}
      label={formatMessage(copy.label, { code }, locale)}
      copyText={copy.copy}
      copiedText={copy.copied}
      fallbackText={copy.fallback}
      initialStatus={initialStatus}
      {...props}
    />
  );
}

export { CopyCodeChip };
export type { CopyCodeChipProps };
