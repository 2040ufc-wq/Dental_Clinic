"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/utils";
import type { StaffRole } from "@/ui/services/types";
import { NAV_BY_ROLE } from "./nav-items";

interface SidebarNavProps {
  role: StaffRole;
  /** Icons only (tablet width): labels become tooltips */
  compact?: boolean;
  onNavigate?: () => void;
}

/** Role-based navigation list (docs/05 A6). Used in the sidebar and in the mobile drawer. */
export function SidebarNav({ role, compact = false, onNavigate }: SidebarNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("mainNav")}>
      <ul className="flex flex-col gap-1">
        {NAV_BY_ROLE[role].map(({ key, href, icon: Icon, ready }) => {
          const active = ready && pathname.startsWith(href);
          const label = t(key);
          const base = cn(
            "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
            compact && "justify-center px-0",
          );

          if (!ready) {
            return (
              <li key={key}>
                <span
                  aria-disabled="true"
                  title={`${label} — ${t("soon")}`}
                  className={cn(base, "cursor-not-allowed text-white/45")}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  {!compact && (
                    <>
                      <span className="flex-1">{label}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                        {t("soon")}
                      </span>
                    </>
                  )}
                  {compact && <span className="sr-only">{`${label} — ${t("soon")}`}</span>}
                </span>
              </li>
            );
          }

          return (
            <li key={key}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={compact ? label : undefined}
                className={cn(
                  base,
                  active
                    ? "bg-white/10 text-white before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-primary-100"
                    : "text-white/80 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {compact ? <span className="sr-only">{label}</span> : label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
