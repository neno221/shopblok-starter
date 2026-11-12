import type { CSSProperties, ReactNode } from "react";
import { directionOf } from "./direction";
import { theme } from "./theme";
import type { EmailShop } from "./types";

// The frame every e-mail shares (D121): the shop's name over a white card on the muted page, and
// the name again at the foot. Tables for the layout and inline styles only, as React Email's
// components draw them, since e-mail clients read neither flexbox nor stylesheets reliably. Two
// halves: `EmailFrame` is what the reader sees (the DS draws it in the page, D130), and
// `EmailDocument` puts it in `<html>` with the head and the preheader for `render()`.

const presentation = {
  role: "presentation",
  cellPadding: 0,
  cellSpacing: 0,
  border: 0,
  width: "100%",
} as const;

/** Six of the characters an inbox treats as empty: they keep the body's first words out of the preview line. */
const PREVIEW_FILL = "‌ ‍‎‏﻿";
const PREVIEW_LENGTH = 150;

export function EmailFrame({
  shop,
  language,
  children,
}: {
  shop: EmailShop;
  language: string;
  children: ReactNode;
}) {
  const dir = directionOf(language);
  const text: CSSProperties = {
    fontFamily: theme.font,
    textAlign: dir === "rtl" ? "right" : "left",
  };
  return (
    <table
      {...presentation}
      lang={language}
      dir={dir}
      data-slot="email-frame"
      style={{ backgroundColor: theme.muted, ...text }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "32px 12px" }}>
            <table
              {...presentation}
              align="center"
              style={{
                maxWidth: "600px",
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "24px 24px 0" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        lineHeight: "28px",
                        fontWeight: 700,
                        color: theme.foreground,
                      }}
                    >
                      {shop.name}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "24px" }}>{children}</td>
                </tr>
              </tbody>
            </table>
            <table {...presentation} align="center" style={{ maxWidth: "600px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "16px 24px 0" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        lineHeight: "20px",
                        color: theme.mutedForeground,
                      }}
                    >
                      {shop.name}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** The whole HTML document around a frame: `lang`, `dir`, the subject as its title and the preheader. */
export function EmailDocument({
  language,
  subject,
  preheader,
  children,
}: {
  language: string;
  subject: string;
  preheader: string;
  children: ReactNode;
}) {
  const fill = PREVIEW_FILL.repeat(Math.ceil(Math.max(0, PREVIEW_LENGTH - preheader.length) / 6));
  return (
    <html lang={language} dir={directionOf(language)}>
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>{subject}</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: theme.muted }}>
        <div
          style={{
            display: "none",
            overflow: "hidden",
            lineHeight: "1px",
            opacity: 0,
            maxHeight: 0,
            maxWidth: 0,
          }}
          data-skip-in-text="true"
        >
          {preheader}
          {fill}
        </div>
        {children}
      </body>
    </html>
  );
}
