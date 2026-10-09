import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/utils";
import { tenantClient } from "@/lib/tenant";
import { getOrCreateExamSlots } from "@/lib/exam-slots";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const { id: studentId } = await params;
  const role = session.user.role;
  const schoolId = session.user.schoolId;
  const db = tenantClient(schoolId);

  // 1. Authorization check
  if (role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { students: true },
    });

    if (!parent || !parent.students.some((sp) => sp.studentId === studentId)) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
  }

  // 2. Fetch student profile
  const student = await db.student.findFirst({
    where: {
      id: studentId,
    },
    include: {
      section: {
        include: {
          class: true,
        },
      },
      school: {
        select: {
          id: true,
          name: true,
          boardType: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          logoUrl: true,
          principalName: true,
          affiliationNumber: true,
          establishedYear: true,
          trustName: true,
          term1StartDate: true,
          term1EndDate: true,
          term2StartDate: true,
          term2EndDate: true,
        },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // 3. Fetch school's grading scale
  const rawGradingScale = await db.gradingScale.findMany({
    orderBy: { minScore: "desc" },
  });


  const defaultScale = [
    { id: "scale-1", grade: "A+", minScore: 91, maxScore: 100 },
    { id: "scale-2", grade: "A", minScore: 81, maxScore: 90 },
    { id: "scale-3", grade: "B+", minScore: 71, maxScore: 80 },
    { id: "scale-4", grade: "B", minScore: 61, maxScore: 70 },
    { id: "scale-5", grade: "C+", minScore: 51, maxScore: 60 },
    { id: "scale-6", grade: "C", minScore: 41, maxScore: 50 },
    { id: "scale-7", grade: "D", minScore: 33, maxScore: 40 },
    { id: "scale-8", grade: "F", minScore: 0, maxScore: 32 },
  ];

  const gradingScale = rawGradingScale.length > 0 ? rawGradingScale : defaultScale;

  // Helper for grade lookup
  const calculateGrade = (pct: number): string => {
    const rounded = Math.round(pct);
    for (const scale of gradingScale) {
      if (rounded >= scale.minScore && rounded <= scale.maxScore) {
        return scale.grade;
      }
    }
    if (rounded > 100) return gradingScale[0]?.grade || "A+";
    return gradingScale[gradingScale.length - 1]?.grade || "F";
  };

  // 4. Fetch Exam Slots (auto-seeding if missing)
  const examSlots = await getOrCreateExamSlots(schoolId, student.academicYear);

  // Group all slots
  const t1Slots = examSlots.filter((s) => s.term === "TERM1").sort((a, b) => a.order - b.order);
  const t2Slots = examSlots.filter((s) => s.term === "TERM2").sort((a, b) => a.order - b.order);

  // 5. Fetch all marks recorded for this student
  const marks = await db.marks.findMany({
    where: {
      studentId,
    },
    include: {
      subject: true,
    },
    orderBy: { subject: { name: "asc" } },
  });

  const hasAnyMarks = marks.length > 0;

  const normalizeSlotCode = (rawName: string) => {
    const raw = rawName.toUpperCase().replace(/[\s_-]/g, "");
    if (raw === "UT1" || raw === "UNITTEST1") return "UT1";
    if (raw === "UT2" || raw === "UNITTEST2") return "UT2";
    if (raw === "TERM1" || raw === "TERM1EXAM" || raw === "TERMI") return "TERM1";
    if (raw === "UT3" || raw === "UNITTEST3") return "UT3";
    if (raw === "UT4" || raw === "UNITTEST4") return "UT4";
    if (raw === "TERM2" || raw === "TERM2EXAM" || raw === "TERMII") return "TERM2";
    return raw;
  };

  // Map each slot code to its real Marks.maxScore values across all entered subjects
  const slotMarksMap = new Map<string, number[]>();
  for (const m of marks) {
    const code = normalizeSlotCode(m.examName);
    if (!slotMarksMap.has(code)) {
      slotMarksMap.set(code, []);
    }
    slotMarksMap.get(code)!.push(Number(m.maxScore));
  }

  const isSlotActive = (sCode: string) => {
    const code = normalizeSlotCode(sCode);
    return slotMarksMap.has(code) && (slotMarksMap.get(code)?.length ?? 0) > 0;
  };

  // Only render columns for exam slots that have marks entered for this student
  const visibleT1Slots = hasAnyMarks ? t1Slots.filter((s) => isSlotActive(s.code)) : t1Slots;
  const visibleT2Slots = hasAnyMarks ? t2Slots.filter((s) => isSlotActive(s.code)) : t2Slots;

  // Resolve maxScore per active slot from real Marks records (fallback to ExamSlot default)
  const getSlotMaxInfo = (sCode: string, defaultMax: number) => {
    const code = normalizeSlotCode(sCode);
    const recordedMaxes = slotMarksMap.get(code) || [];
    if (recordedMaxes.length === 0) {
      return { maxScore: defaultMax, isVarying: false };
    }
    const distinct = Array.from(new Set(recordedMaxes));
    return {
      maxScore: distinct[0],
      isVarying: distinct.length > 1,
    };
  };

  const t1SlotInfoMap = new Map(visibleT1Slots.map((s) => [s.code, getSlotMaxInfo(s.code, Number(s.maxScore))]));
  const t2SlotInfoMap = new Map(visibleT2Slots.map((s) => [s.code, getSlotMaxInfo(s.code, Number(s.maxScore))]));

  const t1Max = visibleT1Slots.reduce((acc, s) => acc + (t1SlotInfoMap.get(s.code)?.maxScore || Number(s.maxScore)), 0);
  const t2Max = visibleT2Slots.reduce((acc, s) => acc + (t2SlotInfoMap.get(s.code)?.maxScore || Number(s.maxScore)), 0);
  const totalCombinedMaxPerSubject = t1Max + t2Max;

  // Group marks by subject with real scores and real maxScores
  const subjectMap = new Map<
    string,
    {
      subjectId: string;
      subjectName: string;
      ut1: number | null;
      ut1Max: number | null;
      ut2: number | null;
      ut2Max: number | null;
      term1: number | null;
      term1Max: number | null;
      term1Total: number | null;
      term1TotalMax: number | null;
      ut3: number | null;
      ut3Max: number | null;
      ut4: number | null;
      ut4Max: number | null;
      term2: number | null;
      term2Max: number | null;
      term2Total: number | null;
      term2TotalMax: number | null;
      grandTotal: number | null;
      grandTotalMax: number | null;
      grade: string;
    }
  >();

  for (const m of marks) {
    const sId = m.subjectId;
    if (!subjectMap.has(sId)) {
      subjectMap.set(sId, {
        subjectId: sId,
        subjectName: m.subject.name,
        ut1: null,
        ut1Max: null,
        ut2: null,
        ut2Max: null,
        term1: null,
        term1Max: null,
        term1Total: null,
        term1TotalMax: null,
        ut3: null,
        ut3Max: null,
        ut4: null,
        ut4Max: null,
        term2: null,
        term2Max: null,
        term2Total: null,
        term2TotalMax: null,
        grandTotal: null,
        grandTotalMax: null,
        grade: "—",
      });
    }

    const row = subjectMap.get(sId)!;
    const scoreVal = Number(m.score);
    const maxVal = Number(m.maxScore);
    const code = normalizeSlotCode(m.examName);

    if (code === "UT1") { row.ut1 = scoreVal; row.ut1Max = maxVal; }
    else if (code === "UT2") { row.ut2 = scoreVal; row.ut2Max = maxVal; }
    else if (code === "TERM1") { row.term1 = scoreVal; row.term1Max = maxVal; }
    else if (code === "UT3") { row.ut3 = scoreVal; row.ut3Max = maxVal; }
    else if (code === "UT4") { row.ut4 = scoreVal; row.ut4Max = maxVal; }
    else if (code === "TERM2") { row.term2 = scoreVal; row.term2Max = maxVal; }
  }

  // Calculate row totals & grades per subject using real Marks.maxScore values
  let totalGrandScore = 0;
  let totalGrandMax = 0;

  const subjects = Array.from(subjectMap.values()).map((s) => {
    let t1ScoreSum: number | null = null;
    let t1MaxSum: number | null = null;
    if (visibleT1Slots.length > 0) {
      const activeScores: number[] = [];
      const activeMaxes: number[] = [];
      for (const slot of visibleT1Slots) {
        const c = normalizeSlotCode(slot.code);
        if (c === "UT1" && s.ut1 !== null) { activeScores.push(s.ut1); activeMaxes.push(s.ut1Max || t1SlotInfoMap.get(slot.code)?.maxScore || Number(slot.maxScore)); }
        else if (c === "UT2" && s.ut2 !== null) { activeScores.push(s.ut2); activeMaxes.push(s.ut2Max || t1SlotInfoMap.get(slot.code)?.maxScore || Number(slot.maxScore)); }
        else if (c === "TERM1" && s.term1 !== null) { activeScores.push(s.term1); activeMaxes.push(s.term1Max || t1SlotInfoMap.get(slot.code)?.maxScore || Number(slot.maxScore)); }
      }
      if (activeScores.length > 0) {
        t1ScoreSum = activeScores.reduce((a, b) => a + b, 0);
        t1MaxSum = activeMaxes.reduce((a, b) => a + b, 0);
      }
    }

    let t2ScoreSum: number | null = null;
    let t2MaxSum: number | null = null;
    if (visibleT2Slots.length > 0) {
      const activeScores: number[] = [];
      const activeMaxes: number[] = [];
      for (const slot of visibleT2Slots) {
        const c = normalizeSlotCode(slot.code);
        if (c === "UT3" && s.ut3 !== null) { activeScores.push(s.ut3); activeMaxes.push(s.ut3Max || t2SlotInfoMap.get(slot.code)?.maxScore || Number(slot.maxScore)); }
        else if (c === "UT4" && s.ut4 !== null) { activeScores.push(s.ut4); activeMaxes.push(s.ut4Max || t2SlotInfoMap.get(slot.code)?.maxScore || Number(slot.maxScore)); }
        else if (c === "TERM2" && s.term2 !== null) { activeScores.push(s.term2); activeMaxes.push(s.term2Max || t2SlotInfoMap.get(slot.code)?.maxScore || Number(slot.maxScore)); }
      }
      if (activeScores.length > 0) {
        t2ScoreSum = activeScores.reduce((a, b) => a + b, 0);
        t2MaxSum = activeMaxes.reduce((a, b) => a + b, 0);
      }
    }

    let grandScore: number | null = null;
    let grandMax: number | null = null;
    let grade = "—";

    if (t1ScoreSum !== null || t2ScoreSum !== null) {
      grandScore = (t1ScoreSum || 0) + (t2ScoreSum || 0);
      grandMax = (t1MaxSum || 0) + (t2MaxSum || 0);
      const subjectPct = grandMax > 0 ? (grandScore / grandMax) * 100 : 0;
      grade = calculateGrade(subjectPct);

      totalGrandScore += grandScore;
      totalGrandMax += grandMax;
    }

    return {
      ...s,
      term1Total: t1ScoreSum,
      term1TotalMax: t1MaxSum,
      term2Total: t2ScoreSum,
      term2TotalMax: t2MaxSum,
      grandTotal: grandScore,
      grandTotalMax: grandMax,
      grade,
    };
  });

  const overallPercentage =
    totalGrandMax > 0 ? Number(((totalGrandScore / totalGrandMax) * 100).toFixed(1)) : 0;
  const overallGrade = hasAnyMarks ? calculateGrade(overallPercentage) : "—";

  // 6. Attendance Computation
  // KNOWN LIMITATION (MVP): workingDays is calculated from distinct dates
  // where attendance was recorded for this student. If a teacher misses
  // marking attendance on a school day, it will not count as a working day,
  // which may yield slightly optimistic attendance percentages.
  const attendanceRecords = await db.attendance.findMany({
    where: { studentId },
    orderBy: { date: "asc" },
  });

  // Determine term date ranges
  const startYear = parseInt(student.academicYear.slice(0, 4), 10) || new Date().getFullYear();
  const defaultT1Start = new Date(`${startYear}-04-01T00:00:00.000Z`);
  const defaultT1End = new Date(`${startYear}-09-30T23:59:59.999Z`);
  const defaultT2Start = new Date(`${startYear}-10-01T00:00:00.000Z`);
  const defaultT2End = new Date(`${startYear + 1}-03-31T23:59:59.999Z`);

  const t1Start = student.school.term1StartDate || defaultT1Start;
  const t1End = student.school.term1EndDate || defaultT1End;
  const t2Start = student.school.term2StartDate || defaultT2Start;
  const t2End = student.school.term2EndDate || defaultT2End;

  const t1Records = attendanceRecords.filter((a) => {
    const d = new Date(a.date);
    return d >= t1Start && d <= t1End;
  });

  const t2Records = attendanceRecords.filter((a) => {
    const d = new Date(a.date);
    return d >= t2Start && d <= t2End;
  });

  const t1WorkingDays = t1Records.length;
  const t1PresentDays = t1Records.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const t1AttendancePct =
    t1WorkingDays > 0 ? `${((t1PresentDays / t1WorkingDays) * 100).toFixed(1)}%` : "0.0%";

  const t2WorkingDays = t2Records.length;
  const t2PresentDays = t2Records.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const t2AttendancePct =
    t2WorkingDays > 0 ? `${((t2PresentDays / t2WorkingDays) * 100).toFixed(1)}%` : "0.0%";

  // 7. Remarks
  const savedReportCard = await db.reportCard.findFirst({
    where: { studentId, academicYear: student.academicYear },
  });

  let remarks = savedReportCard?.remarks;
  if (!remarks) {
    if (overallGrade === "A+" || overallGrade === "A") {
      remarks = "Outstanding academic performance and conduct.";
    } else if (overallGrade === "B+" || overallGrade === "B") {
      remarks = "Good Performance.";
    } else if (overallGrade === "C+" || overallGrade === "C") {
      remarks = "Satisfactory — Regular revision recommended.";
    } else if (hasAnyMarks) {
      remarks = "Needs dedicated focus and extra practice.";
    } else {
      remarks = "Awaiting evaluation marks submission.";
    }
  }

  return NextResponse.json({
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      rollNumber: student.rollNumber || "—",
      fullName: student.fullName,
      academicYear: student.academicYear,
      photoUrl: student.photoUrl,
      dob: student.dob,
      gender: student.gender,
      fatherName: student.fatherName || "—",
      motherName: student.motherName || "—",
      section: student.section
        ? {
            name: student.section.name,
            className: student.section.class.name,
          }
        : null,
      school: student.school,
    },
    slots: {
      term1: visibleT1Slots.map((s) => ({
        code: s.code,
        name: s.name,
        maxScore: t1SlotInfoMap.get(s.code)?.maxScore || Number(s.maxScore),
        isVaryingMax: t1SlotInfoMap.get(s.code)?.isVarying || false,
      })),
      term2: visibleT2Slots.map((s) => ({
        code: s.code,
        name: s.name,
        maxScore: t2SlotInfoMap.get(s.code)?.maxScore || Number(s.maxScore),
        isVaryingMax: t2SlotInfoMap.get(s.code)?.isVarying || false,
      })),
      t1MaxTotal: t1Max,
      t2MaxTotal: t2Max,
      combinedMax: totalCombinedMaxPerSubject,
    },
    subjects,
    summary: {
      totalGrandScore,
      totalGrandMax,
      overallPercentage,
      overallGrade,
      hasAnyMarks,
    },
    attendance: [
      {
        exam: "Term 1",
        workingDays: t1WorkingDays,
        present: t1PresentDays,
        attendancePct: t1AttendancePct,
      },
      {
        exam: "Term 2",
        workingDays: t2WorkingDays,
        present: t2PresentDays,
        attendancePct: t2AttendancePct,
      },
    ],
    remarks,
    gradingScale,
  });
}
