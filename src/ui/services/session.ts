import type { SessionUser } from "./types";

/**
 * MOCK session store (browser sessionStorage).
 * Replaced by Supabase's secure http-only cookie session when the backend is connected.
 * Never use this for real security — it only lets the mock screens remember who logged in.
 */
const KEY = "dc.mock-session";

export function saveSession(user: SessionUser): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // storage blocked (private mode) — the demo still works, just without persistence
  }
}

export function readSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Where staff land after login. Every role uses /dashboard; the page shows
 * role-specific content (admin / reception / dentist) — built in the Dashboard step.
 */
export const STAFF_HOME = "/dashboard";
export const PATIENT_HOME = "/my-appointments";
