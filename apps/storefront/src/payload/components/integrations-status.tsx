import { getIntegrationStatus, INTEGRATION_KEYS, type EnvLike } from "@shopblok/integrations";
import "./integrations-status.css";

/** The storefront's own environment, for the keys the integrations read: names only reach the page. */
function storefrontEnv(source: NodeJS.ProcessEnv = process.env): EnvLike {
  return Object.fromEntries(INTEGRATION_KEYS.map((key) => [key, source[key]]));
}

/**
 * What the panel shows for each integration (D85, SPEC §7.6): whether its code exists yet
 * (`wired`), and for the storefront's part whether its keys are set, by name. The backend's keys
 * live in Medusa's environment, which this server cannot see: `pnpm doctor` checks both apps.
 */
export function integrationRows(env: EnvLike) {
  return getIntegrationStatus({ backend: {}, storefront: env }).map((status) => {
    const storefront = status.parts.find((part) => part.app === "storefront");
    return {
      id: status.id,
      name: status.name,
      wired: status.wired,
      arrives: status.arrives,
      fallback: status.fallback,
      storefront:
        storefront === undefined
          ? ({ state: "none" } as const)
          : storefront.configured
            ? ({ state: "configured" } as const)
            : ({ state: "missing", keys: storefront.missing } as const),
      backend: status.parts.some((part) => part.app === "backend"),
    };
  });
}

/**
 * The integrations panel above the dashboard's collections (`admin.components.beforeDashboard`):
 * a server component, so the environment is read on the server and only key names are sent.
 */
export function IntegrationsStatus() {
  const rows = integrationRows(storefrontEnv());
  return (
    <section className="integrations-status" aria-labelledby="integrations-status-title">
      <h2 id="integrations-status-title" className="integrations-status__title">
        Integrations
      </h2>
      <p className="integrations-status__note">
        Each runs once its code is built and its keys are set; until then the shop uses the
        fallback. This shows the storefront&apos;s keys; <code>pnpm doctor</code> checks the
        backend&apos;s too. No value is shown, only names.
      </p>
      <table className="integrations-status__table">
        <thead>
          <tr>
            <th scope="col">Integration</th>
            <th scope="col">Code</th>
            <th scope="col">Storefront keys</th>
            <th scope="col">Until then</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-integration={row.id}>
              <th scope="row">{row.name}</th>
              <td data-wired={row.wired}>
                {row.wired ? "Built" : `Arrives in ${row.arrives ?? "a later milestone"}`}
              </td>
              <td data-configured={row.storefront.state}>
                {row.storefront.state === "none"
                  ? "None needed (backend only)"
                  : row.storefront.state === "configured"
                    ? "Set"
                    : `Not set: ${row.storefront.keys.join(", ")}`}
              </td>
              <td>{row.fallback}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
