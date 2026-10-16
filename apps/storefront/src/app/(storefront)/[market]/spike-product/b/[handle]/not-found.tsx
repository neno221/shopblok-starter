// THROWAWAY spike code (plan M1 §6, S4): does a not-found boundary in B's own segment give a
// server-rendered 404 page, where the market's `not-found.tsx` gives Next's bare error shell?
export default function SpikeProductNotFound() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold" data-testid="spike-not-found">
        Spike S4: no such product
      </h1>
    </main>
  );
}
