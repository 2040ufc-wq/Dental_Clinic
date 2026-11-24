import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for Next.js navigation helpers.
 * Always import Link / useRouter / redirect from here so the /ar or /en prefix is kept.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
