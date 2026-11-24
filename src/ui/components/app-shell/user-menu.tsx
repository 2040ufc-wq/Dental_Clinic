"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "@/shared/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { clearSession } from "@/ui/services/session";
import type { StaffUser } from "@/ui/services/types";

/** Header user menu: name, role, sign out (docs/05 A6). */
export function UserMenu({ user }: { user: StaffUser }) {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const locale = useLocale();
  const router = useRouter();
  const name = locale === "ar" ? user.fullNameAr : user.fullNameEn;
  const initials = name.replace(/^د\.\s*|^Dr\.\s*/, "").split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("userMenu")}
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700"
        >
          {initials}
        </span>
        <span className="hidden flex-col items-start text-start leading-tight md:flex">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-text-secondary">{tr(user.role)}</span>
        </span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-text-secondary md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-text-secondary" dir="ltr">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            clearSession();
            router.replace("/login");
          }}
        >
          <LogOut aria-hidden="true" className="rtl:rotate-180" />
          {tc("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
