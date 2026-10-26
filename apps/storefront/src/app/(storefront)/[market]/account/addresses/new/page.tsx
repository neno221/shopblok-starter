import type { Metadata } from "next";
import { accountMetadata } from "../../../../../../lib/account-page";
import { param } from "../../../../../../lib/auth-page";
import { AddressScreen } from "../address-screen";

// D64 (T53): a new address for the book (`../address-screen.tsx`). Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.address.titleNew);
}

export default async function NewAddressPage({ searchParams }: Props) {
  const query = await searchParams;
  return <AddressScreen flashKey={param(query.f)} />;
}
