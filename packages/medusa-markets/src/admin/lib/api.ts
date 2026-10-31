import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { sdk } from "./sdk";
import type { CountryBody, MarketsOverview, SettingsBody } from "./types";

/** The panels' cache key; a saved country or setting invalidates the whole prefix. */
export const MARKETS_KEY = ["shopblok-markets"] as const;

/**
 * `GET /admin/markets`, read on mount and again each time `signature` changes (the countries of
 * the region page or the locales and default region of the store page, which Medusa's own forms
 * change). It is one resource, so it has one key; the panels read only this route and save only
 * through the two `POST` routes of D92. While it is read again `isFetching` is true and the
 * panels' edit buttons wait, so no form starts from the answer before.
 */
export const useMarkets = (signature: string) => {
  const markets = useQuery({
    queryKey: MARKETS_KEY,
    queryFn: () => sdk.client.fetch<MarketsOverview>("/admin/markets"),
    staleTime: 0,
  });
  const { refetch } = markets;
  const read = useRef(signature);
  useEffect(() => {
    if (read.current === signature) return;
    read.current = signature;
    void refetch();
  }, [signature, refetch]);
  return markets;
};

/** `POST /admin/markets/countries/:code`. */
export const useSaveCountry = (code: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CountryBody) =>
      sdk.client.fetch<MarketsOverview>(`/admin/markets/countries/${code}`, {
        method: "POST",
        body,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: MARKETS_KEY }),
  });
};

/**
 * The dashboard's own store query (`["store", "detail"]` in @medusajs/dashboard 2.21.2) feeds
 * Medusa's General section and the widget's `store` prop. Its key starts with this.
 */
const DASHBOARD_STORE_KEY = ["store"] as const;

/**
 * `POST /admin/markets/settings`. A primary country in the body also sets the store's default
 * region (the plugin's `set-default-region` step), so then the dashboard's store is read again:
 * Medusa's Default region on the same page would show the old one otherwise.
 */
export const useSaveSettings = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsBody) =>
      sdk.client.fetch<MarketsOverview>("/admin/markets/settings", {
        method: "POST",
        body,
      }),
    onSuccess: async (_answer, body) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: MARKETS_KEY }),
        body.primary_country !== undefined
          ? client.invalidateQueries({ queryKey: DASHBOARD_STORE_KEY })
          : undefined,
      ]);
    },
  });
};
