import { catalogs } from "@shopblok/i18n";
import type { Metadata, Route } from "next";
import Link from "next/link";
import "../styles/globals.css";

export const metadata: Metadata = { title: catalogs.en.notFound.title };

// Renders for every URL no route handles. It bypasses the layouts, so it brings its own `<html>`
// and styles, and has no market to read: the default language.
export default function GlobalNotFound() {
  const { notFound } = catalogs.en;
  return (
    <html lang="en">
      <body>
        <main className="p-8">
          <h1 className="text-2xl font-semibold">{notFound.title}</h1>
          <p className="mt-2">{notFound.body}</p>
          {/* `/` is no file route, so typedRoutes needs the cast; T11's proxy serves it. */}
          <Link className="mt-4 inline-block underline" href={"/" as Route}>
            {notFound.home}
          </Link>
        </main>
      </body>
    </html>
  );
}
