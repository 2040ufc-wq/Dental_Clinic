/**
 * Shared types for the frontend service layer.
 * Shapes mirror docs/04-api-spec.md so mock services can later be swapped
 * for real /api/v1 calls without touching any screen.
 */

export type StaffRole = "admin" | "receptionist" | "dentist" | "assistant";

export interface StaffUser {
  id: string;
  type: "staff";
  role: StaffRole;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
}

export interface PatientUser {
  id: string;
  type: "patient";
  fullName: string;
  mobile: string; // E.164, e.g. +966501234567
}

export type SessionUser = StaffUser | PatientUser;

/** Error codes the auth screens understand (API spec §1.5 + auth-specific codes). */
export type ApiErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "RATE_LIMITED"
  | "MFA_INVALID"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_LOCKED"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

/** Error thrown by every service call; screens translate `code` into a message. */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    public readonly details: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

// ---- Auth DTOs (API spec §2) ----

export interface StaffLoginResult {
  user: StaffUser;
  /** true → the user must enter a 2FA code before continuing */
  mfaRequired: boolean;
  /** false + mfaRequired → the user must set up 2FA first (Admin, first login) */
  mfaEnrolled: boolean;
}

export interface MfaEnrollment {
  factorId: string;
  qrCodeSvg: string;
  secret: string;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
  simulated: boolean;
}

export interface OtpVerifyResult {
  isNewAccount: boolean;
  patient?: PatientUser;
}
