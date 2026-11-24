import { AppShell } from "@/ui/components/app-shell/app-shell";

/** Every staff page is wrapped in the app frame + login check (docs/05 A6, PLT-07). */
export default function StaffLayout({ children }: LayoutProps<"/[locale]">) {
  return <AppShell>{children}</AppShell>;
}
