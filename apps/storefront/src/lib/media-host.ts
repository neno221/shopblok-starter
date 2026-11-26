// M6 D127 (T95; SPEC §10.7 "Next images"): the pictures on R2's public domain (`S3_PUBLIC_URL`:
// Payload's media and Medusa's product pictures) go through `next/image`, which draws a remote
// picture only from a host its config names. `next build` reads this, so a new domain needs a new
// build. Without `S3_PUBLIC_URL` there is none: files are on the shop's own origin (Payload's
// `staticDir`) or, in development, on Medusa's localhost (`dangerouslyAllowLocalIP`).

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
};

/** `S3_PUBLIC_URL` as `images.remotePatterns`: its scheme, host and port, and every path under its own. */
export function mediaRemotePatterns(
  env: Readonly<Record<string, string | undefined>>,
): RemotePattern[] {
  const value = env.S3_PUBLIC_URL?.trim() ?? "";
  if (value === "") return [];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`S3_PUBLIC_URL is "${value}", which is not a URL (https://media.example.com)`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error(`S3_PUBLIC_URL must be an http(s) URL, not ${url.protocol}`);
  const path = url.pathname.replace(/\/+$/, "");
  return [
    {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      port: url.port,
      pathname: `${path}/**`,
    },
  ];
}
