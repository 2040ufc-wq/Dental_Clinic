import { setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/ui/components/coming-soon";

/** TEMPORARY placeholder — replaced by patient registration (booking-wizard phase). */
export default async function RegisterPage({ params }: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ComingSoon />;
}
