"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { Link, usePathname } from "@/shared/i18n/navigation";

/** Toggles between Arabic and English on the same page (docs/05 A6 header). */
export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={other}
      aria-label={t("switchLanguageLabel")}
      lang={other}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-text-secondary hover:bg-muted hover:text-foreground"
    >
      <Languages aria-hidden="true" className="size-4" />
      {t("switchLanguage")}
    </Link>
  );
}
