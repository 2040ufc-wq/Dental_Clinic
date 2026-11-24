import type { AuthService } from "../auth-service";
import { ApiError, type StaffUser } from "../types";
import {
  MOCK_CODE,
  MOCK_PASSWORD,
  mockPatientAccounts,
  mockStaffAccounts,
} from "./mock-data";

/**
 * In-browser simulation of the auth API (API spec §2).
 * Reproduces the real business rules so screens are built against realistic behaviour:
 *  - generic "invalid credentials" (never reveals which field was wrong)
 *  - 5 failed logins → RATE_LIMITED
 *  - OTP: 5-minute expiry, 5 wrong attempts → OTP_LOCKED
 */

const MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

// --- in-memory state (resets on page reload, which is fine for a mock) ---
const failedLogins = new Map<string, number>();
let pendingMfaUser: StaffUser | null = null;
const otpState = new Map<
  string,
  { expiresAt: number; attempts: number; lockedUntil: number }
>();

function toStaffUser(account: (typeof mockStaffAccounts)[number]): StaffUser {
  const { id, type, role, fullNameAr, fullNameEn, email } = account;
  return { id, type, role, fullNameAr, fullNameEn, email };
}

export const mockAuthService: AuthService = {
  async staffLogin(email, password) {
    await delay();
    const key = email.trim().toLowerCase();

    if ((failedLogins.get(key) ?? 0) >= MAX_ATTEMPTS) {
      throw new ApiError("RATE_LIMITED", 429);
    }

    const account = mockStaffAccounts.find((a) => a.email === key);
    if (!account || password !== MOCK_PASSWORD) {
      failedLogins.set(key, (failedLogins.get(key) ?? 0) + 1);
      throw new ApiError("INVALID_CREDENTIALS", 401);
    }
    if (!account.isActive) {
      throw new ApiError("ACCOUNT_INACTIVE", 403);
    }

    failedLogins.delete(key);
    const user = toStaffUser(account);
    // PLT-03: 2FA mandatory for Admin
    const mfaRequired = account.role === "admin";
    pendingMfaUser = mfaRequired ? user : null;
    return { user, mfaRequired, mfaEnrolled: account.mfaEnrolled };
  },

  async verifyMfa(code) {
    await delay();
    if (!pendingMfaUser) throw new ApiError("INTERNAL_ERROR", 500);
    if (code !== MOCK_CODE) throw new ApiError("MFA_INVALID", 422);
    const user = pendingMfaUser;
    pendingMfaUser = null;
    return user;
  },

  async enrollMfa() {
    await delay(400);
    return {
      factorId: "factor-mock-1",
      secret: "JBSW Y3DP EHPK 3PXP",
      // A real provider returns a scannable QR SVG; the mock shows a labelled placeholder.
      qrCodeSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img"><rect width="160" height="160" fill="#fff"/><rect x="8" y="8" width="40" height="40" fill="none" stroke="#0f1e2e" stroke-width="8"/><rect x="112" y="8" width="40" height="40" fill="none" stroke="#0f1e2e" stroke-width="8"/><rect x="8" y="112" width="40" height="40" fill="none" stroke="#0f1e2e" stroke-width="8"/><text x="80" y="86" font-size="14" text-anchor="middle" fill="#52637a" font-family="sans-serif">SIMULATED</text></svg>`,
    };
  },

  async confirmMfaEnrollment(_factorId, code) {
    return mockAuthService.verifyMfa(code);
  },

  async requestPasswordReset() {
    await delay();
    // Always succeeds — never reveal whether the email exists.
  },

  async requestPatientOtp(mobile) {
    await delay();
    const current = otpState.get(mobile);
    if (current && current.lockedUntil > Date.now()) {
      throw new ApiError("OTP_LOCKED", 429);
    }
    otpState.set(mobile, {
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      lockedUntil: 0,
    });
    return { expiresInSeconds: 300, resendAfterSeconds: 60, simulated: true };
  },

  async verifyPatientOtp(mobile, code) {
    await delay();
    const state = otpState.get(mobile);
    if (!state) throw new ApiError("OTP_EXPIRED", 410);
    if (state.lockedUntil > Date.now()) throw new ApiError("OTP_LOCKED", 429);
    if (state.expiresAt < Date.now()) throw new ApiError("OTP_EXPIRED", 410);

    if (code !== MOCK_CODE) {
      state.attempts += 1;
      if (state.attempts >= MAX_ATTEMPTS) {
        state.lockedUntil = Date.now() + LOCK_MS;
        throw new ApiError("OTP_LOCKED", 429);
      }
      throw new ApiError("OTP_INVALID", 401, {
        attemptsLeft: MAX_ATTEMPTS - state.attempts,
      });
    }

    otpState.delete(mobile);
    const patient = mockPatientAccounts.find((p) => p.mobile === mobile);
    return patient ? { isNewAccount: false, patient } : { isNewAccount: true };
  },
};
