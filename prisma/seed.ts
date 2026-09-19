import { PrismaClient, Role, AttendanceStatus, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Clean existing records in reverse dependency order
  await prisma.payment.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.marks.deleteMany();
  await prisma.reportCard.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.gradingScale.deleteMany();
  await prisma.studentParent.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  // ═══════════════════════════════════════════════════════════════
  // TENANT 1: Greenfield International (School A)
  // ═══════════════════════════════════════════════════════════════
  const schoolA = await prisma.school.create({
    data: {
      name: "Greenfield International School",
      boardType: "CBSE",
      address: "123 Education Lane, Bangalore",
      phone: "+91 80 1234 5678",
      isActive: true,
    },
  });
  console.log(`Created School A: ${schoolA.name} (${schoolA.id})`);

  // Grading scale for School A
  await prisma.gradingScale.createMany({
    data: [
      { schoolId: schoolA.id, minScore: 90, maxScore: 100, grade: "A+" },
      { schoolId: schoolA.id, minScore: 80, maxScore: 89, grade: "A" },
      { schoolId: schoolA.id, minScore: 70, maxScore: 79, grade: "B+" },
      { schoolId: schoolA.id, minScore: 60, maxScore: 69, grade: "B" },
      { schoolId: schoolA.id, minScore: 50, maxScore: 59, grade: "C" },
      { schoolId: schoolA.id, minScore: 0, maxScore: 49, grade: "F" },
    ],
  });

  // Users for School A
  const adminA = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "admin@greenfield.edu",
      role: Role.ADMIN,
      passwordHash,
      phone: "+91 98765 43210",
    },
  });

  const accountantA = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "accountant@greenfield.edu",
      role: Role.ACCOUNTANT,
      passwordHash,
      phone: "+91 98765 43211",
    },
  });

  const teacherUser1 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "teacher1@greenfield.edu",
      role: Role.TEACHER,
      passwordHash,
      phone: "+91 98765 43212",
    },
  });
  const teacherProfile1 = await prisma.teacher.create({
    data: {
      userId: teacherUser1.id,
      fullName: "Sarah Jenkins",
    },
  });

  const teacherUser2 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "teacher2@greenfield.edu",
      role: Role.TEACHER,
      passwordHash,
      phone: "+91 98765 43213",
    },
  });
  const teacherProfile2 = await prisma.teacher.create({
    data: {
      userId: teacherUser2.id,
      fullName: "Robert Davis",
    },
  });

  // Classes & Sections for School A
  const class1 = await prisma.class.create({
    data: {
      schoolId: schoolA.id,
      name: "Class 1",
      order: 1,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      schoolId: schoolA.id,
      name: "Class 2",
      order: 2,
    },
  });

  const class3 = await prisma.class.create({
    data: {
      schoolId: schoolA.id,
      name: "Class 3",
      order: 3,
    },
  });

  const section1A = await prisma.section.create({
    data: {
      schoolId: schoolA.id,
      classId: class1.id,
      name: "A",
      academicYear: "2026-27",
      classTeacherId: teacherProfile1.id,
    },
  });

  const section1B = await prisma.section.create({
    data: {
      schoolId: schoolA.id,
      classId: class1.id,
      name: "B",
      academicYear: "2026-27",
      classTeacherId: teacherProfile2.id,
    },
  });

  const section2A = await prisma.section.create({
    data: {
      schoolId: schoolA.id,
      classId: class2.id,
      name: "A",
      academicYear: "2026-27",
    },
  });

  // Subjects & Teacher Assignments
  const mathSubject = await prisma.subject.create({
    data: { schoolId: schoolA.id, name: "Mathematics" },
  });
  const scienceSubject = await prisma.subject.create({
    data: { schoolId: schoolA.id, name: "Science" },
  });
  const englishSubject = await prisma.subject.create({
    data: { schoolId: schoolA.id, name: "English" },
  });

  await prisma.teacherSubject.createMany({
    data: [
      { teacherId: teacherProfile1.id, subjectId: mathSubject.id },
      { teacherId: teacherProfile1.id, subjectId: englishSubject.id },
      { teacherId: teacherProfile2.id, subjectId: scienceSubject.id },
    ],
  });

  // Students for School A
  const student1 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "ADM-2026-001",
      fullName: "Aarav Sharma",
      dob: new Date("2019-04-15"),
      sectionId: section1A.id,
      academicYear: "2026-27",
    },
  });

  const student2 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "ADM-2026-002",
      fullName: "Diya Patel",
      dob: new Date("2019-07-22"),
      sectionId: section1A.id,
      academicYear: "2026-27",
    },
  });

  const student3 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "ADM-2026-003",
      fullName: "Rohan Gupta",
      dob: new Date("2019-01-10"),
      sectionId: section1A.id,
      academicYear: "2026-27",
    },
  });

  const student4 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "ADM-2026-004",
      fullName: "Ananya Iyer",
      dob: new Date("2019-11-05"),
      sectionId: section1B.id,
      academicYear: "2026-27",
    },
  });

  const student5 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "ADM-2026-005",
      fullName: "Kabir Verma",
      dob: new Date("2018-05-18"),
      sectionId: section2A.id,
      academicYear: "2026-27",
    },
  });

  // Parents for School A
  const parentUser1 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "parent1@greenfield.edu",
      role: Role.PARENT,
      passwordHash,
      phone: "+91 98765 43220",
    },
  });
  const parentProfile1 = await prisma.parent.create({
    data: {
      userId: parentUser1.id,
      schoolId: schoolA.id,
      fullName: "Vikram Sharma",
      phone: "+91 98765 43220",
    },
  });

  const parentUser2 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "parent2@greenfield.edu",
      role: Role.PARENT,
      passwordHash,
      phone: "+91 98765 43221",
    },
  });
  const parentProfile2 = await prisma.parent.create({
    data: {
      userId: parentUser2.id,
      schoolId: schoolA.id,
      fullName: "Meera Patel",
      phone: "+91 98765 43221",
    },
  });

  // StudentParent Linkages
  await prisma.studentParent.createMany({
    data: [
      {
        studentId: student1.id,
        parentId: parentProfile1.id,
        relationship: "Father",
        isPrimary: true,
      },
      {
        studentId: student2.id,
        parentId: parentProfile2.id,
        relationship: "Mother",
        isPrimary: true,
      },
    ],
  });

  // Fee Structure & Invoices for School A
  const feeStructureA = await prisma.feeStructure.create({
    data: {
      schoolId: schoolA.id,
      name: "Annual Tuition Fee — Class 1 (2026-27)",
      academicYear: "2026-27",
      amount: 15000.0,
      frequency: "ANNUAL",
    },
  });

  const invoice1 = await prisma.feeInvoice.create({
    data: {
      schoolId: schoolA.id,
      studentId: student1.id,
      feeStructureId: feeStructureA.id,
      amountDue: 15000.0,
      discountAmount: 1000.0,
      dueDate: new Date("2026-10-31"),
      status: InvoiceStatus.PARTIALLY_PAID,
    },
  });

  const payment1 = await prisma.payment.create({
    data: {
      schoolId: schoolA.id,
      invoiceId: invoice1.id,
      amount: 7000.0,
      method: "UPI",
      receiptNumber: `REC-${schoolA.id.slice(-4).toUpperCase()}-0001`,
      paidAt: new Date("2026-09-01T10:30:00Z"),
    },
  });

  const invoice2 = await prisma.feeInvoice.create({
    data: {
      schoolId: schoolA.id,
      studentId: student2.id,
      feeStructureId: feeStructureA.id,
      amountDue: 15000.0,
      discountAmount: 0.0,
      dueDate: new Date("2026-10-31"),
      status: InvoiceStatus.UNPAID,
    },
  });

  // Attendance for School A
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.attendance.createMany({
    data: [
      {
        schoolId: schoolA.id,
        studentId: student1.id,
        sectionId: section1A.id,
        date: yesterday,
        status: AttendanceStatus.PRESENT,
        markedBy: teacherUser1.id,
      },
      {
        schoolId: schoolA.id,
        studentId: student2.id,
        sectionId: section1A.id,
        date: yesterday,
        status: AttendanceStatus.PRESENT,
        markedBy: teacherUser1.id,
      },
      {
        schoolId: schoolA.id,
        studentId: student3.id,
        sectionId: section1A.id,
        date: yesterday,
        status: AttendanceStatus.ABSENT,
        markedBy: teacherUser1.id,
      },
      {
        schoolId: schoolA.id,
        studentId: student1.id,
        sectionId: section1A.id,
        date: today,
        status: AttendanceStatus.PRESENT,
        markedBy: teacherUser1.id,
      },
    ],
  });

  // Notices for School A
  await prisma.notice.createMany({
    data: [
      {
        schoolId: schoolA.id,
        title: "Welcome to Academic Year 2026-27",
        body: "We are thrilled to welcome all staff, students, and parents to the new academic year! Orientation starts Monday.",
        audience: [Role.ADMIN, Role.TEACHER, Role.PARENT, Role.ACCOUNTANT],
      },
      {
        schoolId: schoolA.id,
        title: "Staff Meeting on Curriculum Guidelines",
        body: "All teaching staff are requested to attend the curriculum review session in the conference room at 3 PM this Friday.",
        audience: [Role.TEACHER, Role.ADMIN],
      },
      {
        schoolId: schoolA.id,
        title: "Term 1 Fee Submission Deadline",
        body: "Dear parents, please note that the deadline for Term 1 tuition fee payments is October 31st.",
        audience: [Role.PARENT],
      },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // TENANT 2: Oakridge Academy (School B — Minimal Target for Isolation)
  // ═══════════════════════════════════════════════════════════════
  const schoolB = await prisma.school.create({
    data: {
      name: "Oakridge Academy",
      boardType: "ICSE",
      address: "45 Hilltop Road, Pune",
      phone: "+91 20 8765 4321",
      isActive: true,
    },
  });
  console.log(`Created School B: ${schoolB.name} (${schoolB.id})`);

  const adminB = await prisma.user.create({
    data: {
      schoolId: schoolB.id,
      email: "admin@oakridge.edu",
      role: Role.ADMIN,
      passwordHash,
      phone: "+91 99887 76655",
    },
  });

  const teacherUserB = await prisma.user.create({
    data: {
      schoolId: schoolB.id,
      email: "teacher@oakridge.edu",
      role: Role.TEACHER,
      passwordHash,
      phone: "+91 99887 76656",
    },
  });
  const teacherProfileB = await prisma.teacher.create({
    data: {
      userId: teacherUserB.id,
      fullName: "Arthur Pendelton",
    },
  });

  const classB1 = await prisma.class.create({
    data: {
      schoolId: schoolB.id,
      name: "Class 1",
      order: 1,
    },
  });

  const sectionB1A = await prisma.section.create({
    data: {
      schoolId: schoolB.id,
      classId: classB1.id,
      name: "A",
      academicYear: "2026-27",
      classTeacherId: teacherProfileB.id,
    },
  });

  const studentB1 = await prisma.student.create({
    data: {
      schoolId: schoolB.id,
      admissionNo: "OAK-2026-001",
      fullName: "Bob Oakridge",
      dob: new Date("2019-03-25"),
      sectionId: sectionB1A.id,
      academicYear: "2026-27",
    },
  });

  const noticeB = await prisma.notice.create({
    data: {
      schoolId: schoolB.id,
      title: "Oakridge Academy Private Circular",
      body: "Confidential internal circular for Oakridge staff only.",
      audience: [Role.ADMIN, Role.TEACHER],
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("--------------------------------------------------");
  console.log("Credentials for testing:");
  console.log("All passwords: password123");
  console.log("School A (Greenfield International):");
  console.log("  • Admin:      admin@greenfield.edu");
  console.log("  • Teacher 1:  teacher1@greenfield.edu");
  console.log("  • Teacher 2:  teacher2@greenfield.edu");
  console.log("  • Accountant: accountant@greenfield.edu");
  console.log("  • Parent 1:   parent1@greenfield.edu");
  console.log("  • Parent 2:   parent2@greenfield.edu");
  console.log("School B (Oakridge Academy - Cross-Tenant Target):");
  console.log("  • Admin:      admin@oakridge.edu");
  console.log("  • Teacher:    teacher@oakridge.edu");
  console.log("  • Student:    Bob Oakridge (ID: " + studentB1.id + ")");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
