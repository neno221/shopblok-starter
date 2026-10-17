// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"; the marks' import changed in T34). The mark of a
// payment method, drawn in one colour (`fill-current`: the text's colour) as an image named by
// `label` (D30). The eight marks of D31 come from `payment-marks.ts`, a copy of their paths from
// `simple-icons` (CC0; each mark remains its owner's trademark, packages/ui/NOTICE.md): importing the
// package's root made Vitest and `next dev` parse its 5.25 MB `index.mjs` on every cold start (PR 43
// review, item 14; the measurement is in SETUP.md, "Cart, checkout and account molecules (T34)").
// A provider that requires its own artwork on a payment page gets it with that integration (M6).
import { cn } from "@shopblok/ui/lib/utils";
import type * as React from "react";
import { paymentMarks } from "./payment-marks";

/** The payment methods of D31, as simple-icons' slugs. */
export const paymentBrands = Object.keys(paymentMarks) as PaymentBrand[];

type PaymentBrand = keyof typeof paymentMarks;

const sizes = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
} as const;

type PaymentIconProps = Omit<React.ComponentProps<"svg">, "role" | "aria-label" | "children"> & {
  brand: PaymentBrand;
  /** The method's name ("Visa"): the image's accessible name. */
  label: string;
  size?: keyof typeof sizes;
};

function PaymentIcon({ brand, label, size = "md", className, ...props }: PaymentIconProps) {
  return (
    <svg
      data-slot="payment-icon"
      data-brand={brand}
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 fill-current", sizes[size], className)}
      {...props}
    >
      <path d={paymentMarks[brand].path} />
    </svg>
  );
}

export { PaymentIcon };
export type { PaymentBrand, PaymentIconProps };
