import { z } from "zod";

export const StudentCreateSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  rollNumber: z.string().max(20).optional().nullable(),
  dob: z.string().min(1, "Date of birth is required"),
  sectionId: z.string().optional().nullable(),
  academicYear: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  aadharNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  previousSchoolName: z.string().optional().nullable(),
  previousClass: z.string().optional().nullable(),
  transferCertificateNumber: z.string().optional().nullable(),
  fatherName: z.string().optional().nullable(),
  fatherOccupation: z.string().optional().nullable(),
  fatherPhone: z.string().optional().nullable(),
  motherName: z.string().optional().nullable(),
  motherOccupation: z.string().optional().nullable(),
  motherPhone: z.string().optional().nullable(),
  guardianName: z.string().optional().nullable(),
  guardianRelation: z.string().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  medicalConditions: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  classDesignation: z.string().optional().nullable(),
  // Optional admission fee details
  totalFees: z.union([z.number(), z.string()]).optional().nullable(),
  amountPaidNow: z.union([z.number(), z.string()]).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
});

export const StudentUpdateSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  rollNumber: z.string().max(20).optional().nullable(),
  dob: z.string().optional(),
  sectionId: z.string().optional().nullable(),
  academicYear: z.string().optional(),
  gender: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  aadharNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  previousSchoolName: z.string().optional().nullable(),
  previousClass: z.string().optional().nullable(),
  transferCertificateNumber: z.string().optional().nullable(),
  fatherName: z.string().optional().nullable(),
  fatherOccupation: z.string().optional().nullable(),
  fatherPhone: z.string().optional().nullable(),
  motherName: z.string().optional().nullable(),
  motherOccupation: z.string().optional().nullable(),
  motherPhone: z.string().optional().nullable(),
  guardianName: z.string().optional().nullable(),
  guardianRelation: z.string().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  medicalConditions: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  classDesignation: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const AttendanceMarkSchema = z.object({
  sectionId: z.string().min(1, "Section ID is required"),
  date: z.string().min(1, "Date is required"),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "LEAVE"]),
    })
  ).min(1, "At least one attendance record is required"),
});

export const FeeStructureSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  academicYear: z.string().min(1, "Academic year is required"),
  amount: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d{1,2})?$/)]),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"]),
});

export const BulkInvoiceCreateSchema = z.object({
  feeStructureId: z.string().min(1, "Fee structure ID is required"),
  sectionId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  dueDate: z.string().min(1, "Due date is required"),
  discountAmount: z.union([z.number().min(0), z.string()]).optional(),
});

export const PaymentRecordSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d{1,2})?$/)]),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
  gatewayRef: z.string().optional().nullable(),
});

export const MarksEntrySchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
  examName: z.string().min(1, "Exam name / code is required"),
  maxScore: z.union([z.number().positive(), z.string()]),
  marks: z.array(
    z.object({
      studentId: z.string().min(1),
      score: z.union([z.number().min(0), z.string()]),
    })
  ).min(1, "At least one marks entry is required"),
});

export const NoticeCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required"),
  audience: z.array(z.enum(["ADMIN", "PRINCIPAL", "TEACHER", "PARENT", "ACCOUNTANT"])).min(1),
});

export const LeaveRequestCreateSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
});

export const LeaveRequestReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminRemark: z.string().optional().nullable(),
});

export const AssignmentCreateSchema = z.object({
  sectionId: z.string().min(1, "Section ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
});

export const CertificateGenerateSchema = z.object({
  type: z.enum(["BONAFIDE", "CHARACTER", "TC"]),
  studentId: z.string().min(1, "Student ID is required"),
  reasonForLeaving: z.string().optional().nullable(),
  conductRemark: z.string().optional().nullable(),
  lastAttendanceDate: z.string().optional().nullable(),
});

export const SchoolSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  principalName: z.string().optional().nullable(),
  affiliationNumber: z.string().optional().nullable(),
  trustName: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  term1StartDate: z.string().optional().nullable(),
  term1EndDate: z.string().optional().nullable(),
  term2StartDate: z.string().optional().nullable(),
  term2EndDate: z.string().optional().nullable(),
});

export const TeacherCreateSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("A valid email address is required"),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const SubjectCreateSchema = z.object({
  name: z.string().min(1, "Subject name is required").max(100),
});

export const ClassCreateSchema = z.object({
  name: z.string().min(1, "Class name is required").max(50),
  sections: z.array(
    z.object({
      name: z.string().min(1, "Section name is required").max(10),
      classTeacherId: z.string().optional().nullable(),
    })
  ).min(1, "At least one section is required"),
});

export const SectionCreateSchema = z.object({
  name: z.string().min(1, "Section name is required").max(10),
  classId: z.string().min(1, "Class ID is required"),
  classTeacherId: z.string().optional().nullable(),
  academicYear: z.string().optional(),
});

export const PeriodCreateSchema = z.object({
  periodNumber: z.number().int().positive("Period number must be positive"),
  label: z.string().min(1, "Label is required").max(50),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isBreak: z.boolean().optional(),
});

export const DepartmentCreateSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100),
  headTeacherId: z.string().optional().nullable(),
});

export const ExamSlotCreateSchema = z.object({
  name: z.string().min(1, "Exam slot name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  term: z.number().int().min(1).max(3),
  weightage: z.number().min(0).max(100),
  academicYear: z.string().min(1, "Academic year is required"),
});

export const SyllabusTopicCreateSchema = z.object({
  sectionId: z.string().min(1, "Section ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().nullable(),
  term: z.number().int().min(1).max(3).optional(),
});

