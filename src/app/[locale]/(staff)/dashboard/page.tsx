import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardHome } from "@/ui/features/dashboard/dashboard-home";

/**
 * The MOCK login check in <AppShell> runs in the browser, so this page renders only after it
 * passes. Opt out of Next.js instant-navigation validation until real authentication is
 * connected; then the session is read on the server behind <Suspense> (Next.js guide
 * "authentication-with-cache-components") and this line is removed.
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("metaTitle") };
}

/** S2 — Dashboard (admin dashboard; other roles get their own later). */
export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    // Suspense: the dashboard reads ?period= from the URL, which is only known per request
    <Suspense>
      <DashboardHome />
    </Suspense>
  );
}
