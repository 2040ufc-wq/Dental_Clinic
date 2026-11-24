import { defineRouting } from "next-intl/routing";

/**
 * Language routing: every page lives under /ar/... or /en/...
 * Arabic is the default (requirement PLT-01).
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Text direction for a locale — drives <html dir="..."> */
export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
