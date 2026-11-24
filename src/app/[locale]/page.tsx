import { redirect } from "@/shared/i18n/navigation";

/**
 * Temporary: the public landing page is built with the booking wizard (later phase).
 * Until then, /ar and /en open the sign-in screen.
 */
export default async function LocaleHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  redirect({ href: "/login", locale });
}
