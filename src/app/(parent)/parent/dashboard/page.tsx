"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Users,
  ChevronRight,
  ArrowRight,
  School,
} from "lucide-react";

type StudentData = {
  id: string;
  fullName: string;
  admissionNo: string;
  academicYear: string;
  relationship: string;
  schoolId?: string;
  schoolName?: string;
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
    <div className="office-page-container">
      {/* ─── Office Welcome Hero ─── */}
      <div className="welcome-hero-simple">
        <div>
          <h1 className="welcome-hero-title">Welcome to Family Portal</h1>
          <p className="welcome-hero-sub">
            Track your children&apos;s daily attendance records, exam report cards, homework, and fee payments
          </p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#ffffff", padding: "6px 14px", borderRadius: "9999px", border: "1px solid #bfdbfe", fontSize: "12.5px", color: "#1e3a8a", fontWeight: 600 }}>
          <Calendar size={13} />
          <span>Academic Session 2026-27</span>
        </div>
      </div>

      {/* ─── 4 Primary Action Cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <Link
          href="/parent/attendance"
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
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Daily Attendance</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Monthly calendar & presence records
            </div>
          </div>
        </Link>

        <Link
          href="/parent/report-cards"
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
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Report Cards & Marks</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Exam scores & printable report cards
            </div>
          </div>
        </Link>

        <Link
          href="/parent/fees"
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
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "#fffbeb",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Receipt size={24} />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Pay School Fees</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Pending dues & receipt downloads
            </div>
          </div>
        </Link>

        <Link
          href="/parent/assignments"
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
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "#f8fafc",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ClipboardList size={24} />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Homework & Notes</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Teacher assignments & timetable
            </div>
          </div>
        </Link>
      </div>

      {/* ─── Enrolled Children Cards ─── */}
      <div className="office-card">
        <div className="office-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <GraduationCap size={20} color="#1e3a8a" />
            <h3 className="office-card-title">Enrolled Children ({students.length})</h3>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <Sparkles size={20} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
            <span style={{ fontSize: "13.5px", color: "#64748b" }}>Loading linked child profiles...</span>
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <HeartHandshake size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
            <div style={{ fontWeight: 600, color: "#0f172a" }}>No student profiles linked yet</div>
            <p style={{ fontSize: "13px", margin: "4px 0 0" }}>
              Please contact the school office to link your children&apos;s admission records to your email.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {students.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: "#eff6ff",
                        color: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {s.fullName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                        {s.fullName}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Adm. No: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{s.admissionNo}</span>
                      </div>
                      {s.schoolName && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            color: "var(--brand-primary)",
                            backgroundColor: "#eff6ff",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            marginTop: "5px",
                          }}
                        >
                          <School size={12} />
                          <span>{s.schoolName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="office-pill office-pill-blue">
                    {s.relationship || "Student"}
                  </span>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Class & Section:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {s.section ? `${s.section.class.name} — Section ${s.section.name}` : "Unassigned"}
                  </strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <Link
                    href={`/parent/attendance?studentId=${s.id}`}
                    className="office-btn office-btn-secondary office-btn-sm"
                    style={{ justifyContent: "center" }}
                  >
                    <CheckCircle2 size={13} color="#059669" />
                    <span>Attendance</span>
                  </Link>
                  <Link
                    href={`/parent/report-cards?studentId=${s.id}`}
                    className="office-btn office-btn-secondary office-btn-sm"
                    style={{ justifyContent: "center" }}
                  >
                    <Award size={13} color="#1e3a8a" />
                    <span>Report Card</span>
                  </Link>
                  <Link
                    href={`/parent/fees?studentId=${s.id}`}
                    className="office-btn office-btn-secondary office-btn-sm"
                    style={{ justifyContent: "center" }}
                  >
                    <Receipt size={13} color="#d97706" />
                    <span>Fees & Dues</span>
                  </Link>
                  <Link
                    href={`/parent/students/${s.id}`}
                    className="office-btn office-btn-secondary office-btn-sm"
                    style={{ justifyContent: "center" }}
                  >
                    <span>Full Profile</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
