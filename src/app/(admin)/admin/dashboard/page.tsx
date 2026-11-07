import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import { Prisma, Payment, Notice } from "@prisma/client";
import {
  GraduationCap,
  School,
  Users,
  UserPlus,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  BookOpen,
  UserCheck,
  CreditCard,
  Building2,
  Megaphone,
  CalendarClock,
  FileCheck,
  Send,
  Bell,
  Settings,
  ArrowRight,
  ChevronRight,
  PlusCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type AdminRecentStudent = Prisma.StudentGetPayload<{
  include: { section: { include: { class: true } } };
}>;

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/login");
  }

  const db = tenantClient(session.user.schoolId);

  // Time boundaries for today's attendance calculation
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Parallel database queries for real operational statistics
  const [
    studentCount,
    classCount,
    teacherCount,
    unpaidInvoiceCount,
    paidInvoiceCount,
    recentStudents,
    recentNotices,
    todayPresent,
    todayTotal,
    pendingInvoices,
  ] = await Promise.all([
    db.student.count({ where: { isActive: true } }),
    db.class.count(),
    db.user.count({ where: { role: "TEACHER", isActive: true } }),
    db.feeInvoice.count({ where: { status: { in: ["UNPAID", "OVERDUE", "PARTIALLY_PAID"] } } }),
    db.feeInvoice.count({ where: { status: "PAID" } }),
    db.student.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { id: "desc" },
      include: { section: { include: { class: true } } },
    }),
    db.notice.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    db.attendance.count({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: "PRESENT",
      },
    }),
    db.attendance.count({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
    }),
    db.feeInvoice.findMany({
      where: { status: { in: ["UNPAID", "OVERDUE", "PARTIALLY_PAID"] } },
      include: { payments: true },
    }),
  ]);

  // Real attendance rate computation
  const attendanceRate =
    todayTotal > 0 ? `${Math.round((todayPresent / todayTotal) * 100)}%` : "Not Marked";

  // Real pending fee total computation
  let pendingFeeTotal = 0;
  for (const inv of pendingInvoices) {
    const paid = inv.payments.reduce((acc: number, p: Payment) => acc + Number(p.amount), 0);
    pendingFeeTotal += Math.max(0, Number(inv.amountDue) - paid);
  }
  const formattedPendingFee = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(pendingFeeTotal);

  // Greeting logic based on current hour
  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good evening";
  }

  const displayName = session.user.name || session.user.email?.split("@")[0] || "Administrator";
  const schoolName = session.user.schoolName || "Institutional School";

  // Formatted date string for non-technical clarity
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Admin Overview</span>
      </div>

      {/* Clean Welcome Header (Minimal, Calm Office Aesthetic) */}
      <div className="welcome-hero-simple">
        <div>
          <h1 className="welcome-hero-simple-title">
            {greeting}, {displayName}!
          </h1>
          <p className="welcome-hero-simple-subtitle">
            {schoolName} • {todayFormatted}
          </p>
        </div>
        <div className="welcome-hero-simple-badge">
          <Calendar size={13} />
          <span>Academic Session 2026-27</span>
        </div>
      </div>

      {/* ─── PRIMARY ACTIONS (Large Prominent Action Hub) ─── */}
      <div className="office-section-heading" style={{ marginTop: 0 }}>
        <h2 className="office-section-heading-title">
          <span>Primary Actions</span>
          <span className="office-section-heading-sub">• Frequently used school tasks</span>
        </h2>
      </div>

      <div className="primary-actions-grid">
        {/* 1. Add Student */}
        <Link
          href="/admin/students/new"
          className="primary-action-card primary-action-card-featured"
        >
          <div className="primary-action-icon-wrap primary-action-icon-wrap-navy">
            <UserPlus size={22} />
          </div>
          <div className="primary-action-content">
            <h3 className="primary-action-title">Add Student</h3>
            <p className="primary-action-sub">Register new student admission</p>
          </div>
          <div className="primary-action-arrow">
            <ArrowRight size={17} />
          </div>
        </Link>

        {/* 2. View Students */}
        <Link href="/admin/students" className="primary-action-card">
          <div className="primary-action-icon-wrap primary-action-icon-wrap-teal">
            <Users size={22} />
          </div>
          <div className="primary-action-content">
            <h3 className="primary-action-title">View Students</h3>
            <p className="primary-action-sub">Browse student directory & profiles</p>
          </div>
          <div className="primary-action-arrow">
            <ArrowRight size={17} />
          </div>
        </Link>

        {/* 3. Take Attendance */}
        <Link href="/admin/attendance" className="primary-action-card">
          <div className="primary-action-icon-wrap primary-action-icon-wrap-emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="primary-action-content">
            <h3 className="primary-action-title">Take Attendance</h3>
            <p className="primary-action-sub">Mark today&apos;s class registers</p>
          </div>
          <div className="primary-action-arrow">
            <ArrowRight size={17} />
          </div>
        </Link>

        {/* 4. Collect Fees */}
        <Link href="/accountant/invoices" className="primary-action-card">
          <div className="primary-action-icon-wrap primary-action-icon-wrap-amber">
            <Receipt size={22} />
          </div>
          <div className="primary-action-content">
            <h3 className="primary-action-title">Collect Fees</h3>
            <p className="primary-action-sub">Search student & record payments</p>
          </div>
          <div className="primary-action-arrow">
            <ArrowRight size={17} />
          </div>
        </Link>

        {/* 5. Add Teacher */}
        <Link href="/admin/teachers/new" className="primary-action-card">
          <div className="primary-action-icon-wrap primary-action-icon-wrap-indigo">
            <GraduationCap size={22} />
          </div>
          <div className="primary-action-content">
            <h3 className="primary-action-title">Add Teacher</h3>
            <p className="primary-action-sub">Staff directory & onboarding</p>
          </div>
          <div className="primary-action-arrow">
            <ArrowRight size={17} />
          </div>
        </Link>

        {/* 6. View Reports */}
        <Link href="/admin/reports" className="primary-action-card">
          <div className="primary-action-icon-wrap primary-action-icon-wrap-purple">
            <FileSpreadsheet size={22} />
          </div>
          <div className="primary-action-content">
            <h3 className="primary-action-title">View Reports</h3>
            <p className="primary-action-sub">Attendance, fees & TC certificates</p>
          </div>
          <div className="primary-action-arrow">
            <ArrowRight size={17} />
          </div>
        </Link>
      </div>

      {/* ─── ESSENTIAL SCHOOL STATISTICS (Compact Strip below actions) ─── */}
      <div className="office-section-heading">
        <h2 className="office-section-heading-title">
          <span>School Overview</span>
          <span className="office-section-heading-sub">• Today&apos;s key operational numbers</span>
        </h2>
      </div>

      <div className="essential-metrics-strip">
        <Link href="/admin/students" className="essential-metric-box">
          <div className="essential-metric-header">
            <span className="essential-metric-label">Enrolled Students</span>
            <Users size={16} className="essential-metric-icon" />
          </div>
          <div className="essential-metric-value">{studentCount}</div>
          <p className="essential-metric-note">Active student roster</p>
        </Link>

        <Link href="/admin/teachers" className="essential-metric-box">
          <div className="essential-metric-header">
            <span className="essential-metric-label">Faculty Staff</span>
            <GraduationCap size={16} className="essential-metric-icon" />
          </div>
          <div className="essential-metric-value">{teacherCount}</div>
          <p className="essential-metric-note">Teaching employees</p>
        </Link>

        <Link href="/admin/classes" className="essential-metric-box">
          <div className="essential-metric-header">
            <span className="essential-metric-label">Today&apos;s Attendance</span>
            <CheckCircle2 size={16} className="essential-metric-icon" />
          </div>
          <div className="essential-metric-value">{attendanceRate}</div>
          <p className="essential-metric-note">
            {todayTotal > 0 ? `${todayPresent} of ${todayTotal} present` : "No classes marked yet"}
          </p>
        </Link>

        <Link href="/accountant/invoices" className="essential-metric-box">
          <div className="essential-metric-header">
            <span className="essential-metric-label">Pending Fees</span>
            <Receipt size={16} className="essential-metric-icon" />
          </div>
          <div className="essential-metric-value">{formattedPendingFee}</div>
          <p className="essential-metric-note">{unpaidInvoiceCount} unpaid / overdue invoices</p>
        </Link>
      </div>

      {/* ─── ORGANIZED SCHOOL MODULES (Clean Grouped Sections) ─── */}
      <div className="office-section-heading">
        <h2 className="office-section-heading-title">
          <span>School Modules</span>
          <span className="office-section-heading-sub">• Organized administrative office functions</span>
        </h2>
      </div>

      <div className="office-modules-grid">
        {/* Section 1: Students */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <Users size={17} />
            </div>
            <h3 className="office-module-title">Students</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/admin/students" className="office-module-link">
                <span>Student Directory</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/students/new" className="office-module-link">
                <span>New Admission</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/id-cards" className="office-module-link">
                <span>Print Student ID Cards</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/promotion" className="office-module-link">
                <span>Student Promotion</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Section 2: Staff */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <GraduationCap size={17} />
            </div>
            <h3 className="office-module-title">Staff</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/admin/teachers" className="office-module-link">
                <span>Teachers Directory</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/teachers/new" className="office-module-link">
                <span>Add New Teacher</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/leave" className="office-module-link">
                <span>Staff Leave Requests</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/departments" className="office-module-link">
                <span>Academic Departments</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Section 3: Classes */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <School size={17} />
            </div>
            <h3 className="office-module-title">Classes</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/admin/classes" className="office-module-link">
                <span>Classes &amp; Sections</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/attendance" className="office-module-link">
                <span>Take Class Attendance</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/syllabus" className="office-module-link">
                <span>Syllabus Tracker</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Section 4: Fees */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <Receipt size={17} />
            </div>
            <h3 className="office-module-title">Fees</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/accountant/invoices" className="office-module-link">
                <span>Fee Invoices &amp; Dues</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/accountant/payments" className="office-module-link">
                <span>Payment Receipts</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/alerts" className="office-module-link">
                <span>Fee Dues Reminders</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Section 5: Timetable */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <CalendarClock size={17} />
            </div>
            <h3 className="office-module-title">Timetable</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/admin/timetable" className="office-module-link">
                <span>Weekly Timetable Schedule</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Section 6: Notices */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <Megaphone size={17} />
            </div>
            <h3 className="office-module-title">Notices</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/admin/notices" className="office-module-link">
                <span>School Notice Board</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/communications" className="office-module-link">
                <span>Broadcast Announcements</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Section 7: Reports */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <FileSpreadsheet size={17} />
            </div>
            <h3 className="office-module-title">Reports</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/admin/reports" className="office-module-link">
                <span>School Reports Hub</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
            <li>
              <Link href="/admin/certificates" className="office-module-link">
                <span>Transfer Certificates (TC)</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Section 8: Settings */}
        <div className="office-module-card">
          <div className="office-module-header">
            <div className="office-module-header-icon">
              <Settings size={17} />
            </div>
            <h3 className="office-module-title">Settings</h3>
          </div>
          <ul className="office-module-links">
            <li>
              <Link href="/admin/settings" className="office-module-link">
                <span>School Profile &amp; Setup</span>
                <ChevronRight size={13} className="office-module-link-arrow" />
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* ─── RECENT ACTIVITY (Admissions & Notices) ─── */}
      <div className="office-section-heading">
        <h2 className="office-section-heading-title">
          <span>Recent Activity</span>
          <span className="office-section-heading-sub">• Latest student admissions &amp; circulars</span>
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Recent Admissions Card */}
        <div className="card" style={{ padding: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Recent Admissions
            </h3>
            <Link
              href="/admin/students"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "16px 0" }}>
              No students enrolled yet. Click &ldquo;Add Student&rdquo; above to register.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentStudents.map((s: AdminRecentStudent) => (
                <Link
                  key={s.id}
                  href={`/admin/students/${s.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "var(--bg-muted)",
                    textDecoration: "none",
                    transition: "background 0.12s ease",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {s.fullName}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                      Adm: {s.admissionNo} • {s.section?.class?.name || "Unassigned"} ({s.section?.name || "-"})
                    </div>
                  </div>
                  <ChevronRight size={14} color="#94a3b8" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Latest Notices Card */}
        <div className="card" style={{ padding: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Notice Board
            </h3>
            <Link
              href="/admin/notices"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {recentNotices.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "16px 0" }}>
              No notices published yet. Post school circulars to notify teachers and parents.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentNotices.map((n: Notice) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {n.title}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: "10px" }}>
                      {n.audience.join(", ")}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
