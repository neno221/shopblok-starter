// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `formBlock` block's entry file: this file
// is what `@shopblok/ui/sections/form-block` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./form-block/` (`standard.tsx`, M4's, is the first). A value
// the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  FormBlockStandard,
  type FormBlockSectionProps,
  type FormFieldError,
  type FormStatus,
} from "./form-block/standard";

const MEMBERS: Members<"form-block", (props: FormBlockSectionProps) => React.ReactNode> = {
  standard: FormBlockStandard,
};

function FormBlockSection(props: FormBlockSectionProps) {
  const Member = pickVariant("form-block", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { FormBlockSection };
export type { FormBlockSectionProps, FormFieldError, FormStatus };
