import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(12, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const IndianMobileRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
export const PincodeRegex = /^[1-9][0-9]{5}$/;

export const SchoolRegistrationApplicationSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters").max(150),
  schoolEmail: z.string().email("Invalid school email address").toLowerCase().trim(),
  contactMobile: z.string().regex(IndianMobileRegex, "Invalid 10-digit Indian mobile number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(PincodeRegex, "PIN code must be a valid 6-digit Indian PIN"),
  boardType: z.string().default("CBSE"),
  affiliationNumber: z.string().max(50).optional(),
  adminFullName: z.string().min(3, "Administrator name must be at least 3 characters"),
  adminEmail: z.string().email("Invalid administrator email address").toLowerCase().trim(),
  adminMobile: z.string().regex(IndianMobileRegex, "Invalid administrator mobile number"),
  adminPassword: z.string().min(12, "Administrator password must be at least 12 characters"),
});
export type SchoolRegistrationApplicationInput = z.infer<typeof SchoolRegistrationApplicationSchema>;

export const OtpVerificationSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  purpose: z.enum([
    "EMAIL_VERIFICATION",
    "MOBILE_OTP",
    "PASSWORD_RESET",
    "ADMIN_ACTIVATION",
    "PARENT_INVITATION",
  ]),
  otp: z.string().length(6, "Verification code must be exactly 6 digits"),
});
export type OtpVerificationInput = z.infer<typeof OtpVerificationSchema>;

export const ParentRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  phone: z.string().regex(IndianMobileRegex, "Invalid 10-digit Indian mobile number"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});
export type ParentRegistrationInput = z.infer<typeof ParentRegistrationSchema>;

export const ChildLinkRequestSchema = z.object({
  schoolId: z.string().min(1, "School ID is required"),
  admissionNo: z.string().min(1, "Student admission number is required"),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]).default("FATHER"),
});
export type ChildLinkRequestInput = z.infer<typeof ChildLinkRequestSchema>;
