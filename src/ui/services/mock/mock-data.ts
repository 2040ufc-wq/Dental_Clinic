import type { PatientUser, StaffUser } from "../types";

/**
 * SYNTHETIC demo data — fictional people only (requirement: no real patient data).
 * All staff accounts use the password below; 2FA and OTP codes are fixed.
 */
export const MOCK_PASSWORD = "Demo@1234";
export const MOCK_CODE = "123456";

interface MockStaffAccount extends StaffUser {
  isActive: boolean;
  mfaEnrolled: boolean;
}

export const mockStaffAccounts: MockStaffAccount[] = [
  {
    id: "stf-admin",
    type: "staff",
    role: "admin",
    fullNameAr: "نورة القحطاني",
    fullNameEn: "Noura Alqahtani",
    email: "admin@smile-clinic.test",
    isActive: true,
    mfaEnrolled: true,
  },
  {
    id: "stf-newadmin",
    type: "staff",
    role: "admin",
    fullNameAr: "فهد العتيبي",
    fullNameEn: "Fahad Alotaibi",
    email: "newadmin@smile-clinic.test",
    isActive: true,
    mfaEnrolled: false, // demonstrates the forced 2FA setup
  },
  {
    id: "stf-reception",
    type: "staff",
    role: "receptionist",
    fullNameAr: "ريم الشهري",
    fullNameEn: "Reem Alshehri",
    email: "reception@smile-clinic.test",
    isActive: true,
    mfaEnrolled: false,
  },
  {
    id: "stf-dentist",
    type: "staff",
    role: "dentist",
    fullNameAr: "د. سارة الحربي",
    fullNameEn: "Dr. Sara Alharbi",
    email: "dentist@smile-clinic.test",
    isActive: true,
    mfaEnrolled: false,
  },
  {
    id: "stf-assistant",
    type: "staff",
    role: "assistant",
    fullNameAr: "منى الدوسري",
    fullNameEn: "Mona Aldosari",
    email: "assistant@smile-clinic.test",
    isActive: true,
    mfaEnrolled: false,
  },
  {
    id: "stf-inactive",
    type: "staff",
    role: "receptionist",
    fullNameAr: "حساب موقوف",
    fullNameEn: "Inactive Account",
    email: "inactive@smile-clinic.test",
    isActive: false,
    mfaEnrolled: false,
  },
];

/** Patients who already have an online account (OTP login). Any other number = new patient. */
export const mockPatientAccounts: PatientUser[] = [
  { id: "pat-001", type: "patient", fullName: "عبدالله المطيري", mobile: "+966501234567" },
  { id: "pat-002", type: "patient", fullName: "Layla Hassan", mobile: "+966551112233" },
];
