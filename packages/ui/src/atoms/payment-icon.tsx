// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). The mark of a payment method, from
// `simple-icons` (CC0; each mark remains its owner's trademark, packages/ui/NOTICE.md), drawn in one
// colour (`fill-current`: the text's colour) as an image named by `label` (D30). Only the eight
// icons of D31 are imported, so the rest of the set never reaches a bundle. A provider that
// requires its own artwork on a payment page gets it with that integration (M6).
import {
  siAmericanexpress,
  siApplepay,
  siGooglepay,
  siKlarna,
  siMastercard,
  siPaypal,
  siRevolut,
  siVisa,
} from "simple-icons";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

const marks = {
  visa: siVisa,
  mastercard: siMastercard,
  americanexpress: siAmericanexpress,
  applepay: siApplepay,
  googlepay: siGooglepay,
  revolut: siRevolut,
  paypal: siPaypal,
  klarna: siKlarna,
} as const;

/** The payment methods of D31, as simple-icons' slugs. */
export const paymentBrands = Object.keys(marks) as PaymentBrand[];

type PaymentBrand = keyof typeof marks;

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
      <path d={marks[brand].path} />
    </svg>
  );
}

export { PaymentIcon };
export type { PaymentBrand, PaymentIconProps };
