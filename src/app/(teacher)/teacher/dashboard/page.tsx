import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import {
  CheckCircle2,
  ArrowRight,
  Award,
  BookOpen,
  ClipboardList,
  CalendarClock,
  Calendar,
  School,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/login");
  }

  const db = tenantClient(session.user.schoolId);

  // Fetch teacher profile, assigned sections, and recent notices
  const [teacherProfile, sections, notices] = await Promise.all([
    db.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        department: true,
        subjects: { include: { subject: true } },
      },
    }),
    db.section.findMany({
      include: { class: true },
      orderBy: [{ class: { order: "asc" } }, { name: "asc" }],
      take: 6,
    }),
    db.notice.findMany({
      where: { audience: { has: "TEACHER" } },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const teacherName = teacherProfile?.fullName || "Faculty Member";
  const departmentName = teacherProfile?.department?.name || "Academics";

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Faculty Hub</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {teacherName}</h1>
          <p className="page-subtitle">
            {departmentName} • Manage daily class register, assessment marks, timetable, and assignments.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/teacher/attendance" className="btn btn-primary">
            <CheckCircle2 size={15} />
            <span>Mark Attendance</span>
          </Link>
          <Link href="/teacher/marks" className="btn btn-secondary">
            <Award size={15} />
            <span>Enter Exam Marks</span>
          </Link>
        </div>
      </div>

      {/* Operational Stat Cards */}
      <div className="stats-grid">
        <Link href="/teacher/attendance" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-teal">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Daily Register</span>
              <span className="stat-value" style={{ fontSize: "18px", color: "var(--role-teacher)" }}>
                Attendance
              </span>
            </div>
          </div>
        </Link>

        <Link href="/teacher/marks" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-indigo">
              <Award size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Assessments</span>
              <span className="stat-value" style={{ fontSize: "18px", color: "var(--primary)" }}>
                Marks Entry
              </span>
            </div>
          </div>
        </Link>

        <Link href="/teacher/assignments" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-amber">
              <ClipboardList size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Coursework</span>
              <span className="stat-value" style={{ fontSize: "18px", color: "var(--warning)" }}>
                Assignments
              </span>
            </div>
          </div>
        </Link>

        <Link href="/teacher/timetable" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-coral">
              <CalendarClock size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Weekly Schedule</span>
              <span className="stat-value" style={{ fontSize: "18px", color: "var(--role-parent)" }}>
                Timetable
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Active Class Sections & Teacher Announcements */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Class Sections */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Class Sections</h2>
              <p className="card-subtitle">Quick launch attendance and class rosters</p>
            </div>
            <Link
              href="/teacher/attendance"
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
              <span>Take Register</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
            {sections.map((sec) => (
              <Link
                key={sec.id}
                href={`/teacher/attendance?sectionId=${sec.id}`}
                style={{
                  textDecoration: "none",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {sec.class.name}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                    Section {sec.name} • {sec.academicYear}
                  </div>
                </div>
                <School size={16} color="var(--primary)" />
              </Link>
            ))}
          </div>
        </div>

        {/* Staff Announcements */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Staff Announcements</h2>
              <p className="card-subtitle">Important administrative circulars</p>
            </div>
            <Megaphone size={16} color="var(--primary)" />
          </div>

          {notices.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px" }}>
              <div className="empty-state-title">No new announcements</div>
              <p className="empty-state-text">Check back later for school updates and meeting circulars.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {notices.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                      lineHeight: 1.4,
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
