import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import { Prisma, Notice } from "@prisma/client";
import {
  CheckCircle2,
  Award,
  BookOpen,
  ClipboardList,
  CalendarClock,
  Calendar,
  School,
  Megaphone,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

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
    <div className="office-page-container">
      {/* ─── Office Welcome Hero ─── */}
      <div className="welcome-hero-simple">
        <div>
          <h1 className="welcome-hero-title">
            {greeting}, {teacherName}!
          </h1>
          <p className="welcome-hero-sub">
            {departmentName} Department • Daily classroom attendance, exam marks entry, and student assignments
          </p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#ffffff", padding: "6px 14px", borderRadius: "9999px", border: "1px solid #bfdbfe", fontSize: "12.5px", color: "#1e3a8a", fontWeight: 600 }}>
          <Calendar size={13} />
          <span>Academic Session 2026-27</span>
        </div>
      </div>

      {/* ─── 3 Prominent Primary Action Cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <Link
          href="/teacher/attendance"
          style={{
            background: "#ffffff",
            border: "2px solid #a7f3d0",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(5,150,105,0.06)",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "10px",
              background: "#059669",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Take Daily Attendance</div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
              Select class, mark present/absent with 1 click, submit register
            </div>
          </div>
        </Link>

        <Link
          href="/teacher/marks"
          style={{
            background: "#ffffff",
            border: "2px solid #bfdbfe",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(30,58,138,0.06)",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "10px",
              background: "#1e3a8a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Award size={26} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Enter Exam Marks</div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
              Record scores for unit tests, midterms, and term exams
            </div>
          </div>
        </Link>

        <Link
          href="/teacher/assignments"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ClipboardList size={26} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Post Homework & Notes</div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
              Create homework assignments and study materials for students
            </div>
          </div>
        </Link>
      </div>

      {/* ─── 4 Essential Shortcuts Strip ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <Link
          href="/teacher/timetable"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "#334155",
          }}
        >
          <CalendarClock size={18} color="#1e3a8a" />
          <span style={{ fontSize: "13.5px", fontWeight: 600 }}>My Timetable</span>
        </Link>

        <Link
          href="/teacher/syllabus"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "#334155",
          }}
        >
          <BookOpen size={18} color="#059669" />
          <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Syllabus Tracker</span>
        </Link>

        <Link
          href="/teacher/leave"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "#334155",
          }}
        >
          <Calendar size={18} color="#d97706" />
          <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Apply for Leave</span>
        </Link>

        <Link
          href="/admin/notices"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "#334155",
          }}
        >
          <Megaphone size={18} color="#dc2626" />
          <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Staff Notices</span>
        </Link>
      </div>

      {/* ─── Two-Column: Class Sections & Faculty Notice Board ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Class Sections */}
        <div className="office-card">
          <div className="office-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <School size={18} color="#1e3a8a" />
              <h3 className="office-card-title">Classrooms & Sections</h3>
            </div>
            <Link
              href="/teacher/attendance"
              className="office-btn office-btn-secondary office-btn-sm"
            >
              <span>Take Attendance</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {sections.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              No classroom sections available yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(sections as TeacherDashboardSection[]).map((sec: TeacherDashboardSection) => (
                <div
                  key={sec.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        background: "#eff6ff",
                        color: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                      }}
                    >
                      {sec.class.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>
                        {sec.class.name} — Section {sec.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        Session: {sec.academicYear}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/teacher/attendance`}
                    className="office-btn office-btn-secondary office-btn-sm"
                  >
                    Mark
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Notice Board */}
        <div className="office-card">
          <div className="office-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Megaphone size={18} color="#1e3a8a" />
              <h3 className="office-card-title">Staff Circulars & Notices</h3>
            </div>
          </div>

          {notices.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              No new staff notices published.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {notices.map((n: Notice) => (
                <div
                  key={n.id}
                  style={{
                    padding: "14px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>{n.title}</div>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>{formatDate(n.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#475569", margin: "6px 0 0 0", lineHeight: 1.5 }}>
                    {n.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
