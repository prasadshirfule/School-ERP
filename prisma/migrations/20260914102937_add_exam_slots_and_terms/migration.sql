-- AlterTable
ALTER TABLE "FeeInvoice" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ReportCard" ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "term1EndDate" TIMESTAMP(3),
ADD COLUMN     "term1StartDate" TIMESTAMP(3),
ADD COLUMN     "term2EndDate" TIMESTAMP(3),
ADD COLUMN     "term2StartDate" TIMESTAMP(3),
ADD COLUMN     "trustName" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "rollNumber" TEXT;

-- CreateTable
CREATE TABLE "ExamSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamSlot_schoolId_academicYear_idx" ON "ExamSlot"("schoolId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSlot_schoolId_academicYear_code_key" ON "ExamSlot"("schoolId", "academicYear", "code");

-- AddForeignKey
ALTER TABLE "ExamSlot" ADD CONSTRAINT "ExamSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
