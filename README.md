# 🏫 School ERP — Multi-Tenant School Management Platform

A modern, full-stack, multi-tenant School Enterprise Resource Planning (ERP) platform built with **Next.js 16**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and **NextAuth**.

---

## ✨ Core Features & Modules

### 1. 🛡️ Multi-Tenant Architecture & Data Isolation
- Strict row-level multi-tenancy enforced by Prisma Client Extensions.
- **21 Tenant-Scoped Models** verified by automated schema drift guards and isolation regression suites.
- Dedicated tenant scoping prevents cross-school data leakage across all queries, mutations, and upserts.

### 2. 👥 User Roles & Portals
- **Admin & Principal**: Full school configuration, class & section management, student admissions, faculty roster, department hierarchy, fee structures, notices, certificates, TC register, and leave approval.
- **Teacher**: Daily period timetable, syllabus milestone tracking, marks entry, attendance marking, homework & notes publishing, and personal leave applications.
- **Parent**: Multi-child switcher, class weekly timetable, subject syllabus progress, homework with attachment downloads, fee invoices, payment receipts, and attendance tracking.
- **Accountant**: Fee structures, invoice generation, fee collection, and printable receipt generation.

### 3. 🏢 Staff & Operations (Batch A)
- **Departments**: Academic & administrative department hierarchy, Head of Department (HOD) assignments, and teacher rosters.
- **Staff Leave Management**: Leave applications (CL, ML, EL, etc.), review dashboard, and 1-click approval/rejection with administrator remarks.
- **Class Designations**: Section leadership titles (*Class Monitor*, *Sports Captain*, *House Captain*, *Prefect*).
- **Assignments & Notes**: Study notes and homework publication with attachments (up to 10MB), filtered by *Upcoming* vs *Past Due*.

### 4. 📅 Academics, Timetable & Syllabus
- **Daily Period Structure**: Configurable school bell schedules with teaching periods and break/recess slots.
- **Weekly Class Timetable**: Section-based weekly matrix with period rows, day columns, and conflict-free slot assignments.
- **Syllabus Tracker**: Chapter/topic completion tracking with progress bars.

### 5. 📜 Official Certificates & TC Register
- **Certificate Templates**: Bonafide Certificates, Transfer Certificates (TC), and Character Certificates with live print/PDF generation (`html2pdf.js`).
- **TC Register**: Permanent administrative registry of all issued Transfer Certificates.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Vanilla CSS design system with CSS custom properties
- **Icons**: Lucide React
- **PDF Generation**: html2pdf.js

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database instance

### 1. Clone & Install Dependencies
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
Update `DATABASE_URL` with your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/school_erp"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration & Seeding
```bash
# Run database migrations
npx prisma migrate dev

# Seed baseline demo data (schools, users, classes, subjects, fees)
npx prisma db seed
```

### 4. Run Test Suites
```bash
# Check tenant scoping drift guard (verifies all 21 models)
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

## 🧪 Verification Commands

| Command | Purpose |
| :--- | :--- |
| `npm run check:tenant-scoping` | Verifies that all Prisma models with `schoolId` are registered in `TENANT_SCOPED_MODELS` |
| `npm run test:tenant` | Executes comprehensive isolation test suite (29/29 assertions) |
| `npm run build` | Full production build and static type verification |
