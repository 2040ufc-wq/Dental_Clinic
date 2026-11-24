import { setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/ui/components/coming-soon";

/** TEMPORARY placeholder — replaced by the patient portal (booking-wizard phase). */
export default async function MyAppointmentsPage({
  params,
}: PageProps<"/[locale]/my-appointments">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ComingSoon />;
}
