import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { AccountTabs } from "@/components/account/AccountTabs";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default async function Layout({ children }: LayoutProps<"/cuenta">) {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {user && <AccountTabs />}
      {children}
    </div>
  );
}
