"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "@/ui/services/types";

/**
 * Turns any thrown error into a translated, user-friendly sentence.
 * Unknown errors never leak technical details (docs/05 A7 error state).
 */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return (error: unknown): string => {
    if (error instanceof ApiError && t.has(error.code)) {
      return t(error.code, error.details);
    }
    return t("INTERNAL_ERROR");
  };
}
