import createMiddleware from "next-intl/middleware";
import { routing } from "@/shared/i18n/routing";

/**
 * Next.js 16 "proxy" (formerly middleware).
 * Adds the language prefix to every URL (/login → /ar/login).
 * Route protection by role is added in the Dashboard step.
 */
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next.js internals and files with an extension (images, icons …)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
