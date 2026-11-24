import { setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/ui/components/coming-soon";

/** TEMPORARY placeholder — replaced by the Dashboard screen (next step). */
export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ComingSoon />;
}
