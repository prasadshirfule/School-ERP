-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "subjectId" TEXT,
    "teacherId" TEXT,
    "academicYear" TEXT NOT NULL,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusTopic" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "topicTitle" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" TIMESTAMP(3),

    CONSTRAINT "SyllabusTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tcNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "reasonForLeaving" TEXT NOT NULL,
    "lastAttendanceDate" TIMESTAMP(3) NOT NULL,
    "conductRemark" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Period_schoolId_idx" ON "Period"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Period_schoolId_periodNumber_key" ON "Period"("schoolId", "periodNumber");

-- CreateIndex
CREATE INDEX "TimetableSlot_schoolId_sectionId_idx" ON "TimetableSlot"("schoolId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_sectionId_dayOfWeek_periodId_academicYear_key" ON "TimetableSlot"("sectionId", "dayOfWeek", "periodId", "academicYear");

-- CreateIndex
CREATE INDEX "SyllabusTopic_schoolId_classId_subjectId_academicYear_idx" ON "SyllabusTopic"("schoolId", "classId", "subjectId", "academicYear");

-- CreateIndex
CREATE INDEX "CertificateLog_schoolId_studentId_idx" ON "CertificateLog"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateLog_schoolId_tcNumber_key" ON "CertificateLog"("schoolId", "tcNumber");

-- AddForeignKey
ALTER TABLE "Period" ADD CONSTRAINT "Period_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateLog" ADD CONSTRAINT "CertificateLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateLog" ADD CONSTRAINT "CertificateLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateLog" ADD CONSTRAINT "CertificateLog_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
