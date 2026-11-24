"use client";

import { useTranslations } from "next-intl";
import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/ui/components/ui/button";

/** Inline error card with a retry button (docs/05 A7 "Error state"). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("states");
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-tint text-danger">
        <CircleAlert aria-hidden="true" className="size-6" />
      </span>
      <h2 className="text-base font-semibold text-navy-900">{t("loadFailed")}</h2>
      <p className="text-sm text-text-secondary">{t("loadFailedBody")}</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw aria-hidden="true" />
        {t("retry")}
      </Button>
    </div>
  );
}
