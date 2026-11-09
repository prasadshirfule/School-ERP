# Vidyora — Database Design & Relational Schema Specification

**Engine**: Neon Serverless PostgreSQL 18.6  
**ORM**: Prisma 6.19.3  
**Migration Baseline**: `prisma/migrations/0_init/migration.sql`  

---

## 1. Schema Overview

The Vidyora database schema consists of **37 relational models** and **15 enums**, designed for multi-tenant scalability, referential integrity, and compliance with Indian school board guidelines.

### Summary Statistics
- **Total Models**: 37
- **Tenant-Scoped Models (RLS Enabled & Forced)**: 33
- **Global / Shared Models**: 4 (`School`, `SchoolRegistrationApplication`, `User`, `SystemSetting`)
- **Enums**: 15
- **Foreign Key Constraints**: 75
- **Indexes**: Tenant-composite indexes on `(schoolId, ...)` across all high-volume tables.

---

## 2. Core Domain Models

### A. School & Institutional Platform
- `School`: Institutional master record (name, code, affiliation, board, branding).
- `SchoolRegistrationApplication`: External school onboarding application with document verification workflow.
- `AcademicYear`: Academic calendar session per school (e.g., 2026-2027) with active flags and term date boundaries.
- `SchoolMembership`: Links a User to a School with an assigned Role and status.

### B. Identity & Access Management
- `User`: Global user entity with email, phone, hashed credentials, and `sessionVersion` for immediate token revocation.
- **Allowed Roles**:
  - `ADMIN`
  - `PRINCIPAL`
  - `ACCOUNTANT`
  - `TEACHER`
  - `PARENT`
  *(Zero school-level `SUPER_ADMIN`).*

### C. Students & Admissions
- `Student`: Official student profile with per-school unique `admissionNo`, admission date, gender, DOB, address, and status (`ACTIVE`, `TRANSFERRED`, `GRADUATED`, `ARCHIVED`).
- `StudentGuardian`: Links students to authorized parent/guardian user accounts with verified relationships (`FATHER`, `MOTHER`, `GUARDIAN`).
- `StudentDocument`: Uploaded document metadata with verification status and encryption flags.
- `TransferCertificate`: Official TC generation records with sequence numbers and conduct remarks.

### D. Academics & Timetable
- `Class`: School grade level (e.g., "Class 10").
- `Section`: Division within a class (e.g., "Section A").
- `Subject`: Curriculum subjects with codes (e.g., "MATH-10").
- `ClassSubject`: Class-to-subject mappings with elective flags.
- `TeacherAssignment`: Assigns teachers to class-subject pairs and section class-teachers.
- `Period` & `TimetableSlot`: Daily schedule grid mapped to periods, weekdays, rooms, and teachers.

### E. Student Attendance (Strict Invariant)
- `StudentAttendance`:
  - Permitted Statuses: **`PRESENT`** and **`ABSENT`** only.
  - Unique Constraint: `@@unique([studentId, date, sectionId, academicYearId])` prevents duplicate attendance records.

### F. Staff & Faculty
- `TeacherProfile`: Staff employee profile, designation, qualification, and joining date.
- `StaffAttendance`: Staff check-in/check-out with statuses (`PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`).
- `StaffLeaveRequest`: Leave applications with principal approval workflows.

### G. Offline Fees & Financial Management (Strict Invariant)
- `FeeStructure`: Academic year fee schedules per class (e.g., Tuition Fee, Lab Fee).
- `FeeInstallment`: Installment breakdown with due dates.
- `FeeInvoice`: Student fee demand invoice with calculation breakdown (gross, discounts, net, paid, balance, status).
- `FeePayment`: Transaction record for offline collections.
  - Permitted Methods: **`CASH`**, **`UPI`**, **`BANK_TRANSFER`**.
  - No online checkout or gateway tables.
- `FeeReceipt`: Printable sequential receipt allocated atomically per school.
- `PaymentReversal`: Audited reversal and correction log preserving original transaction history.

### H. Examinations & Results
- `ExamType`: Institutional exam categories (Unit Test 1, Midterm, Annual Examination).
- `Examination`: Exam session linked to an academic year.
- `ExamSubject`: Subject-wise exam schedule, maximum marks, and pass marks.
- `StudentMark`: Individual student marks obtained, pass status, and remarks.
- `StudentReportCard`: Published report card summary.
- **Annual Percentage Invariant**:
  $$\text{Percentage} = \left(\frac{\sum \text{Marks Obtained}}{\sum \text{Max Marks}}\right) \times 100$$

### I. Audit & Communications
- `AuditLog`: Immutable action log capturing user, school, action, entity, IP address, and payload delta.
- `SecurityEvent`: Security incident log capturing login failures, permission violations, and rate-limit triggers.
- `Notification`: In-app notification delivery history.
