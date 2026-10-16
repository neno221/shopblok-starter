"use client";

import { Chip, type ChipProps } from "@shopblok/ui/atoms/chip";

/**
 * A Chip with a remove button that does nothing, for the DS page: a server component cannot hand a
 * function to a button, so the handler is made here, on the client. Props are Chip's, without the
 * handler.
 */
export function RemovableChip({
  removeLabel,
  ...props
}: Omit<Extract<ChipProps, { onRemove: unknown }>, "onRemove">) {
  return <Chip {...props} removeLabel={removeLabel} onRemove={() => {}} />;
}
