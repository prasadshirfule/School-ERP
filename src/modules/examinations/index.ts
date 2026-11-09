export interface ExamEvaluationDTO {
  examScheduleId: string;
  studentId: string;
  marksObtained: number;
  maxMarks: number;
  isAbsent: boolean;
}
