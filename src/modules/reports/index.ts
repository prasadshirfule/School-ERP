export interface ReportCardSummary {
  studentId: string;
  academicYearId: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  grade?: string;
}
