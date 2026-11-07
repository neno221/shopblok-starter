// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `logoCloud` block's entry file: this file
// is what `@shopblok/ui/sections/logo-cloud` reaches, and it draws the member of the block's
// `variant`, each in its own file in `./logo-cloud/` (`standard.tsx`, M4's, is the first). A value
// the family does not have draws the first (`pickVariant`).
// T82 adds `grid` (M5 plan §1a).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { LogoCloudGrid } from "./logo-cloud/grid";
import { LogoCloudStandard, type LogoCloudSectionProps } from "./logo-cloud/standard";

const MEMBERS: Members<"logo-cloud", (props: LogoCloudSectionProps) => React.ReactNode> = {
  standard: LogoCloudStandard,
  grid: LogoCloudGrid,
};

function LogoCloudSection(props: LogoCloudSectionProps) {
  const Member = pickVariant("logo-cloud", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { LogoCloudSection };
export type { LogoCloudSectionProps };
