/**
 * ==============================================================================
 * VIDYORA — SYNTHETIC DEVELOPMENT SEED
 * Product: Vidyora — Smarter Schools. Better Learning.
 * Safety: Strictly development & staging only. Fully idempotent upserts.
 * Zero real student, parent, or teacher personal information.
 * ==============================================================================
 */

import { PrismaClient, Role, SchoolStatus, Gender, StudentStatus, StudentAttendanceStatus, FeeFrequency, InvoiceStatus, PaymentMethod, ExamLifecycleStatus, GuardianRelationship } from '@prisma/client';

const prisma = new PrismaClient();

// Fictional dev password hash for test accounts (bcrypt hash of "VidyoraDevPass2026!")
const DEV_PASSWORD_HASH = '$2a$10$wO3o00s35E2fE3ZlU.o57ecVfH/g33XkM8y8WJm59yT8XhJ26tKiy';

async function main() {
  console.log('--- Vidyora Synthetic Development Seed ---');

  // SAFETY CHECK 1: Production protection
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_SEED !== 'true') {
    throw new Error('FATAL: Development seed execution blocked in production environment.');
  }

  // SAFETY CHECK 2: Database endpoint safety
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('ep-muddy-butterfly-a16q2j0p') || dbUrl.includes('plain-surf-10645492')) {
    throw new Error('FATAL: Database URL matches old production School ERP! Aborting seed.');
  }

  console.log('Environment safety checks passed.');

  // ============================================================================
  // SCHOOL 1: Aryabhata Vidyapeeth (CBSE Board)
  // ============================================================================
  console.log('Seeding School 1: Aryabhata Vidyapeeth...');

  const school1 = await prisma.school.upsert({
    where: { id: 'school-aryabhata-cbse' },
    update: {},
    create: {
      id: 'school-aryabhata-cbse',
      name: 'Aryabhata Vidyapeeth',
      boardType: 'CBSE',
      address: 'Plot 42, Knowledge Park, Pune, Maharashtra 411001',
      phone: '+91 20 2555 0101',
      email: 'admin@aryabhatavidyapeeth.edu.in',
      website: 'https://aryabhata.vidyora.internal',
      principalName: 'Dr. Meera Kulkarni',
      affiliationNumber: 'CBSE-AFF-2026-4401',
      trustName: 'Aryabhata Educational Foundation',
      establishedYear: 2008,
      status: SchoolStatus.ACTIVE,
    },
  });

  const academicYear1 = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school1.id,
        name: '2026-27',
      },
    },
    update: {},
    create: {
      id: 'ay-aryabhata-2026-27',
      schoolId: school1.id,
      name: '2026-27',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      isCurrent: true,
    },
  });

  // Admin User 1
  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@aryabhata.edu.in' },
    update: {},
    create: {
      id: 'user-admin-aryabhata',
      email: 'admin@aryabhata.edu.in',
      fullName: 'Vikram Joshi (Admin)',
      phone: '+91 98220 01101',
      role: Role.ADMIN,
      passwordHash: DEV_PASSWORD_HASH,
      isActive: true,
    },
  });

  await prisma.schoolMembership.upsert({
    where: {
      schoolId_userId: {
        schoolId: school1.id,
        userId: admin1.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      userId: admin1.id,
      role: Role.ADMIN,
    },
  });

  // Teacher 1
  const teacherUser1 = await prisma.user.upsert({
    where: { email: 'teacher.math@aryabhata.edu.in' },
    update: {},
    create: {
      id: 'user-teacher-math-aryabhata',
      email: 'teacher.math@aryabhata.edu.in',
      fullName: 'Rajesh Sharma',
      phone: '+91 98220 01102',
      role: Role.TEACHER,
      passwordHash: DEV_PASSWORD_HASH,
      isActive: true,
    },
  });

  await prisma.schoolMembership.upsert({
    where: {
      schoolId_userId: {
        schoolId: school1.id,
        userId: teacherUser1.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      userId: teacherUser1.id,
      role: Role.TEACHER,
    },
  });

  const deptMath1 = await prisma.department.upsert({
    where: {
      schoolId_code: {
        schoolId: school1.id,
        code: 'MATH',
      },
    },
    update: {},
    create: {
      id: 'dept-aryabhata-math',
      schoolId: school1.id,
      name: 'Mathematics Department',
      code: 'MATH',
    },
  });

  const teacherProfile1 = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser1.id },
    update: {},
    create: {
      id: 'tp-rajesh-sharma',
      schoolId: school1.id,
      userId: teacherUser1.id,
      employeeCode: 'EMP-ARYA-001',
      designation: 'TGT Mathematics',
      qualification: 'M.Sc. Mathematics, B.Ed.',
      joiningDate: new Date('2022-06-15'),
      departmentId: deptMath1.id,
    },
  });

  // Classes & Sections
  const class10 = await prisma.class.upsert({
    where: {
      schoolId_name: {
        schoolId: school1.id,
        name: 'Class 10',
      },
    },
    update: {},
    create: {
      id: 'class-aryabhata-10',
      schoolId: school1.id,
      name: 'Class 10',
      order: 10,
    },
  });

  const section10A = await prisma.section.upsert({
    where: {
      classId_name: {
        classId: class10.id,
        name: 'A',
      },
    },
    update: {},
    create: {
      id: 'section-aryabhata-10a',
      schoolId: school1.id,
      classId: class10.id,
      name: 'A',
      capacity: 40,
      classTeacherId: teacherProfile1.id,
    },
  });

  // Subject
  const subjMath = await prisma.subject.upsert({
    where: {
      schoolId_code: {
        schoolId: school1.id,
        code: 'MATH10',
      },
    },
    update: {},
    create: {
      id: 'subj-aryabhata-math10',
      schoolId: school1.id,
      name: 'Mathematics',
      code: 'MATH10',
    },
  });

  await prisma.classSubject.upsert({
    where: {
      classId_subjectId: {
        classId: class10.id,
        subjectId: subjMath.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      classId: class10.id,
      subjectId: subjMath.id,
      weeklyPeriods: 6,
    },
  });

  await prisma.teacherAssignment.upsert({
    where: {
      teacherProfileId_sectionId_subjectId_academicYearId: {
        teacherProfileId: teacherProfile1.id,
        sectionId: section10A.id,
        subjectId: subjMath.id,
        academicYearId: academicYear1.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      teacherProfileId: teacherProfile1.id,
      sectionId: section10A.id,
      subjectId: subjMath.id,
      academicYearId: academicYear1.id,
    },
  });

  // Students & Guardians
  const student1 = await prisma.student.upsert({
    where: {
      schoolId_admissionNo: {
        schoolId: school1.id,
        admissionNo: 'ADM-2026-0101',
      },
    },
    update: {},
    create: {
      id: 'student-aarav-patel',
      schoolId: school1.id,
      admissionNo: 'ADM-2026-0101',
      admissionDate: new Date('2024-06-10'),
      fullName: 'Aarav Patel',
      rollNumber: '101',
      dob: new Date('2011-04-18'),
      gender: Gender.MALE,
      bloodGroup: 'B+',
      sectionId: section10A.id,
      status: StudentStatus.ACTIVE,
      emergencyContactPhone: '+91 98220 44001',
      parentEmail: 'suresh.patel@example.com',
    },
  });

  const parentUser1 = await prisma.user.upsert({
    where: { email: 'suresh.patel@example.com' },
    update: {},
    create: {
      id: 'user-parent-suresh-patel',
      email: 'suresh.patel@example.com',
      fullName: 'Suresh Patel',
      phone: '+91 98220 44001',
      role: Role.PARENT,
      passwordHash: DEV_PASSWORD_HASH,
      isActive: true,
    },
  });

  await prisma.schoolMembership.upsert({
    where: {
      schoolId_userId: {
        schoolId: school1.id,
        userId: parentUser1.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      userId: parentUser1.id,
      role: Role.PARENT,
    },
  });

  const parentProfile1 = await prisma.parentProfile.upsert({
    where: { userId: parentUser1.id },
    update: {},
    create: {
      id: 'pp-suresh-patel',
      userId: parentUser1.id,
      fullName: 'Suresh Patel',
      phone: '+91 98220 44001',
      occupation: 'Software Engineer',
    },
  });

  await prisma.studentGuardian.upsert({
    where: {
      studentId_parentProfileId: {
        studentId: student1.id,
        parentProfileId: parentProfile1.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      studentId: student1.id,
      parentProfileId: parentProfile1.id,
      relationship: GuardianRelationship.FATHER,
      isPrimary: true,
    },
  });

  // Attendance
  await prisma.studentAttendance.upsert({
    where: {
      studentId_date_sectionId_academicYearId: {
        studentId: student1.id,
        date: new Date('2026-11-09'),
        sectionId: section10A.id,
        academicYearId: academicYear1.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      studentId: student1.id,
      sectionId: section10A.id,
      academicYearId: academicYear1.id,
      date: new Date('2026-11-09'),
      status: StudentAttendanceStatus.PRESENT,
      markedByUserId: teacherUser1.id,
    },
  });

  // Fee Structure & Invoicing
  const feeStructure1 = await prisma.feeStructure.upsert({
    where: { id: 'fee-aryabhata-class10-annual' },
    update: {},
    create: {
      id: 'fee-aryabhata-class10-annual',
      schoolId: school1.id,
      academicYearId: academicYear1.id,
      classId: class10.id,
      name: 'Class 10 Annual Tuition & Lab Fee',
      totalAmount: 48000.00,
      frequency: FeeFrequency.TERM,
    },
  });

  await prisma.feeInstallment.upsert({
    where: {
      feeStructureId_installmentNumber: {
        feeStructureId: feeStructure1.id,
        installmentNumber: 1,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      feeStructureId: feeStructure1.id,
      installmentNumber: 1,
      name: 'Term 1 Installment',
      amount: 24000.00,
      dueDate: new Date('2026-07-15'),
    },
  });

  const invoice1 = await prisma.feeInvoice.upsert({
    where: {
      schoolId_invoiceNumber: {
        schoolId: school1.id,
        invoiceNumber: 'INV-ARYA-2026-0001',
      },
    },
    update: {},
    create: {
      id: 'inv-aryabhata-0001',
      schoolId: school1.id,
      academicYearId: academicYear1.id,
      studentId: student1.id,
      feeStructureId: feeStructure1.id,
      invoiceNumber: 'INV-ARYA-2026-0001',
      totalAmountDue: 24000.00,
      discountAmount: 0.00,
      netAmountDue: 24000.00,
      dueDate: new Date('2026-07-15'),
      status: InvoiceStatus.PAID,
    },
  });

  await prisma.feePayment.upsert({
    where: {
      schoolId_receiptNumber: {
        schoolId: school1.id,
        receiptNumber: 'REC-ARYA-2026-0001',
      },
    },
    update: {},
    create: {
      id: 'pay-aryabhata-0001',
      schoolId: school1.id,
      invoiceId: invoice1.id,
      receiptNumber: 'REC-ARYA-2026-0001',
      amount: 24000.00,
      paymentMethod: PaymentMethod.UPI,
      transactionReference: 'UPI/20260714/991044',
      receivedByUserId: admin1.id,
      remarks: 'Term 1 Tuition Fee Paid via UPI',
    },
  });

  // Exam Configuration & Marks
  const examTypeUT1 = await prisma.examType.upsert({
    where: {
      schoolId_academicYearId_code: {
        schoolId: school1.id,
        academicYearId: academicYear1.id,
        code: 'UT1',
      },
    },
    update: {},
    create: {
      id: 'et-aryabhata-ut1',
      schoolId: school1.id,
      academicYearId: academicYear1.id,
      code: 'UT1',
      name: 'Unit Test 1',
      order: 1,
    },
  });

  const exam1 = await prisma.examination.upsert({
    where: { id: 'exam-aryabhata-10-ut1' },
    update: {},
    create: {
      id: 'exam-aryabhata-10-ut1',
      schoolId: school1.id,
      academicYearId: academicYear1.id,
      examTypeId: examTypeUT1.id,
      classId: class10.id,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-07'),
      status: ExamLifecycleStatus.PUBLISHED,
    },
  });

  const examSubj1 = await prisma.examSubject.upsert({
    where: {
      examinationId_subjectId: {
        examinationId: exam1.id,
        subjectId: subjMath.id,
      },
    },
    update: {},
    create: {
      id: 'es-aryabhata-10-ut1-math',
      schoolId: school1.id,
      examinationId: exam1.id,
      subjectId: subjMath.id,
      examDate: new Date('2026-08-03'),
      maxMarks: 50.00,
      passMarks: 18.00,
    },
  });

  await prisma.studentMark.upsert({
    where: {
      examSubjectId_studentId: {
        examSubjectId: examSubj1.id,
        studentId: student1.id,
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      examSubjectId: examSubj1.id,
      studentId: student1.id,
      marksObtained: 46.50,
      enteredByUserId: teacherUser1.id,
    },
  });

  // ============================================================================
  // SCHOOL 2: Saraswati Vidya Mandir (State Board)
  // ============================================================================
  console.log('Seeding School 2: Saraswati Vidya Mandir...');

  const school2 = await prisma.school.upsert({
    where: { id: 'school-saraswati-state' },
    update: {},
    create: {
      id: 'school-saraswati-state',
      name: 'Saraswati Vidya Mandir',
      boardType: 'STATE',
      address: 'Station Road, Nashik, Maharashtra 422001',
      phone: '+91 253 2590 0202',
      email: 'office@saraswativm.edu.in',
      principalName: 'Smt. Vandana Deshpande',
      affiliationNumber: 'MH-STATE-2026-8812',
      trustName: 'Shri Saraswati Shikshan Prasarak Mandal',
      establishedYear: 1995,
      status: SchoolStatus.ACTIVE,
    },
  });

  const academicYear2 = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school2.id,
        name: '2026-27',
      },
    },
    update: {},
    create: {
      id: 'ay-saraswati-2026-27',
      schoolId: school2.id,
      name: '2026-27',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2027-05-01'),
      isCurrent: true,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'admin@saraswativm.edu.in' },
    update: {},
    create: {
      id: 'user-admin-saraswati',
      email: 'admin@saraswativm.edu.in',
      fullName: 'Ramesh Kadam (Admin)',
      phone: '+91 94220 02201',
      role: Role.ADMIN,
      passwordHash: DEV_PASSWORD_HASH,
      isActive: true,
    },
  });

  await prisma.schoolMembership.upsert({
    where: {
      schoolId_userId: {
        schoolId: school2.id,
        userId: admin2.id,
      },
    },
    update: {},
    create: {
      schoolId: school2.id,
      userId: admin2.id,
      role: Role.ADMIN,
    },
  });

  const class8 = await prisma.class.upsert({
    where: {
      schoolId_name: {
        schoolId: school2.id,
        name: 'Class 8',
      },
    },
    update: {},
    create: {
      id: 'class-saraswati-8',
      schoolId: school2.id,
      name: 'Class 8',
      order: 8,
    },
  });

  const section8A = await prisma.section.upsert({
    where: {
      classId_name: {
        classId: class8.id,
        name: 'A',
      },
    },
    update: {},
    create: {
      id: 'section-saraswati-8a',
      schoolId: school2.id,
      classId: class8.id,
      name: 'A',
      capacity: 45,
    },
  });

  await prisma.student.upsert({
    where: {
      schoolId_admissionNo: {
        schoolId: school2.id,
        admissionNo: 'ADM-SVM-2026-0088',
      },
    },
    update: {},
    create: {
      id: 'student-swara-bhosale',
      schoolId: school2.id,
      admissionNo: 'ADM-SVM-2026-0088',
      admissionDate: new Date('2024-06-20'),
      fullName: 'Swara Bhosale',
      rollNumber: '08',
      dob: new Date('2013-08-22'),
      gender: Gender.FEMALE,
      sectionId: section8A.id,
      status: StudentStatus.ACTIVE,
      emergencyContactPhone: '+91 94220 77002',
    },
  });

  console.log('--- Synthetic Development Seed Completed Successfully ---');
  console.log('Seed summary:');
  console.log('  School 1: Aryabhata Vidyapeeth (CBSE) -> 1 class, 1 section, 1 teacher, 1 student, fee invoice & marks');
  console.log('  School 2: Saraswati Vidya Mandir (State) -> 1 class, 1 section, 1 student, multi-tenant separated');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
