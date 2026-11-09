export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  schoolId: string;
  applicantFirstName: string;
  applicantLastName: string;
  targetClassId: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
}
