import { draftMode } from "next/headers";

// S1 prototype: Draft Mode on or off (`?on=1`, `?on=0`), as a preview route would after checking a
// secret. Only for the spike.
export async function GET(request: Request) {
  const on = new URL(request.url).searchParams.get("on") !== "0";
  const draft = await draftMode();
  if (on) draft.enable();
  else draft.disable();
  return Response.json({ draftMode: on });
}
