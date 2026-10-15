import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import {
  GraduationCap,
  School,
  Layers,
  Users,
  ArrowRight,
  UserPlus,
  Receipt,
  Megaphone,
  CreditCard,
  FileCheck,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/login");
  }

  const db = tenantClient(session.user.schoolId);

  // Parallel database queries for real operational statistics
  const [
    studentCount,
    classCount,
    sectionCount,
    teacherCount,
    unpaidInvoiceCount,
    paidInvoiceCount,
    recentStudents,
    recentNotices,
  ] = await Promise.all([
    db.student.count({ where: { isActive: true } }),
    db.class.count(),
    db.section.count(),
    db.user.count({ where: { role: "TEACHER", isActive: true } }),
    db.feeInvoice.count({ where: { status: { in: ["UNPAID", "OVERDUE"] } } }),
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
  ]);

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Admin Overview</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">School Operations Overview</h1>
          <p className="page-subtitle">
            Welcome back! Monitor student admissions, staff presence, fee status, and announcements.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/admin/students/new" className="btn btn-primary">
            <UserPlus size={15} />
            <span>New Admission</span>
          </Link>
          <Link href="/admin/notices" className="btn btn-secondary">
            <Megaphone size={15} />
            <span>Post Notice</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="stats-grid">
        <Link href="/admin/students" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-indigo">
              <GraduationCap size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Enrolled Students</span>
              <span className="stat-value">{studentCount}</span>
            </div>
          </div>
        </Link>

        <Link href="/admin/classes" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-teal">
              <School size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Active Classes</span>
              <span className="stat-value">{classCount}</span>
            </div>
          </div>
        </Link>

        <Link href="/admin/classes" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-amber">
              <Layers size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Class Sections</span>
              <span className="stat-value">{sectionCount}</span>
            </div>
          </div>
        </Link>

        <Link href="/admin/teachers" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-coral">
              <Users size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Faculty Staff</span>
              <span className="stat-value">{teacherCount}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Financial & Compliance Quick Tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
              Fee Collection Status
            </span>
            <Receipt size={17} color="var(--primary)" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--danger-text)" }}>
                {unpaidInvoiceCount}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Unpaid / Due Invoices</div>
            </div>
            <div style={{ width: "1px", height: "32px", background: "var(--border-color)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--success-text)" }}>
                {paidInvoiceCount}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Settled Invoices</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
              Academic Operations
            </span>
            <CalendarClock size={17} color="var(--role-teacher)" />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <Link href="/admin/timetable" className="btn btn-secondary btn-sm">
              <CalendarClock size={13} />
              <span>Timetables</span>
            </Link>
            <Link href="/admin/id-cards" className="btn btn-secondary btn-sm">
              <CreditCard size={13} />
              <span>ID Card Studio</span>
            </Link>
            <Link href="/admin/certificates" className="btn btn-secondary btn-sm">
              <FileCheck size={13} />
              <span>TC Certificates</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Admissions & Recent Announcements */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Recent Admissions */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Admissions</h2>
              <p className="card-subtitle">Latest enrolled students</p>
            </div>
            <Link
              href="/admin/students"
              style={{
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--primary)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px" }}>
              <div className="empty-state-title">No student records yet</div>
              <p className="empty-state-text">Admit students to populate your institutional roster.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentStudents.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-pill)",
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      {s.fullName.slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {s.fullName}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        {s.admissionNo} • {s.section ? `${s.section.class.name}-${s.section.name}` : "Unassigned"}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Announcements */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">School Announcements</h2>
              <p className="card-subtitle">Official circulars and notices</p>
            </div>
            <Link
              href="/admin/notices"
              style={{
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--primary)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Manage Notices</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentNotices.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px" }}>
              <div className="empty-state-title">No notices published</div>
              <p className="empty-state-text">Publish school notices to keep teachers and parents informed.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentNotices.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {n.title}
                    </div>
                    <span className="badge badge-info" style={{ fontSize: "10.5px" }}>
                      {n.audience.join(", ")}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                      lineHeight: 1.4,
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
