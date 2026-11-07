"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModuleTile from "@/components/ui/ModuleTile";
import {
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  Receipt,
  Award,
  CalendarClock,
  ClipboardList,
  Sparkles,
  Calendar,
  Zap,
  Users,
} from "lucide-react";

type StudentData = {
  id: string;
  fullName: string;
  admissionNo: string;
  academicYear: string;
  relationship: string;
  section?: { name: string; class: { name: string } } | null;
};

export default function ParentDashboard() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <span>Family Portal</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Parent Dashboard</span>
      </div>

      {/* Welcome Hero Banner (Template 3) */}
      <div className="welcome-banner">
        <div>
          <h1 className="welcome-title">Welcome to Family Portal</h1>
          <p className="welcome-subtitle">
            Track your children&apos;s daily attendance records, exam report cards, fee dues, and homework.
          </p>
        </div>
        <div className="welcome-badge-group">
          <div className="topbar-ay-badge">
            <Calendar size={13} />
            <span>Academic Session 2026-27</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <div className="quick-actions-title">
          <Zap size={14} color="var(--primary)" />
          <span>Quick Actions</span>
        </div>
        <div className="quick-actions-grid">
          <Link href="/parent/attendance" className="quick-action-btn quick-action-btn-primary">
            <CheckCircle2 size={15} />
            <span>Daily Attendance</span>
          </Link>
          <Link href="/parent/report-cards" className="quick-action-btn">
            <Award size={15} />
            <span>Report Cards</span>
          </Link>
          <Link href="/parent/fees" className="quick-action-btn">
            <Receipt size={15} />
            <span>Pay Fees</span>
          </Link>
          <Link href="/parent/timetable" className="quick-action-btn">
            <CalendarClock size={15} />
            <span>Class Timetable</span>
          </Link>
          <Link href="/parent/assignments" className="quick-action-btn">
            <ClipboardList size={15} />
            <span>Homework</span>
          </Link>
          <Link href="/parent/notices" className="quick-action-btn">
            <Sparkles size={15} />
            <span>School Notices</span>
          </Link>
        </div>
      </div>

      {/* Section Header: Student Services */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <Users size={18} color="var(--primary)" />
          <span>Student Services</span>
          <span className="dashboard-section-subtitle">Portal access modules</span>
        </div>
      </div>

      {/* Module Tiles Grid (Template 3) */}
      <div className="module-tile-grid">
        <ModuleTile
          title="My Children"
          description="View linked children profiles, class enrollments, and student details"
          icon="GraduationCap"
          href="/parent/students"
          colorScheme="blue"
          badge={loading ? undefined : `${students.length} Linked`}
        />

        <ModuleTile
          title="Daily Attendance"
          description="Track daily attendance marks, absences, and monthly percentage"
          icon="CheckCircle2"
          href="/parent/attendance"
          colorScheme="emerald"
        />

        <ModuleTile
          title="Report Cards"
          description="Download verified term exam report cards and subject evaluations"
          icon="Award"
          href="/parent/report-cards"
          colorScheme="purple"
        />

        <ModuleTile
          title="Fees & Invoices"
          description="View tuition fee schedules, outstanding dues, and make online payments"
          icon="Receipt"
          href="/parent/fees"
          colorScheme="amber"
        />

        <ModuleTile
          title="Class Timetable"
          description="View weekly class period schedule and subject teacher timings"
          icon="CalendarClock"
          href="/parent/timetable"
          colorScheme="indigo"
        />

        <ModuleTile
          title="Homework & Notes"
          description="Review teacher-assigned homework, project submissions, and notes"
          icon="ClipboardList"
          href="/parent/assignments"
          colorScheme="teal"
        />
      </div>

      {/* Section Header: Enrolled Children */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <GraduationCap size={18} color="var(--primary)" />
          <span>Linked Children</span>
          <span className="dashboard-section-subtitle">Student academic profiles</span>
        </div>
      </div>

      {/* Enrolled Children Content */}
      {loading ? (
        <div className="loading" style={{ padding: "32px 0" }}>
          <Sparkles size={18} className="animate-spin" />
          <span>Loading student profiles...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <HeartHandshake size={26} color="var(--primary)" />
            </div>
            <div className="empty-state-title">No children linked to your account</div>
            <p className="empty-state-text">
              No student profiles are currently linked to this email address. Please reach out to your school administrative office for linkage.
            </p>
          </div>
        </div>
      ) : (
        <div className="dashboard-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {students.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="stat-icon-wrap stat-icon-coral">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {s.fullName}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {s.admissionNo} • Session {s.academicYear}
                    </div>
                  </div>
                </div>
                <span className="badge badge-teal">
                  <span className="badge-dot" />
                  <span>{s.relationship}</span>
                </span>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-muted)",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Class: {s.section ? `${s.section.class.name} — Section ${s.section.name}` : "Unassigned"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", paddingTop: "6px" }}>
                <Link
                  href={`/parent/students/${s.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "center" }}
                >
                  <span>Full Profile</span>
                </Link>
                <Link
                  href="/parent/attendance"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "center" }}
                >
                  <CheckCircle2 size={13} color="var(--role-teacher)" />
                  <span>Attendance</span>
                </Link>
                <Link
                  href="/parent/fees"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "center" }}
                >
                  <Receipt size={13} color="var(--role-accountant)" />
                  <span>Fees & Dues</span>
                </Link>
                <Link
                  href="/parent/report-cards"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "center" }}
                >
                  <Award size={13} color="var(--primary)" />
                  <span>Report Cards</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
