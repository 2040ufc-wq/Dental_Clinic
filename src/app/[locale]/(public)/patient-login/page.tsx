import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/ui/features/auth/auth-layout";
import { PatientOtpFlow } from "@/ui/features/auth/patient-otp-flow";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/patient-login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.patient" });
  return { title: t("metaTitle") };
}

/** S1 — Patient login with mobile number + one-time code. */
export default async function PatientLoginPage({
  params,
}: PageProps<"/[locale]/patient-login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthLayout>
      <PatientOtpFlow />
    </AuthLayout>
  );
}
