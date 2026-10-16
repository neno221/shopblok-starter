import type { ComponentType, SVGProps } from "react";

/**
 * The icons the atoms draw, for the Foundations page: the Lucide name, the component, and the atoms
 * that use it. An atom that imports an icon adds one row here, in the commit that adds the import.
 */
export type IconInUse = {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  usedBy: readonly string[];
};

export const iconsInUse: readonly IconInUse[] = [];
