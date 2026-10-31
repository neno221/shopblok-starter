import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { PencilSquare } from "@medusajs/icons";
import type { AdminRegion, DetailWidgetProps } from "@medusajs/framework/types";
import { Container, IconButton, StatusBadge, Table, Text } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CountryDrawer } from "../components/country-drawer";
import { PanelError, PanelHeader, PanelLoading } from "../components/panel";
import { useMarkets } from "../lib/api";
import { languageName } from "../lib/format";
import type { OverviewCountry } from "../lib/types";

/**
 * "Markets" on a region's page (D93): one row per country of this region with what Medusa has no
 * field for: open or closed, languages (the default first), time zone and domain. A row is edited
 * in a drawer. There is no add or remove: a country is added to the region, or taken out of it, in
 * Medusa's own Countries section above, and appears here closed.
 */
const RegionMarketsPanel = ({ data: region }: DetailWidgetProps<AdminRegion>) => {
  const { t, i18n } = useTranslation("markets");
  // The countries of the region as Medusa's form leaves them: a change reads the markets again.
  const signature = (region.countries ?? [])
    .map((country) => country.iso_2)
    .sort()
    .join(",");
  const markets = useMarkets(`region:${region.id}:${signature}`);
  const [editing, setEditing] = useState<string | null>(null);

  const countries = (markets.data?.countries ?? []).filter(
    (country) => country.region.id === region.id,
  );
  const country = countries.find((candidate) => candidate.code === editing);

  const languages = (row: OverviewCountry) =>
    row.languages.length === 0
      ? t("none")
      : row.languages
          .map((code, index) => {
            const name = languageName(code, i18n.language);
            return index === 0 && row.languages.length > 1
              ? `${name} (${t("region.default")})`
              : name;
          })
          .join(", ");

  return (
    <Container className="divide-y p-0" id="markets-region-panel">
      <PanelHeader description={t("region.description")} />
      {markets.isPending ? (
        <PanelLoading />
      ) : markets.isError ? (
        <PanelError error={markets.error} />
      ) : countries.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("region.empty")}
          </Text>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("region.columns.country")}</Table.HeaderCell>
                <Table.HeaderCell>{t("region.columns.status")}</Table.HeaderCell>
                <Table.HeaderCell>{t("region.columns.languages")}</Table.HeaderCell>
                <Table.HeaderCell>{t("region.columns.timeZone")}</Table.HeaderCell>
                <Table.HeaderCell>{t("region.columns.domain")}</Table.HeaderCell>
                <Table.HeaderCell className="w-px">
                  <span className="sr-only">{t("region.columns.actions")}</span>
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {countries.map((row) => (
                <Table.Row key={row.code} data-testid={`markets-row-${row.code}`}>
                  <Table.Cell>
                    <Text size="small" leading="compact" weight="plus">
                      {row.name}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge color={row.enabled ? "green" : "grey"}>
                      {row.enabled ? t("region.open") : t("region.closed")}
                    </StatusBadge>
                  </Table.Cell>
                  <Table.Cell>{languages(row)}</Table.Cell>
                  <Table.Cell>{row.time_zone ?? t("none")}</Table.Cell>
                  <Table.Cell>{row.domain ?? t("none")}</Table.Cell>
                  <Table.Cell>
                    <IconButton
                      size="small"
                      variant="transparent"
                      aria-label={t("region.edit", { country: row.name })}
                      onClick={() => setEditing(row.code)}
                    >
                      <PencilSquare />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
      {country !== undefined && markets.data !== undefined && (
        <CountryDrawer
          country={country}
          locales={markets.data.locales}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "region.details",
  id: "shopblok-markets-region-panel",
});

export default RegionMarketsPanel;
