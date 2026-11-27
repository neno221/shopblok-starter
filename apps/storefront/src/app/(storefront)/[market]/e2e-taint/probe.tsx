"use client";

// Test-only: the Client Component `e2e-taint/page.tsx` hands a value to. React refuses a tainted
// value or object at that hand-over, on the server, before any of it is sent.
export function TaintProbe({ value }: { value: unknown }) {
  return (
    <p data-testid="taint-probe">{typeof value === "string" ? value : JSON.stringify(value)}</p>
  );
}
