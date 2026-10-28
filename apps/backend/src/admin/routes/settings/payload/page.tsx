import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Button, Container, Heading, Table, Text, toast } from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sdk } from "../../../lib/sdk";

type Counts = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  failed: number;
};

type SyncRun = {
  kind: "reconcile" | "bulk";
  startedAt: string;
  finishedAt: string;
  collections: Record<"products" | "categories" | "collections", Counts>;
  markets: "updated" | "unchanged" | "failed";
  errors: string[];
};

type Status = { configured: boolean; last_run: SyncRun | null };

const QUERY_KEY = ["payload-sync"];
const COLUMNS: (keyof Counts)[] = ["created", "updated", "deleted", "unchanged", "failed"];

/**
 * Settings → Payload (D75): the Medusa → Payload sync's bulk run, and the counts of the last run
 * (bulk or the ten-minute reconcile) since the server started.
 */
const PayloadSettingsPage = () => {
  const client = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.client.fetch<Status>("/admin/payload/sync"),
  });
  const sync = useMutation({
    mutationFn: () => sdk.client.fetch<{ run: SyncRun }>("/admin/payload/sync", { method: "POST" }),
    onSuccess: ({ run }) => {
      client.setQueryData<Status>(QUERY_KEY, { configured: true, last_run: run });
      toast.success(run.errors.length === 0 ? "Synced to Payload" : "Synced, with errors");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : String(error)),
  });
  const run = data?.last_run ?? null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Payload</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Products, categories, collections and the markets' regions, currencies and locales
            follow Medusa into Payload on every change, and a reconcile runs every ten minutes.
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          onClick={() => sync.mutate()}
          isLoading={sync.isPending}
          disabled={isLoading || data?.configured === false}
        >
          Sync now
        </Button>
      </div>
      <div className="px-6 py-4">
        {data?.configured === false ? (
          <Text size="small">
            The sync is off: set PAYLOAD_SERVER_URL and PAYLOAD_API_KEY in apps/backend/.env (pnpm
            bootstrap writes both) and restart the server.
          </Text>
        ) : run === null ? (
          <Text size="small">No run since the server started.</Text>
        ) : (
          <div className="flex flex-col gap-y-3">
            <Text size="small">
              Last run: {run.kind === "bulk" ? "bulk" : "reconcile"}, finished{" "}
              {new Date(run.finishedAt).toLocaleString()}. Markets: {run.markets}.
            </Text>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Collection</Table.HeaderCell>
                  {COLUMNS.map((column) => (
                    <Table.HeaderCell key={column}>{column}</Table.HeaderCell>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {Object.entries(run.collections).map(([collection, counts]) => (
                  <Table.Row key={collection}>
                    <Table.Cell>{collection}</Table.Cell>
                    {COLUMNS.map((column) => (
                      <Table.Cell key={column}>{counts[column]}</Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            {run.errors.map((error) => (
              <Text key={error} size="small" className="text-ui-fg-error">
                {error}
              </Text>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({ label: "Payload" });

export default PayloadSettingsPage;
