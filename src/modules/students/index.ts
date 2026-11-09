export interface StudentProfile {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  schoolId: string;
  classId: string;
  sectionId?: string | null;
  academicYearId: string;
  status: string;
}
