import { Role } from "./roles";

export const Permission = {
  // School Settings & Setup
  SCHOOL_MANAGE_SETTINGS: "school:manage_settings",
  SCHOOL_VIEW_SETTINGS: "school:view_settings",
  
  // Academic Management
  ACADEMICS_MANAGE_YEARS: "academics:manage_years",
  ACADEMICS_MANAGE_CLASSES: "academics:manage_classes",
  ACADEMICS_MANAGE_SUBJECTS: "academics:manage_subjects",
  ACADEMICS_MANAGE_TIMETABLE: "academics:manage_timetable",
  ACADEMICS_VIEW: "academics:view",

  // Student Admissions & Management
  STUDENTS_CREATE: "students:create",
  STUDENTS_UPDATE: "students:update",
  STUDENTS_ARCHIVE: "students:archive",
  STUDENTS_VIEW_ALL: "students:view_all",
  STUDENTS_VIEW_ASSIGNED: "students:view_assigned",
  STUDENTS_VIEW_CHILD: "students:view_child",

  // Attendance (PRESENT / ABSENT strictly)
  ATTENDANCE_MARK: "attendance:mark",
  ATTENDANCE_VIEW_ALL: "attendance:view_all",
  ATTENDANCE_VIEW_CLASS: "attendance:view_class",
  ATTENDANCE_VIEW_CHILD: "attendance:view_child",

  // Examinations & Results
  EXAMS_MANAGE_SCHEDULE: "exams:manage_schedule",
  EXAMS_ENTER_MARKS: "exams:enter_marks",
  EXAMS_APPROVE_RESULTS: "exams:approve_results",
  EXAMS_PUBLISH_RESULTS: "exams:publish_results",
  EXAMS_VIEW_ALL: "exams:view_all",
  EXAMS_VIEW_CHILD: "exams:view_child",

  // Fees & Finance (Offline payments: CASH, UPI, BANK_TRANSFER)
  FEES_MANAGE_STRUCTURES: "fees:manage_structures",
  FEES_COLLECT_OFFLINE: "fees:collect_offline",
  FEES_RECORD_CONCESSION: "fees:record_concession",
  FEES_VIEW_REPORTS: "fees:view_reports",
  FEES_VIEW_RECEIPTS: "fees:view_receipts",
  FEES_VIEW_CHILD_STATEMENT: "fees:view_child_statement",

  // Staff Management
  STAFF_MANAGE_PROFILES: "staff:manage_profiles",
  STAFF_ASSIGN_TEACHERS: "staff:assign_teachers",
  STAFF_VIEW_ALL: "staff:view_all",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.ADMIN]: [
    Permission.SCHOOL_MANAGE_SETTINGS,
    Permission.SCHOOL_VIEW_SETTINGS,
    Permission.ACADEMICS_MANAGE_YEARS,
    Permission.ACADEMICS_MANAGE_CLASSES,
    Permission.ACADEMICS_MANAGE_SUBJECTS,
    Permission.ACADEMICS_MANAGE_TIMETABLE,
    Permission.ACADEMICS_VIEW,
    Permission.STUDENTS_CREATE,
    Permission.STUDENTS_UPDATE,
    Permission.STUDENTS_ARCHIVE,
    Permission.STUDENTS_VIEW_ALL,
    Permission.ATTENDANCE_MARK,
    Permission.ATTENDANCE_VIEW_ALL,
    Permission.EXAMS_MANAGE_SCHEDULE,
    Permission.EXAMS_APPROVE_RESULTS,
    Permission.EXAMS_PUBLISH_RESULTS,
    Permission.EXAMS_VIEW_ALL,
    Permission.FEES_MANAGE_STRUCTURES,
    Permission.FEES_COLLECT_OFFLINE,
    Permission.FEES_RECORD_CONCESSION,
    Permission.FEES_VIEW_REPORTS,
    Permission.FEES_VIEW_RECEIPTS,
    Permission.STAFF_MANAGE_PROFILES,
    Permission.STAFF_ASSIGN_TEACHERS,
    Permission.STAFF_VIEW_ALL,
  ],
  [Role.PRINCIPAL]: [
    Permission.SCHOOL_VIEW_SETTINGS,
    Permission.ACADEMICS_VIEW,
    Permission.ACADEMICS_MANAGE_TIMETABLE,
    Permission.STUDENTS_VIEW_ALL,
    Permission.STUDENTS_UPDATE,
    Permission.ATTENDANCE_VIEW_ALL,
    Permission.EXAMS_MANAGE_SCHEDULE,
    Permission.EXAMS_APPROVE_RESULTS,
    Permission.EXAMS_PUBLISH_RESULTS,
    Permission.EXAMS_VIEW_ALL,
    Permission.FEES_VIEW_REPORTS,
    Permission.FEES_VIEW_RECEIPTS,
    Permission.STAFF_VIEW_ALL,
    Permission.STAFF_ASSIGN_TEACHERS,
  ],
  [Role.ACCOUNTANT]: [
    Permission.FEES_MANAGE_STRUCTURES,
    Permission.FEES_COLLECT_OFFLINE,
    Permission.FEES_RECORD_CONCESSION,
    Permission.FEES_VIEW_REPORTS,
    Permission.FEES_VIEW_RECEIPTS,
    Permission.STUDENTS_VIEW_ALL,
    Permission.ACADEMICS_VIEW,
  ],
  [Role.TEACHER]: [
    Permission.ACADEMICS_VIEW,
    Permission.STUDENTS_VIEW_ASSIGNED,
    Permission.ATTENDANCE_MARK,
    Permission.ATTENDANCE_VIEW_CLASS,
    Permission.EXAMS_ENTER_MARKS,
    Permission.EXAMS_VIEW_ALL,
  ],
  [Role.PARENT]: [
    Permission.STUDENTS_VIEW_CHILD,
    Permission.ATTENDANCE_VIEW_CHILD,
    Permission.EXAMS_VIEW_CHILD,
    Permission.FEES_VIEW_CHILD_STATEMENT,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

export function getRolePermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
