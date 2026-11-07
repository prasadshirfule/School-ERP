import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import { Prisma, Notice } from "@prisma/client";
import ModuleTile from "@/components/ui/ModuleTile";
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
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type TeacherDashboardSection = Prisma.SectionGetPayload<{
  include: { class: true };
}>;

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

  const teacherName = teacherProfile?.fullName || session.user.name || "Faculty Member";
  const departmentName = teacherProfile?.department?.name || "Academics";

  const currentHour = new Date().getHours();
  let greeting = "Good Morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good Afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good Evening";
  }

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Faculty Hub</span>
      </div>

      {/* Welcome Hero Banner (Template 3) */}
      <div className="welcome-banner">
        <div>
          <h1 className="welcome-title">
            {greeting}, {teacherName}!
          </h1>
          <p className="welcome-subtitle">
            {departmentName} • Manage daily class register, assessment marks, timetable, and assignments.
          </p>
        </div>
        <div className="welcome-badge-group">
          <div className="topbar-ay-badge">
            <Calendar size={13} />
            <span>Academic Session 2026-27</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="dashboard-stats-grid">
        <Link href="/teacher/attendance" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Daily Register</span>
            <div className="module-tile-icon-wrap module-tile-icon-emerald" style={{ width: "34px", height: "34px" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value" style={{ fontSize: "20px", color: "var(--role-teacher)" }}>
            Attendance
          </div>
          <div className="stat-card-simple-sub">Submit today&apos;s student attendance</div>
        </Link>

        <Link href="/teacher/marks" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Assessments</span>
            <div className="module-tile-icon-wrap module-tile-icon-purple" style={{ width: "34px", height: "34px" }}>
              <Award size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value" style={{ fontSize: "20px", color: "var(--primary)" }}>
            Marks Entry
          </div>
          <div className="stat-card-simple-sub">Unit tests and term grade evaluation</div>
        </Link>

        <Link href="/teacher/assignments" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Coursework</span>
            <div className="module-tile-icon-wrap module-tile-icon-amber" style={{ width: "34px", height: "34px" }}>
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value" style={{ fontSize: "20px", color: "var(--warning)" }}>
            Assignments
          </div>
          <div className="stat-card-simple-sub">Post homework and study materials</div>
        </Link>

        <Link href="/teacher/timetable" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Weekly Schedule</span>
            <div className="module-tile-icon-wrap module-tile-icon-indigo" style={{ width: "34px", height: "34px" }}>
              <CalendarClock size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value" style={{ fontSize: "20px", color: "var(--role-parent)" }}>
            Timetable
          </div>
          <div className="stat-card-simple-sub">Assigned periods and class hours</div>
        </Link>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <div className="quick-actions-title">
          <Zap size={14} color="var(--primary)" />
          <span>Quick Actions</span>
        </div>
        <div className="quick-actions-grid">
          <Link href="/teacher/attendance" className="quick-action-btn quick-action-btn-primary">
            <CheckCircle2 size={15} />
            <span>Mark Attendance</span>
          </Link>
          <Link href="/teacher/marks" className="quick-action-btn">
            <Award size={15} />
            <span>Enter Exam Marks</span>
          </Link>
          <Link href="/teacher/assignments" className="quick-action-btn">
            <ClipboardList size={15} />
            <span>New Assignment</span>
          </Link>
          <Link href="/teacher/timetable" className="quick-action-btn">
            <CalendarClock size={15} />
            <span>My Timetable</span>
          </Link>
          <Link href="/teacher/syllabus" className="quick-action-btn">
            <BookOpen size={15} />
            <span>Syllabus Progress</span>
          </Link>
          <Link href="/teacher/leave" className="quick-action-btn">
            <Calendar size={15} />
            <span>Apply Leave</span>
          </Link>
        </div>
      </div>

      {/* Section Header: Teaching Modules */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <School size={18} color="var(--primary)" />
          <span>Faculty Modules</span>
          <span className="dashboard-section-subtitle">Click any module to open</span>
        </div>
      </div>

      {/* 6 Primary Module Tiles (Template 3) */}
      <div className="module-tile-grid">
        <ModuleTile
          title="Daily Attendance"
          description="Take student attendance register and view monthly attendance trends"
          icon="CheckCircle2"
          href="/teacher/attendance"
          colorScheme="emerald"
        />

        <ModuleTile
          title="Marks Entry"
          description="Record student scores for unit tests, exams, and generate report cards"
          icon="Award"
          href="/teacher/marks"
          colorScheme="purple"
        />

        <ModuleTile
          title="Assignments & Tasks"
          description="Create homework, publish project notes, and upload PDF attachments"
          icon="ClipboardList"
          href="/teacher/assignments"
          colorScheme="amber"
        />

        <ModuleTile
          title="My Timetable"
          description="View your weekly teaching schedule, allocated classrooms and bell periods"
          icon="CalendarClock"
          href="/teacher/timetable"
          colorScheme="indigo"
        />

        <ModuleTile
          title="Syllabus Progress"
          description="Track subject curriculum completion and plan upcoming chapters"
          icon="BookOpen"
          href="/teacher/syllabus"
          colorScheme="blue"
        />

        <ModuleTile
          title="Leave Application"
          description="Submit leave requests to principal and track approval status"
          icon="Calendar"
          href="/teacher/leave"
          colorScheme="rose"
        />
      </div>

      {/* Section Header: Activity & Class Sections */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <School size={18} color="var(--primary)" />
          <span>Class Sections & Circulars</span>
          <span className="dashboard-section-subtitle">Assigned classrooms and notices</span>
        </div>
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
            {(sections as TeacherDashboardSection[]).map((sec: TeacherDashboardSection) => (
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
              {(notices as Notice[]).map((n: Notice) => (
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
