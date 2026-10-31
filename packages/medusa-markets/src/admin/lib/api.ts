import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sdk } from "./sdk";
import type { CountryBody, MarketsOverview, SettingsBody } from "./types";

/** The panels' cache key; a saved country or setting invalidates the whole prefix. */
export const MARKETS_KEY = ["shopblok-markets"] as const;

/**
 * `GET /admin/markets`, read on mount (and again each time `signature` changes: the countries of
 * the region page or the locales of the store page, which Medusa's own forms change). The panels
 * read only this route and save only through the two `POST` routes of D92.
 */
export const useMarkets = (signature: string) =>
  useQuery({
    queryKey: [...MARKETS_KEY, signature],
    queryFn: () => sdk.client.fetch<MarketsOverview>("/admin/markets"),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
  });

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

/** `POST /admin/markets/settings`. */
export const useSaveSettings = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsBody) =>
      sdk.client.fetch<MarketsOverview>("/admin/markets/settings", {
        method: "POST",
        body,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: MARKETS_KEY }),
  });
};
