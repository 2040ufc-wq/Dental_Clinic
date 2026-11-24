"use client";

import { createContext, useContext } from "react";
import type { StaffUser } from "@/ui/services/types";

/** The signed-in staff member, provided by <AppShell> after the route guard passes. */
export const StaffUserContext = createContext<StaffUser | null>(null);

export function useStaffUser(): StaffUser {
  const user = useContext(StaffUserContext);
  if (!user) throw new Error("useStaffUser must be used inside <AppShell>");
  return user;
}
