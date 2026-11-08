import type { ReactNode } from "react";
import { inter } from "../../lib/fonts";

/**
 * Inter in the admin (D108: Medusa Admin's typeface), as an `admin.components.providers` entry, so
 * every admin screen has it, the login included. It is the shop's own `next/font` Inter
 * (`lib/fonts.ts`, D28): the same self-hosted files, fetched per `unicode-range`. Payload's root
 * layout is generated and puts no class of ours on `<html>`, so the font's family name reaches
 * `:root` as `--font-inter` through one hoisted `<style>`, and `custom.scss` makes it
 * `--font-body`, Payload's body font.
 */
export function AdminFont({ children }: { children?: ReactNode }) {
  return (
    <>
      <style href="shopblok-admin-font" precedence="default">
        {`:root{--font-inter:${inter.style.fontFamily}}`}
      </style>
      {children}
    </>
  );
}
