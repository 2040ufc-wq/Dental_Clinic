import type {
  MfaEnrollment,
  OtpRequestResult,
  OtpVerifyResult,
  StaffLoginResult,
  StaffUser,
} from "./types";
import { mockAuthService } from "./mock/mock-auth-service";

/**
 * Contract for authentication (API spec §2).
 * Screens depend on this interface only — never on the mock directly.
 */
export interface AuthService {
  staffLogin(email: string, password: string): Promise<StaffLoginResult>;
  verifyMfa(code: string): Promise<StaffUser>;
  enrollMfa(): Promise<MfaEnrollment>;
  confirmMfaEnrollment(factorId: string, code: string): Promise<StaffUser>;
  requestPasswordReset(email: string): Promise<void>;
  requestPatientOtp(mobile: string): Promise<OtpRequestResult>;
  verifyPatientOtp(mobile: string, code: string): Promise<OtpVerifyResult>;
}

/**
 * The active implementation. Frontend-first phase: mock only.
 * When the backend exists, a `httpAuthService` calling /api/v1/auth/* replaces this line.
 */
export const authService: AuthService = mockAuthService;
