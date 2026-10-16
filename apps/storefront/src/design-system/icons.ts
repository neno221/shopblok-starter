import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleXIcon,
  HeartIcon,
  Loader2Icon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
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

export const iconsInUse: readonly IconInUse[] = [
  { name: "Check", Icon: CheckIcon, usedBy: ["Checkbox", "Select"] },
  { name: "ChevronDown", Icon: ChevronDownIcon, usedBy: ["NativeSelect", "Select"] },
  { name: "ChevronUp", Icon: ChevronUpIcon, usedBy: ["Select"] },
  { name: "Loader2", Icon: Loader2Icon, usedBy: ["Spinner"] },
  {
    name: "Heart",
    Icon: HeartIcon,
    usedBy: ["the Button, IconButton, Icon and Tooltip entries (a sample icon)"],
  },
  { name: "Minus", Icon: MinusIcon, usedBy: ["QuantityStepper"] },
  { name: "Plus", Icon: PlusIcon, usedBy: ["QuantityStepper"] },
  { name: "X", Icon: XIcon, usedBy: ["Chip"] },
  { name: "Star", Icon: StarIcon, usedBy: ["Rating"] },
  { name: "CircleCheck", Icon: CircleCheckIcon, usedBy: ["StockIndicator"] },
  { name: "TriangleAlert", Icon: TriangleAlertIcon, usedBy: ["StockIndicator"] },
  { name: "CircleX", Icon: CircleXIcon, usedBy: ["StockIndicator"] },
];
