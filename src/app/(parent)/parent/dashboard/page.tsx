"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  Receipt,
  Award,
  CalendarClock,
  ClipboardList,
  Sparkles,
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

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" />
        <span>Loading student profiles...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <span>Family Portal</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Parent Dashboard</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Parent Workspace</h1>
          <p className="page-subtitle">
            Track your children's daily attendance records, exam report cards, fee dues, and homework.
          </p>
        </div>
      </div>

      {students.length === 0 ? (
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
        <>
          <div className="stats-grid">
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

          {/* Quick Shortcuts */}
          <div className="card" style={{ marginTop: "12px" }}>
            <div className="card-header">
              <h3 className="card-title">School Services & Academic Schedule</h3>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link href="/parent/timetable" className="btn btn-secondary">
                <CalendarClock size={15} />
                <span>Class Timetable</span>
              </Link>
              <Link href="/parent/assignments" className="btn btn-secondary">
                <ClipboardList size={15} />
                <span>Homework & Assignments</span>
              </Link>
              <Link href="/parent/notices" className="btn btn-secondary">
                <Sparkles size={15} />
                <span>School Circulars</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
