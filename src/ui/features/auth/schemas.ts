import { z } from "zod";

/**
 * Validation rules for the login screens.
 * Error messages are translation keys under "validation.*" — the form translates them,
 * so the same schema works in Arabic and English.
 * The backend will reuse these exact rules (shared Zod schemas, architecture D2).
 */

export const staffLoginSchema = z.object({
  email: z.email({ error: "emailInvalid" }),
  password: z.string().min(1, { error: "required" }),
});
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "emailInvalid" }),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Local Saudi mobile part: 9 digits starting with 5 (stored as +9665XXXXXXXX). */
export const patientMobileSchema = z.object({
  mobile: z.string().regex(/^5\d{8}$/, { error: "mobileInvalid" }),
});
export type PatientMobileInput = z.infer<typeof patientMobileSchema>;

export const sixDigitCode = z.string().regex(/^\d{6}$/, { error: "codeInvalid" });
