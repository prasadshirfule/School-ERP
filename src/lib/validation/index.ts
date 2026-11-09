import { z } from "zod";

/**
 * 1. School Registration Validation
 */
export const SchoolRegistrationSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters").max(120),
  code: z
    .string()
    .min(2, "School code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "School code must contain only uppercase alphanumeric characters, dashes, or underscores"),
  board: z.enum(["CBSE", "ICSE", "STATE_MAHARASHTRA", "STATE_KARNATAKA", "STATE_OTHER", "IB", "CAMBRIDGE", "OTHER"]),
  affiliationNo: z.string().optional(),
  contactEmail: z.string().email("Invalid school email address"),
  contactPhone: z.string().regex(/^[0-9+ -]{10,15}$/, "Invalid school phone number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
});

export type SchoolRegistrationInput = z.infer<typeof SchoolRegistrationSchema>;

/**
 * 2. Student Admission Validation
 */
export const StudentAdmissionSchema = z.object({
  admissionNo: z.string().min(1, "Admission number is required").max(50),
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  academicYearId: z.string().min(1, "Academic year is required"),
  rollNumber: z.string().optional(),
  emergencyContact: z.string().regex(/^[0-9+ -]{10,15}$/, "Invalid emergency contact number").optional(),
});

export type StudentAdmissionInput = z.infer<typeof StudentAdmissionSchema>;

/**
 * 3. Student Attendance Validation
 * STRICT DOMAIN RULE:
 * Only PRESENT and ABSENT are permitted for student attendance.
 * No Late, Half Day, or Leave.
 */
export const StudentAttendanceStatusEnum = z.enum(["PRESENT", "ABSENT"]);

export const StudentAttendanceMarkSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional(),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  date: z.coerce.date(),
  status: StudentAttendanceStatusEnum,
  remarks: z.string().max(255).optional(),
});

export type StudentAttendanceMarkInput = z.infer<typeof StudentAttendanceMarkSchema>;

/**
 * 4. Offline Fee Payment Validation
 * STRICT DOMAIN RULE:
 * Offline methods only: CASH, UPI, BANK_TRANSFER.
 * No online payment gateways or Razorpay.
 */
export const OfflinePaymentMethodEnum = z.enum(["CASH", "UPI", "BANK_TRANSFER"]);

export const RecordOfflinePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: OfflinePaymentMethodEnum,
  transactionReference: z.string().max(100).optional(),
  notes: z.string().max(255).optional(),
  paidAt: z.coerce.date().default(() => new Date()),
});

export type RecordOfflinePaymentInput = z.infer<typeof RecordOfflinePaymentSchema>;

/**
 * 5. Examination Marks Validation & Percentage Calculation
 */
export const ExamMarksEntrySchema = z.object({
  examScheduleId: z.string().min(1, "Exam schedule ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  marksObtained: z.number().min(0, "Marks obtained cannot be negative"),
  maxMarks: z.number().positive("Maximum marks must be greater than 0"),
  isAbsent: z.boolean().default(false),
  remarks: z.string().max(255).optional(),
}).refine(
  (data) => data.isAbsent || data.marksObtained <= data.maxMarks,
  {
    message: "Marks obtained cannot exceed maximum marks",
    path: ["marksObtained"],
  }
);

export type ExamMarksEntryInput = z.infer<typeof ExamMarksEntrySchema>;

/**
 * Strict Vidyora Annual Examination Percentage Calculation Rule:
 * Total marks obtained across all conducted examinations divided by
 * total maximum marks across those examinations, multiplied by 100.
 */
export function calculateAnnualPercentage(
  examResults: Array<{ marksObtained: number; maxMarks: number; isAbsent?: boolean }>
): {
  totalObtained: number;
  totalMax: number;
  percentage: number;
} {
  if (!examResults || examResults.length === 0) {
    return { totalObtained: 0, totalMax: 0, percentage: 0 };
  }

  let totalObtained = 0;
  let totalMax = 0;

  for (const result of examResults) {
    if (result.maxMarks <= 0) {
      throw new Error("Invalid examination entry: maxMarks must be positive");
    }
    totalMax += result.maxMarks;
    if (!result.isAbsent) {
      totalObtained += result.marksObtained;
    }
  }

  const rawPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const percentage = Math.round(rawPercentage * 100) / 100; // 2 decimal precision

  return { totalObtained, totalMax, percentage };
}

/**
 * 6. Invoice Status Determination
 */
export function determineInvoiceStatus(params: {
  netAmountDue: number;
  paidAmount: number;
  dueDate: Date;
  now?: Date;
}): "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" {
  const { netAmountDue, paidAmount, dueDate, now = new Date() } = params;

  if (paidAmount >= netAmountDue) {
    return "PAID";
  }
  if (now.getTime() > dueDate.getTime()) {
    return "OVERDUE";
  }
  if (paidAmount > 0) {
    return "PARTIAL";
  }
  return "PENDING";
}
