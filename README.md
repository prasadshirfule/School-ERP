# 🏫 School ERP — Multi-Tenant School Management Platform (CBSE / ICSE / State Boards)

A commercially usable, production-ready School Enterprise Resource Planning (ERP) platform built with **Next.js 16 (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM (Client Extension for Row-Level Multi-Tenancy)**, and **NextAuth**.

---

## 🏗️ Multi-Tenancy Architecture

```
                                  ┌────────────────────────┐
                                  │   Incoming HTTP Req    │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                                  ┌────────────────────────┐
                                  │  NextAuth Session Auth │
                                  │   Extracts: schoolId   │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                    ┌──────────────────────────────────────────────────┐
                    │      Tenant Client (src/lib/tenant.ts)           │
                    │   Auto-injects schoolId into query where/data    │
                    │   Blocks cross-tenant updates/upserts/deletes    │
                    └─────────────────────────┬────────────────────────┘
                                              │
                                              ▼
                                  ┌────────────────────────┐
                                  │   Prisma ORM Client    │
                                  │   PostgreSQL Database  │
                                  └────────────────────────┘
```

- **Row-Level Tenant Isolation**: Injected automatically across all operations. No query can read, mutate, or delete records belonging to another school.
- **21 Tenant-Scoped Models**:
  `User`, `Student`, `Parent`, `Class`, `Section`, `Subject`, `FeeStructure`, `FeeInvoice`, `Payment`, `Attendance`, `GradingScale`, `ExamSlot`, `ReportCard`, `Notice`, `Period`, `TimetableSlot`, `SyllabusTopic`, `CertificateLog`, `Department`, `LeaveRequest`, `Assignment`.
- **Automated Schema Drift Guard**: `npm run check:tenant-scoping` introspects Prisma DMMF to block any un-scoped tenant models in CI/CD and development.

---

## ✨ Core Features & Modules

### 1. 👥 User Roles & Role-Based Portals
- **Admin & Principal**: Full school configuration, class & section management, student admissions, cohort promotion, faculty roster, department hierarchy, fee structures, notices, certificates, TC register, and leave approval.
- **Teacher**: Daily period timetable, syllabus milestone tracking, marks entry, attendance marking, homework & notes publishing, and personal leave applications.
- **Parent**: Multi-child switcher, class weekly timetable, subject syllabus progress, homework with attachment downloads, fee invoices, payment receipts, and attendance tracking.
- **Accountant**: Fee structures, bulk invoice generation, payment collection, and printable receipt generation.

### 2. 🛡️ Security & PII Protection
- **PII Encryption at Rest**: AES-256-GCM encryption for sensitive student data (Aadhaar numbers, medical conditions) via `src/lib/security.ts`.
- **Aadhaar Masking**: Displays only last 4 digits (`XXXX-XXXX-1234`) on parent/teacher views.
- **Rate Limiting**: Sliding-window rate limiter for sensitive endpoints.
- **Zod Validation**: Strict schema validation on all incoming API requests via `src/lib/validations.ts`.

### 3. 📂 Storage Abstraction
- Unified `src/lib/storage.ts` driver supporting local disk storage during development and pluggable Cloudflare R2 / AWS S3 storage for cloud deployments.
- Supports student photos, school logos, assignment attachments (up to 10MB), and certificate assets.

### 4. 🎓 Academic Management & Year Rollover
- **Student Promotion Workflow**: Promote cohorts (e.g., Class 5-A → Class 6-A), retain students, or graduate outgoing batches while preserving past academic year records.
- **Configurable Grading Scales**: CBSE 9-point, ICSE percentage, or custom board grading per school.
- **Examinations & Report Cards**: Term-wise marks entry, automated grade calculation, and downloadable official Report Card PDF.

### 5. 💳 Fees & Invoicing Module
- Class & Academic Year linked fee structures (Tuition, Lab, Activity, Admission).
- Bulk invoice generation for classes/sections with custom due dates and discount support.
- Payment recording with auto status updates (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).
- Downloadable official PDF payment receipts.

### 6. 📅 Timetable & Attendance
- Configurable bell schedule (teaching periods + recess/lunch).
- Section weekly timetable with teacher conflict detection.
- Fast attendance marking, monthly attendance percentages, and absentee alert roster generator.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/prasadshirfule/school-erp.git
cd school-erp
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL`, `NEXTAUTH_SECRET`, and `PII_ENCRYPTION_KEY` are configured.

### 3. Database Migration & Seed
```bash
# Push schema to database
npx prisma db push

# Seed realistic demo data for 2 full Indian schools
npm run prisma:seed # or: npx prisma db seed
```

### 4. Run Test Suites
```bash
# Verify tenant scoping drift guard (all 21 models)
npm run check:tenant-scoping

# Run 29-point tenant isolation regression suite
npm run test:tenant
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Credentials (Password: `password123` for all)

| Tenant School | Role | Email |
| :--- | :--- | :--- |
| **Delhi Public Academy** (CBSE, Delhi) | Admin | `admin@dpa.edu.in` |
| | Principal | `principal@dpa.edu.in` |
| | Teacher | `ananya.sharma@dpa.edu.in` |
| | Teacher | `vikram.malhotra@dpa.edu.in` |
| | Parent | `parent.sharma@gmail.com` |
| | Parent | `parent.verma@gmail.com` |
| | Accountant | `accountant@dpa.edu.in` |
| **St. Xavier's High School** (ICSE, Mumbai) | Admin | `admin@stxaviers.edu` |
| | Teacher | `teacher.pereira@stxaviers.edu` |
| | Parent | `parent.fernandes@gmail.com` |
| | Accountant | `accountant@stxaviers.edu` |

---

## 🐳 Docker Deployment

To run the entire platform with PostgreSQL using Docker Compose:
```bash
docker-compose up --build -d
```
Access the application at [http://localhost:3000](http://localhost:3000) and health check at [http://localhost:3000/api/health](http://localhost:3000/api/health).
