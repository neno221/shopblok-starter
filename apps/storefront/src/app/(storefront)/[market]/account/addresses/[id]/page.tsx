import type { Metadata } from "next";
import { accountMetadata } from "../../../../../../lib/account-page";
import { param } from "../../../../../../lib/auth-page";
import { AddressScreen } from "../address-screen";

// D64 (T53): a change to one of the customer's addresses (`../address-screen.tsx`); another's id
// is the 404. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.address.titleEdit);
}

export default async function EditAddressPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <AddressScreen addressId={id} flashKey={param(query.f)} />;
}
