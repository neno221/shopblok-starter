import { adminCredentials } from "./admin-credentials";

// What the specs that talk to the server from Node share (PR 94 review, item 9): its address, a
// token for the bootstrap admin, and the wait for a revalidated read.

/** The server the specs run against: `next start`, as `e2e-smoke` starts it. */
export const base = () => process.env["E2E_BASE_URL"] ?? "http://localhost:8000";

/**
 * The bootstrap admin's JWT, for Payload's REST API from Node (`Authorization: JWT …`):
 * `page.request` does not send the `Secure` cookie to http://localhost (SETUP.md, T11).
 */
export async function adminToken(): Promise<string> {
  const { email, password } = adminCredentials();
  const response = await fetch(`${base()}/api/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const token = ((await response.json()) as { token?: string }).token ?? "";
  if (token === "") throw new Error(`the bootstrap admin cannot sign in (${response.status})`);
  return token;
}

/**
 * `revalidateTag(tag, 'max')` is stale-while-revalidate: request 1 may still show the old content
 * and starts the refresh, which took about 300 ms in S1, so request 2 follows after a pause of
 * 500 ms (back to back it would still see the old content). `shows` makes one request and says
 * whether it showed the new content. Returns the number of the first request that did, or 0. A
 * heavier page passes a longer `pauseMs`.
 */
export async function freshWithinTwo(
  shows: () => Promise<boolean>,
  pauseMs = 500,
): Promise<number> {
  if (await shows()) return 1;
  await new Promise((resolve) => setTimeout(resolve, pauseMs));
  return (await shows()) ? 2 : 0;
}
