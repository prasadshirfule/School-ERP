import assert from "assert";
import {
  SchoolRegistrationSchema,
  StudentAdmissionSchema,
  StudentAttendanceMarkSchema,
  RecordOfflinePaymentSchema,
  ExamMarksEntrySchema,
  calculateAnnualPercentage,
  determineInvoiceStatus,
} from "../../src/lib/validation";
import { Role, isValidRole } from "../../src/lib/authorization/roles";
import { hasPermission, Permission } from "../../src/lib/authorization/permissions";

export async function runValidationTests() {
  console.log("  Running Domain & Business Logic Unit Tests...");

  // 1. Role System (Strictly 5 roles, no school SUPER_ADMIN)
  assert.strictEqual(isValidRole("ADMIN"), true);
  assert.strictEqual(isValidRole("PRINCIPAL"), true);
  assert.strictEqual(isValidRole("ACCOUNTANT"), true);
  assert.strictEqual(isValidRole("TEACHER"), true);
  assert.strictEqual(isValidRole("PARENT"), true);
  assert.strictEqual(isValidRole("SUPER_ADMIN"), false, "School SUPER_ADMIN must NOT exist");
  assert.strictEqual(isValidRole("MODERATOR"), false);

  // Permission matrix verification
  assert.strictEqual(hasPermission(Role.ACCOUNTANT, Permission.FEES_COLLECT_OFFLINE), true);
  assert.strictEqual(hasPermission(Role.TEACHER, Permission.FEES_COLLECT_OFFLINE), false);
  assert.strictEqual(hasPermission(Role.PARENT, Permission.ATTENDANCE_MARK), false);
  assert.strictEqual(hasPermission(Role.TEACHER, Permission.ATTENDANCE_MARK), true);

  // 2. School Registration Validation
  const validSchool = SchoolRegistrationSchema.safeParse({
    name: "Aryabhata International Academy",
    code: "AIA-2026",
    board: "CBSE",
    contactEmail: "admin@aryabhata.edu.in",
    contactPhone: "+91 9876543210",
    address: "Sector 14, Ring Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
  });
  assert.strictEqual(validSchool.success, true);

  const invalidSchool = SchoolRegistrationSchema.safeParse({
    name: "A",
    code: "invalid code with spaces!",
    board: "UNKNOWN_BOARD",
    contactEmail: "not-an-email",
    contactPhone: "123",
    address: "",
    city: "",
    state: "",
    pincode: "12",
  });
  assert.strictEqual(invalidSchool.success, false);

  // 3. Student Attendance: Strictly PRESENT and ABSENT
  const presentAttendance = StudentAttendanceMarkSchema.safeParse({
    studentId: "std_001",
    classId: "cls_001",
    academicYearId: "ay_2026",
    date: new Date(),
    status: "PRESENT",
  });
  assert.strictEqual(presentAttendance.success, true);

  const absentAttendance = StudentAttendanceMarkSchema.safeParse({
    studentId: "std_001",
    classId: "cls_001",
    academicYearId: "ay_2026",
    date: new Date(),
    status: "ABSENT",
  });
  assert.strictEqual(absentAttendance.success, true);

  // Must reject Late, Half Day, Leave
  const lateAttendance = StudentAttendanceMarkSchema.safeParse({
    studentId: "std_001",
    classId: "cls_001",
    academicYearId: "ay_2026",
    date: new Date(),
    status: "LATE",
  });
  assert.strictEqual(lateAttendance.success, false, "Must reject LATE status");

  const halfDayAttendance = StudentAttendanceMarkSchema.safeParse({
    studentId: "std_001",
    classId: "cls_001",
    academicYearId: "ay_2026",
    date: new Date(),
    status: "HALF_DAY",
  });
  assert.strictEqual(halfDayAttendance.success, false, "Must reject HALF_DAY status");

  // 4. Offline Payments Only (CASH, UPI, BANK_TRANSFER)
  const cashPayment = RecordOfflinePaymentSchema.safeParse({
    invoiceId: "inv_123",
    amount: 15000,
    paymentMethod: "CASH",
  });
  assert.strictEqual(cashPayment.success, true);

  const upiPayment = RecordOfflinePaymentSchema.safeParse({
    invoiceId: "inv_123",
    amount: 15000,
    paymentMethod: "UPI",
    transactionReference: "UPI/2026/09912",
  });
  assert.strictEqual(upiPayment.success, true);

  const bankPayment = RecordOfflinePaymentSchema.safeParse({
    invoiceId: "inv_123",
    amount: 25000,
    paymentMethod: "BANK_TRANSFER",
    transactionReference: "NEFT-HDFC-9921",
  });
  assert.strictEqual(bankPayment.success, true);

  // Must reject Online / Gateway payments
  const razorpayPayment = RecordOfflinePaymentSchema.safeParse({
    invoiceId: "inv_123",
    amount: 15000,
    paymentMethod: "RAZORPAY",
  });
  assert.strictEqual(razorpayPayment.success, false, "Must reject RAZORPAY");

  const cardPayment = RecordOfflinePaymentSchema.safeParse({
    invoiceId: "inv_123",
    amount: 15000,
    paymentMethod: "CREDIT_CARD",
  });
  assert.strictEqual(cardPayment.success, false, "Must reject CREDIT_CARD");

  // 5. Exam Marks & Strict Annual Percentage Calculation Rule:
  // (Total marks obtained / Total max marks) * 100
  const validMarks = ExamMarksEntrySchema.safeParse({
    examScheduleId: "sch_1",
    studentId: "std_1",
    marksObtained: 88,
    maxMarks: 100,
  });
  assert.strictEqual(validMarks.success, true);

  const exceedingMarks = ExamMarksEntrySchema.safeParse({
    examScheduleId: "sch_1",
    studentId: "std_1",
    marksObtained: 105,
    maxMarks: 100,
  });
  assert.strictEqual(exceedingMarks.success, false, "Marks obtained cannot exceed max marks");

  const annualResult = calculateAnnualPercentage([
    { marksObtained: 85, maxMarks: 100 }, // Term 1 Math
    { marksObtained: 90, maxMarks: 100 }, // Term 1 Science
    { marksObtained: 75, maxMarks: 100 }, // Term 2 Math
    { marksObtained: 80, maxMarks: 100 }, // Term 2 Science
  ]);
  // Total obtained = 330, Total max = 400 => 330 / 400 * 100 = 82.5%
  assert.strictEqual(annualResult.totalObtained, 330);
  assert.strictEqual(annualResult.totalMax, 400);
  assert.strictEqual(annualResult.percentage, 82.5);

  // 6. Fee Invoice Status Determination
  const dueDate = new Date(Date.now() + 86400000 * 10); // 10 days in future
  const pastDueDate = new Date(Date.now() - 86400000 * 5); // 5 days in past

  assert.strictEqual(
    determineInvoiceStatus({ netAmountDue: 20000, paidAmount: 0, dueDate }),
    "PENDING"
  );
  assert.strictEqual(
    determineInvoiceStatus({ netAmountDue: 20000, paidAmount: 10000, dueDate }),
    "PARTIAL"
  );
  assert.strictEqual(
    determineInvoiceStatus({ netAmountDue: 20000, paidAmount: 20000, dueDate }),
    "PAID"
  );
  assert.strictEqual(
    determineInvoiceStatus({ netAmountDue: 20000, paidAmount: 10000, dueDate: pastDueDate }),
    "OVERDUE"
  );

  console.log("    ✓ Strict 5-role system verified (zero SUPER_ADMIN)");
  console.log("    ✓ School registration schema validation verified");
  console.log("    ✓ Student attendance strictly PRESENT/ABSENT validated (LATE/HALF_DAY rejected)");
  console.log("    ✓ Offline fee payment validated (CASH, UPI, BANK_TRANSFER accepted, online gateways rejected)");
  console.log("    ✓ Strict annual exam percentage rule verified (330/400 => 82.5%)");
  console.log("    ✓ Fee invoice status calculation verified (PENDING/PARTIAL/PAID/OVERDUE)");
}
