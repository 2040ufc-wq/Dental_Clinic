import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/ui/features/auth/auth-layout";
import { StaffLoginFlow } from "@/ui/features/auth/staff-login-flow";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.staff" });
  return { title: t("metaTitle") };
}

/** S1 — Staff login (email + password, then 2FA for admins). */
export default async function StaffLoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthLayout>
      <StaffLoginFlow />
    </AuthLayout>
  );
}
