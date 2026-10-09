import { PrismaClient, Role, AttendanceStatus, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting complete multi-tenant database seed...");

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
  await prisma.certificateLog.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.period.deleteMany();
  await prisma.syllabusTopic.deleteMany();
  await prisma.examSlot.deleteMany();
  await prisma.studentParent.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.department.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  const academicYear = "2026-27";

  // ═══════════════════════════════════════════════════════════════
  // TENANT 1: Delhi Public Academy (CBSE, New Delhi)
  // ═══════════════════════════════════════════════════════════════
  const schoolA = await prisma.school.create({
    data: {
      name: "Delhi Public Academy",
      boardType: "CBSE",
      address: "Sector 14, Rohini, New Delhi 110085",
      phone: "+91 11 2786 1234",
      email: "info@dpa-delhi.edu.in",
      website: "https://dpa-delhi.edu.in",
      principalName: "Dr. Rajeshwar Sharma",
      affiliationNumber: "CBSE/AFF/2026/2130456",
      establishedYear: 1998,
      trustName: "Delhi Educational & Charitable Trust",
      term1StartDate: new Date("2026-04-01"),
      term1EndDate: new Date("2026-09-30"),
      term2StartDate: new Date("2026-10-01"),
      term2EndDate: new Date("2027-03-31"),
      isActive: true,
    },
  });
  console.log(`Created School 1: ${schoolA.name} (${schoolA.id})`);

  // CBSE 9-point Grading scale for School A
  await prisma.gradingScale.createMany({
    data: [
      { schoolId: schoolA.id, minScore: 91, maxScore: 100, grade: "A1" },
      { schoolId: schoolA.id, minScore: 81, maxScore: 90, grade: "A2" },
      { schoolId: schoolA.id, minScore: 71, maxScore: 80, grade: "B1" },
      { schoolId: schoolA.id, minScore: 61, maxScore: 70, grade: "B2" },
      { schoolId: schoolA.id, minScore: 51, maxScore: 60, grade: "C1" },
      { schoolId: schoolA.id, minScore: 41, maxScore: 50, grade: "C2" },
      { schoolId: schoolA.id, minScore: 33, maxScore: 40, grade: "D" },
      { schoolId: schoolA.id, minScore: 0, maxScore: 32, grade: "E" },
    ],
  });

  // Standard 6 Exam Slots for School A
  const examSlotDefs = [
    { code: "UT1", name: "Unit Test 1", term: "TERM1", maxScore: 30, order: 1 },
    { code: "UT2", name: "Unit Test 2", term: "TERM1", maxScore: 30, order: 2 },
    { code: "TERM1", name: "Half Yearly Exam (Term 1)", term: "TERM1", maxScore: 80, order: 3 },
    { code: "UT3", name: "Unit Test 3", term: "TERM2", maxScore: 30, order: 4 },
    { code: "UT4", name: "Unit Test 4", term: "TERM2", maxScore: 30, order: 5 },
    { code: "TERM2", name: "Annual Exam (Term 2)", term: "TERM2", maxScore: 80, order: 6 },
  ];
  for (const s of examSlotDefs) {
    await prisma.examSlot.create({
      data: {
        schoolId: schoolA.id,
        academicYear,
        code: s.code,
        name: s.name,
        term: s.term,
        maxScore: s.maxScore,
        order: s.order,
      },
    });
  }

  // Periods for School A (8 periods + Lunch break)
  const periodsA = [];
  const periodSchedule = [
    { num: 1, label: "Period 1", start: "08:00", end: "08:45", isBreak: false },
    { num: 2, label: "Period 2", start: "08:45", end: "09:30", isBreak: false },
    { num: 3, label: "Period 3", start: "09:30", end: "10:15", isBreak: false },
    { num: 4, label: "Short Break", start: "10:15", end: "10:30", isBreak: true },
    { num: 5, label: "Period 4", start: "10:30", end: "11:15", isBreak: false },
    { num: 6, label: "Period 5", start: "11:15", end: "12:00", isBreak: false },
    { num: 7, label: "Lunch Break", start: "12:00", end: "12:40", isBreak: true },
    { num: 8, label: "Period 6", start: "12:40", end: "01:25", isBreak: false },
    { num: 9, label: "Period 7", start: "01:25", end: "02:10", isBreak: false },
  ];
  for (const p of periodSchedule) {
    const period = await prisma.period.create({
      data: {
        schoolId: schoolA.id,
        periodNumber: p.num,
        label: p.label,
        startTime: p.start,
        endTime: p.end,
        isBreak: p.isBreak,
      },
    });
    periodsA.push(period);
  }

  // Staff Users & Teachers for School A
  const adminUserA = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "admin@dpa.edu.in",
      role: Role.ADMIN,
      passwordHash,
      phone: "+91 98111 22334",
    },
  });

  const principalUserA = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "principal@dpa.edu.in",
      role: Role.PRINCIPAL,
      passwordHash,
      phone: "+91 98111 22335",
    },
  });

  const accountantUserA = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "accountant@dpa.edu.in",
      role: Role.ACCOUNTANT,
      passwordHash,
      phone: "+91 98111 22336",
    },
  });

  // Teachers
  const teacherUserA1 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "ananya.sharma@dpa.edu.in",
      role: Role.TEACHER,
      passwordHash,
      phone: "+91 98111 55001",
    },
  });
  const teacherProfileA1 = await prisma.teacher.create({
    data: {
      userId: teacherUserA1.id,
      fullName: "Mrs. Ananya Sharma",
    },
  });

  const teacherUserA2 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "vikram.malhotra@dpa.edu.in",
      role: Role.TEACHER,
      passwordHash,
      phone: "+91 98111 55002",
    },
  });
  const teacherProfileA2 = await prisma.teacher.create({
    data: {
      userId: teacherUserA2.id,
      fullName: "Mr. Vikram Malhotra",
    },
  });

  const teacherUserA3 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "priya.nair@dpa.edu.in",
      role: Role.TEACHER,
      passwordHash,
      phone: "+91 98111 55003",
    },
  });
  const teacherProfileA3 = await prisma.teacher.create({
    data: {
      userId: teacherUserA3.id,
      fullName: "Ms. Priya Nair",
    },
  });

  // Departments for School A
  const deptScienceA = await prisma.department.create({
    data: {
      schoolId: schoolA.id,
      name: "Science & Technology",
      headOfDepartmentId: teacherProfileA2.id,
    },
  });
  await prisma.teacher.update({
    where: { id: teacherProfileA2.id },
    data: { departmentId: deptScienceA.id },
  });

  const deptMathsA = await prisma.department.create({
    data: {
      schoolId: schoolA.id,
      name: "Mathematics Department",
      headOfDepartmentId: teacherProfileA1.id,
    },
  });
  await prisma.teacher.update({
    where: { id: teacherProfileA1.id },
    data: { departmentId: deptMathsA.id },
  });

  const deptHumanitiesA = await prisma.department.create({
    data: {
      schoolId: schoolA.id,
      name: "Languages & Humanities",
      headOfDepartmentId: teacherProfileA3.id,
    },
  });
  await prisma.teacher.update({
    where: { id: teacherProfileA3.id },
    data: { departmentId: deptHumanitiesA.id },
  });

  // Subjects for School A
  const subjectsDataA = [
    "Mathematics",
    "English Core",
    "Science",
    "Social Science",
    "Hindi Course-A",
    "Computer Science",
  ];
  const subjectMapA = new Map<string, any>();
  for (const name of subjectsDataA) {
    const subj = await prisma.subject.create({
      data: {
        schoolId: schoolA.id,
        name,
      },
    });
    subjectMapA.set(name, subj);
  }

  // Link Teachers to Subjects
  await prisma.teacherSubject.createMany({
    data: [
      { teacherId: teacherProfileA1.id, subjectId: subjectMapA.get("Mathematics").id },
      { teacherId: teacherProfileA1.id, subjectId: subjectMapA.get("Computer Science").id },
      { teacherId: teacherProfileA2.id, subjectId: subjectMapA.get("Science").id },
      { teacherId: teacherProfileA3.id, subjectId: subjectMapA.get("English Core").id },
      { teacherId: teacherProfileA3.id, subjectId: subjectMapA.get("Hindi Course-A").id },
      { teacherId: teacherProfileA3.id, subjectId: subjectMapA.get("Social Science").id },
    ],
  });

  // Classes & Sections for School A
  const classNames = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
  const classMapA = new Map<string, any>();
  const sectionMapA = new Map<string, any>();

  for (let i = 0; i < classNames.length; i++) {
    const name = classNames[i];
    const cls = await prisma.class.create({
      data: {
        schoolId: schoolA.id,
        name,
        order: i + 1,
      },
    });
    classMapA.set(name, cls);

    // Section A
    const secA = await prisma.section.create({
      data: {
        schoolId: schoolA.id,
        classId: cls.id,
        name: "A",
        academicYear,
        classTeacherId: i === 0 ? teacherProfileA1.id : i === 1 ? teacherProfileA2.id : null,
      },
    });
    sectionMapA.set(`${name}-A`, secA);

    // Section B
    const secB = await prisma.section.create({
      data: {
        schoolId: schoolA.id,
        classId: cls.id,
        name: "B",
        academicYear,
        classTeacherId: i === 0 ? teacherProfileA3.id : null,
      },
    });
    sectionMapA.set(`${name}-B`, secB);
  }

  // Syllabus Topics for Class 5 Mathematics & Science
  const class5 = classMapA.get("Class 5");
  const mathsSubj = subjectMapA.get("Mathematics");
  const scienceSubj = subjectMapA.get("Science");

  const mathsTopics = [
    { title: "Large Numbers & Indian Number System", order: 1, isCompleted: true },
    { title: "Addition and Subtraction of 6-digit Numbers", order: 2, isCompleted: true },
    { title: "Multiplication and Division", order: 3, isCompleted: true },
    { title: "Factors and Multiples (HCF & LCM)", order: 4, isCompleted: false },
    { title: "Fractions & Decimals Basics", order: 5, isCompleted: false },
    { title: "Geometry: Angles and Triangles", order: 6, isCompleted: false },
  ];
  for (const t of mathsTopics) {
    await prisma.syllabusTopic.create({
      data: {
        schoolId: schoolA.id,
        classId: class5.id,
        subjectId: mathsSubj.id,
        academicYear,
        topicTitle: t.title,
        order: t.order,
        isCompleted: t.isCompleted,
        completedDate: t.isCompleted ? new Date("2026-05-15") : null,
      },
    });
  }

  // Timetable Slots for Class 5-A
  const sec5A = sectionMapA.get("Class 5-A");
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  for (const day of days) {
    // Period 1: Math
    await prisma.timetableSlot.create({
      data: {
        schoolId: schoolA.id,
        sectionId: sec5A.id,
        dayOfWeek: day,
        periodId: periodsA[0].id,
        subjectId: mathsSubj.id,
        teacherId: teacherProfileA1.id,
        academicYear,
      },
    });
    // Period 2: English
    await prisma.timetableSlot.create({
      data: {
        schoolId: schoolA.id,
        sectionId: sec5A.id,
        dayOfWeek: day,
        periodId: periodsA[1].id,
        subjectId: subjectMapA.get("English Core").id,
        teacherId: teacherProfileA3.id,
        academicYear,
      },
    });
    // Period 3: Science
    await prisma.timetableSlot.create({
      data: {
        schoolId: schoolA.id,
        sectionId: sec5A.id,
        dayOfWeek: day,
        periodId: periodsA[2].id,
        subjectId: scienceSubj.id,
        teacherId: teacherProfileA2.id,
        academicYear,
      },
    });
  }

  // Fee Structures for School A
  const feeTuition = await prisma.feeStructure.create({
    data: {
      schoolId: schoolA.id,
      name: `Tuition Fee (Q1) - ${academicYear}`,
      academicYear,
      amount: 18500.0,
      frequency: "QUARTERLY",
    },
  });

  const feeComputer = await prisma.feeStructure.create({
    data: {
      schoolId: schoolA.id,
      name: `Computer Lab & STEM Fee - ${academicYear}`,
      academicYear,
      amount: 4500.0,
      frequency: "ANNUAL",
    },
  });

  const feeActivity = await prisma.feeStructure.create({
    data: {
      schoolId: schoolA.id,
      name: `Annual Sports & Cultural Activity Fee - ${academicYear}`,
      academicYear,
      amount: 3000.0,
      frequency: "ANNUAL",
    },
  });

  // Parent Users & Student Profiles for School A
  const parentUserA1 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "parent.sharma@gmail.com",
      role: Role.PARENT,
      passwordHash,
      phone: "+91 98222 11001",
    },
  });
  const parentProfileA1 = await prisma.parent.create({
    data: {
      userId: parentUserA1.id,
      schoolId: schoolA.id,
      fullName: "Mr. Suresh Sharma",
      phone: "+91 98222 11001",
    },
  });

  const parentUserA2 = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      email: "parent.verma@gmail.com",
      role: Role.PARENT,
      passwordHash,
      phone: "+91 98222 11002",
    },
  });
  const parentProfileA2 = await prisma.parent.create({
    data: {
      userId: parentUserA2.id,
      schoolId: schoolA.id,
      fullName: "Mrs. Meena Verma",
      phone: "+91 98222 11002",
    },
  });

  // Students for Class 5-A
  const student1 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "AY-2026-0001",
      rollNumber: "01",
      fullName: "AARAV SHARMA",
      dob: new Date("2015-08-14"),
      sectionId: sec5A.id,
      academicYear,
      gender: "Male",
      bloodGroup: "B+",
      category: "General",
      currentAddress: "Flat 402, Royal Palms, Rohini Sector 14, New Delhi",
      permanentAddress: "Flat 402, Royal Palms, Rohini Sector 14, New Delhi",
      fatherName: "Mr. Suresh Sharma",
      fatherOccupation: "Software Architect",
      fatherPhone: "+91 98222 11001",
      motherName: "Mrs. Kavita Sharma",
      motherOccupation: "Teacher",
      motherPhone: "+91 98222 11009",
      emergencyContactName: "Suresh Sharma",
      emergencyContactPhone: "+91 98222 11001",
      classDesignation: "Class Monitor",
    },
  });

  const student2 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "AY-2026-0002",
      rollNumber: "02",
      fullName: "DIYA VERMA",
      dob: new Date("2015-11-22"),
      sectionId: sec5A.id,
      academicYear,
      gender: "Female",
      bloodGroup: "O+",
      category: "OBC",
      currentAddress: "House 12B, Pocket 4, Rohini Sector 15, New Delhi",
      fatherName: "Mr. Rakesh Verma",
      fatherOccupation: "Businessman",
      motherName: "Mrs. Meena Verma",
      motherOccupation: "Advocate",
      motherPhone: "+91 98222 11002",
      emergencyContactName: "Meena Verma",
      emergencyContactPhone: "+91 98222 11002",
    },
  });

  const student3 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      admissionNo: "AY-2026-0003",
      rollNumber: "03",
      fullName: "ROHAN GUPTA",
      dob: new Date("2015-05-19"),
      sectionId: sec5A.id,
      academicYear,
      gender: "Male",
      bloodGroup: "A+",
      fatherName: "Mr. Anil Gupta",
      fatherOccupation: "Chartered Accountant",
      fatherPhone: "+91 98222 11003",
      motherName: "Mrs. Sunita Gupta",
    },
  });

  // Link Students to Parents
  await prisma.studentParent.create({
    data: {
      studentId: student1.id,
      parentId: parentProfileA1.id,
      relationship: "Father",
      isPrimary: true,
    },
  });

  await prisma.studentParent.create({
    data: {
      studentId: student2.id,
      parentId: parentProfileA2.id,
      relationship: "Mother",
      isPrimary: true,
    },
  });

  // Attendance Records for Past 30 Days for Class 5-A Students
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip Sundays
    if (d.getDay() === 0) continue;

    const dateOnly = new Date(d.toISOString().slice(0, 10));

    // Aarav: 95% Present
    const status1: AttendanceStatus = i === 12 ? AttendanceStatus.ABSENT : i === 5 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    await prisma.attendance.create({
      data: {
        schoolId: schoolA.id,
        studentId: student1.id,
        sectionId: sec5A.id,
        date: dateOnly,
        status: status1,
        markedBy: teacherUserA1.id,
      },
    });

    // Diya: 100% Present
    await prisma.attendance.create({
      data: {
        schoolId: schoolA.id,
        studentId: student2.id,
        sectionId: sec5A.id,
        date: dateOnly,
        status: AttendanceStatus.PRESENT,
        markedBy: teacherUserA1.id,
      },
    });

    // Rohan: Mixed
    const status3: AttendanceStatus = i === 8 || i === 9 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
    await prisma.attendance.create({
      data: {
        schoolId: schoolA.id,
        studentId: student3.id,
        sectionId: sec5A.id,
        date: dateOnly,
        status: status3,
        markedBy: teacherUserA1.id,
      },
    });
  }

  // Marks for Exam Slots
  const examSlotsA = await prisma.examSlot.findMany({
    where: { schoolId: schoolA.id },
  });

  const ut1Slot = examSlotsA.find((s) => s.code === "UT1")!;
  const ut2Slot = examSlotsA.find((s) => s.code === "UT2")!;
  const term1Slot = examSlotsA.find((s) => s.code === "TERM1")!;

  // Marks for Aarav Sharma
  await prisma.marks.createMany({
    data: [
      { studentId: student1.id, subjectId: mathsSubj.id, examName: "UT1", score: 28.5, maxScore: 30 },
      { studentId: student1.id, subjectId: mathsSubj.id, examName: "UT2", score: 29.0, maxScore: 30 },
      { studentId: student1.id, subjectId: mathsSubj.id, examName: "TERM1", score: 76.0, maxScore: 80 },
      { studentId: student1.id, subjectId: scienceSubj.id, examName: "UT1", score: 27.0, maxScore: 30 },
      { studentId: student1.id, subjectId: scienceSubj.id, examName: "UT2", score: 28.0, maxScore: 30 },
      { studentId: student1.id, subjectId: scienceSubj.id, examName: "TERM1", score: 74.5, maxScore: 80 },
      { studentId: student1.id, subjectId: subjectMapA.get("English Core").id, examName: "UT1", score: 26.0, maxScore: 30 },
      { studentId: student1.id, subjectId: subjectMapA.get("English Core").id, examName: "TERM1", score: 72.0, maxScore: 80 },
    ],
  });

  // Marks for Diya Verma
  await prisma.marks.createMany({
    data: [
      { studentId: student2.id, subjectId: mathsSubj.id, examName: "UT1", score: 30.0, maxScore: 30 },
      { studentId: student2.id, subjectId: mathsSubj.id, examName: "UT2", score: 30.0, maxScore: 30 },
      { studentId: student2.id, subjectId: mathsSubj.id, examName: "TERM1", score: 79.0, maxScore: 80 },
      { studentId: student2.id, subjectId: scienceSubj.id, examName: "UT1", score: 29.5, maxScore: 30 },
      { studentId: student2.id, subjectId: scienceSubj.id, examName: "TERM1", score: 78.0, maxScore: 80 },
    ],
  });

  // Report Card for Aarav Sharma
  await prisma.reportCard.create({
    data: {
      schoolId: schoolA.id,
      studentId: student1.id,
      academicYear,
      term: "TERM1",
      remarks: "Excellent grasp of concepts and consistent classroom participation. Keep up the high standard!",
    },
  });

  // Invoices & Payments for School A
  // Invoice 1: Aarav Tuition (PAID)
  const invAaravTuition = await prisma.feeInvoice.create({
    data: {
      schoolId: schoolA.id,
      studentId: student1.id,
      feeStructureId: feeTuition.id,
      amountDue: 18500.0,
      discountAmount: 0.0,
      dueDate: new Date("2026-05-10"),
      status: InvoiceStatus.PAID,
    },
  });
  await prisma.payment.create({
    data: {
      schoolId: schoolA.id,
      invoiceId: invAaravTuition.id,
      amount: 18500.0,
      method: "UPI",
      receiptNumber: "REC-2026-0001",
      paidAt: new Date("2026-05-04"),
    },
  });

  // Invoice 2: Aarav Computer Fee (UNPAID)
  await prisma.feeInvoice.create({
    data: {
      schoolId: schoolA.id,
      studentId: student1.id,
      feeStructureId: feeComputer.id,
      amountDue: 4500.0,
      discountAmount: 0.0,
      dueDate: new Date("2026-11-15"),
      status: InvoiceStatus.UNPAID,
    },
  });

  // Invoice 3: Diya Tuition (PARTIALLY_PAID)
  const invDiyaTuition = await prisma.feeInvoice.create({
    data: {
      schoolId: schoolA.id,
      studentId: student2.id,
      feeStructureId: feeTuition.id,
      amountDue: 18500.0,
      discountAmount: 0.0,
      dueDate: new Date("2026-05-10"),
      status: InvoiceStatus.PARTIALLY_PAID,
    },
  });
  await prisma.payment.create({
    data: {
      schoolId: schoolA.id,
      invoiceId: invDiyaTuition.id,
      amount: 10000.0,
      method: "BANK_TRANSFER",
      receiptNumber: "REC-2026-0002",
      paidAt: new Date("2026-05-08"),
    },
  });

  // Staff Leave Request for School A
  await prisma.leaveRequest.create({
    data: {
      schoolId: schoolA.id,
      userId: teacherUserA1.id,
      leaveType: "Casual",
      startDate: new Date("2026-10-15"),
      endDate: new Date("2026-10-16"),
      reason: "Family wedding event in hometown",
      status: "APPROVED",
      approvedByUserId: principalUserA.id,
      adminRemark: "Approved with class teacher substitute arranged.",
    },
  });

  await prisma.leaveRequest.create({
    data: {
      schoolId: schoolA.id,
      userId: teacherUserA2.id,
      leaveType: "Sick",
      startDate: new Date("2026-11-02"),
      endDate: new Date("2026-11-03"),
      reason: "Viral fever and physician advised rest",
      status: "PENDING",
    },
  });

  // Assignments for Class 5-A
  await prisma.assignment.create({
    data: {
      schoolId: schoolA.id,
      sectionId: sec5A.id,
      subjectId: mathsSubj.id,
      teacherId: teacherProfileA1.id,
      title: "Maths Worksheet: HCF & LCM Real-life Word Problems",
      description: "Solve questions 1 through 15 from Chapter 4 worksheet in your mathematics homework notebook.",
      dueDate: new Date("2026-10-25"),
    },
  });

  await prisma.assignment.create({
    data: {
      schoolId: schoolA.id,
      sectionId: sec5A.id,
      subjectId: scienceSubj.id,
      teacherId: teacherProfileA2.id,
      title: "Science Project: Plant Adaptation Chart",
      description: "Prepare a neat labeled chart illustrating terrestrial vs aquatic plant adaptations with short descriptions.",
      dueDate: new Date("2026-10-28"),
    },
  });

  // Notices for School A
  await prisma.notice.create({
    data: {
      schoolId: schoolA.id,
      title: "Parent-Teacher Meeting (PTM) for Term 1 Evaluation",
      body: "Dear Parents, the Parent-Teacher Meeting to discuss your ward's Half Yearly Exam performance will be held on Saturday, 17th October 2026 between 09:00 AM and 01:00 PM. Kindly adhere to the time slot allotted.",
      audience: [Role.PARENT, Role.TEACHER, Role.ADMIN],
    },
  });

  await prisma.notice.create({
    data: {
      schoolId: schoolA.id,
      title: "Diwali Holidays and School Re-opening Schedule",
      body: "The school will remain closed for Diwali break from 28th October to 3rd November 2026. Regular classes will resume from Wednesday, 4th November 2026.",
      audience: [Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.ACCOUNTANT],
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // TENANT 2: St. Xavier's High School (ICSE / State, Mumbai)
  // ═══════════════════════════════════════════════════════════════
  const schoolB = await prisma.school.create({
    data: {
      name: "St. Xavier's High School",
      boardType: "ICSE",
      address: "Dhobi Talao, Fort, Mumbai, Maharashtra 400001",
      phone: "+91 22 2262 0555",
      email: "admin@stxaviers-mumbai.edu",
      website: "https://stxaviers-mumbai.edu",
      principalName: "Fr. Augustine D'Souza",
      affiliationNumber: "ICSE/MAH/098/2026",
      establishedYear: 1869,
      trustName: "St. Xavier's Education Society",
      isActive: true,
    },
  });
  console.log(`Created School 2: ${schoolB.name} (${schoolB.id})`);

  // Grading scale for School B
  await prisma.gradingScale.createMany({
    data: [
      { schoolId: schoolB.id, minScore: 90, maxScore: 100, grade: "A+" },
      { schoolId: schoolB.id, minScore: 80, maxScore: 89, grade: "A" },
      { schoolId: schoolB.id, minScore: 70, maxScore: 79, grade: "B+" },
      { schoolId: schoolB.id, minScore: 60, maxScore: 69, grade: "B" },
      { schoolId: schoolB.id, minScore: 50, maxScore: 59, grade: "C" },
      { schoolId: schoolB.id, minScore: 35, maxScore: 49, grade: "D" },
      { schoolId: schoolB.id, minScore: 0, maxScore: 34, grade: "F" },
    ],
  });

  // Users for School B
  const adminB = await prisma.user.create({
    data: {
      schoolId: schoolB.id,
      email: "admin@stxaviers.edu",
      role: Role.ADMIN,
      passwordHash,
      phone: "+91 98200 11223",
    },
  });

  const accountantB = await prisma.user.create({
    data: {
      schoolId: schoolB.id,
      email: "accountant@stxaviers.edu",
      role: Role.ACCOUNTANT,
      passwordHash,
      phone: "+91 98200 11224",
    },
  });

  const teacherUserB1 = await prisma.user.create({
    data: {
      schoolId: schoolB.id,
      email: "teacher.pereira@stxaviers.edu",
      role: Role.TEACHER,
      passwordHash,
      phone: "+91 98200 11225",
    },
  });
  const teacherProfileB1 = await prisma.teacher.create({
    data: {
      userId: teacherUserB1.id,
      fullName: "Mr. Joseph Pereira",
    },
  });

  const parentUserB1 = await prisma.user.create({
    data: {
      schoolId: schoolB.id,
      email: "parent.fernandes@gmail.com",
      role: Role.PARENT,
      passwordHash,
      phone: "+91 98200 44556",
    },
  });
  const parentProfileB1 = await prisma.parent.create({
    data: {
      userId: parentUserB1.id,
      schoolId: schoolB.id,
      fullName: "Mrs. Clara Fernandes",
      phone: "+91 98200 44556",
    },
  });

  const classB1 = await prisma.class.create({
    data: {
      schoolId: schoolB.id,
      name: "Grade 8",
      order: 8,
    },
  });

  const secB1 = await prisma.section.create({
    data: {
      schoolId: schoolB.id,
      classId: classB1.id,
      name: "A",
      academicYear,
      classTeacherId: teacherProfileB1.id,
    },
  });

  const studentB1 = await prisma.student.create({
    data: {
      schoolId: schoolB.id,
      admissionNo: "AY-2026-0101",
      rollNumber: "12",
      fullName: "NEIL FERNANDES",
      dob: new Date("2012-03-25"),
      sectionId: secB1.id,
      academicYear,
      gender: "Male",
      bloodGroup: "A+",
      fatherName: "Mr. Francis Fernandes",
      motherName: "Mrs. Clara Fernandes",
      currentAddress: "Bandra West, Mumbai 400050",
    },
  });

  await prisma.studentParent.create({
    data: {
      studentId: studentB1.id,
      parentId: parentProfileB1.id,
      relationship: "Mother",
      isPrimary: true,
    },
  });

  // Transfer Certificate Log for School B
  await prisma.certificateLog.create({
    data: {
      schoolId: schoolB.id,
      studentId: studentB1.id,
      tcNumber: "TC-2026-001",
      issueDate: new Date("2026-09-15"),
      reasonForLeaving: "Relocation of family to Bangalore",
      lastAttendanceDate: new Date("2026-09-14"),
      conductRemark: "Exemplary character and academic progress.",
      generatedByUserId: adminB.id,
    },
  });

  console.log("\n✅ Database seed completed successfully with complete 2-tenant Indian School dataset!");
  console.log("--------------------------------------------------------------------------------");
  console.log("Credentials (All accounts password: password123):");
  console.log("• School 1 (CBSE - Delhi Public Academy):");
  console.log("    - Admin:      admin@dpa.edu.in");
  console.log("    - Principal:  principal@dpa.edu.in");
  console.log("    - Teacher:    ananya.sharma@dpa.edu.in / vikram.malhotra@dpa.edu.in");
  console.log("    - Parent:     parent.sharma@gmail.com / parent.verma@gmail.com");
  console.log("    - Accountant: accountant@dpa.edu.in");
  console.log("• School 2 (ICSE - St. Xavier's High School):");
  console.log("    - Admin:      admin@stxaviers.edu");
  console.log("    - Teacher:    teacher.pereira@stxaviers.edu");
  console.log("    - Parent:     parent.fernandes@gmail.com");
  console.log("    - Accountant: accountant@stxaviers.edu");
  console.log("--------------------------------------------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
