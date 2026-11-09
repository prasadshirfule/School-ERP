export type StudentAttendanceStatus = "PRESENT" | "ABSENT";

export interface AttendanceRecordDTO {
  studentId: string;
  classId: string;
  sectionId?: string | null;
  date: Date;
  status: StudentAttendanceStatus;
}
