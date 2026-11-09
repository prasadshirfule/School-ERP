"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Calendar, Sparkles } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "LEAVE";
}

interface Student {
  id: string;
  fullName: string;
  admissionNo: string;
  section?: { name: string; class: { name: string } };
}

function AttendanceContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data: Student[]) => {
        if (!ignore && Array.isArray(data)) {
          setStudents(data);
          if (!selectedStudentId && data.length > 0) {
            setSelectedStudentId(data[0].id);
          }
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }
    let ignore = false;
    fetch(`/api/parent/students/${selectedStudentId}/attendance`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) {
          setRecords(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Metrics computation
  const totalDays = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const leaveCount = records.filter((r) => r.status === "LEAVE" || r.status === "HALF_DAY").length;
  const attendancePct = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : "0.0";

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Daily Attendance Tracker</h1>
          <p className="office-subtitle">
            Review detailed daily presence logs, absenteeism, and overall term participation rate
          </p>
        </div>
      </div>

      {/* Child Switcher Tabs */}
      {students.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`office-btn office-btn-sm ${selectedStudentId === s.id ? "office-btn-primary" : "office-btn-secondary"}`}
            >
              <span>{s.fullName}</span>
              <span style={{ fontSize: "11px", opacity: 0.8 }}>
                ({s.section ? `${s.section.class.name}-${s.section.name}` : "Enrolled"})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* KPI Highlights */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Attendance Rate</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>{attendancePct}%</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Days Present</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a8a" }}>{presentCount} Days</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Days Absent</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dc2626" }}>{absentCount} Days</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="office-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading attendance records...</div>
        </div>
      ) : records.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <Calendar size={36} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>No Attendance Recorded</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
            No daily register entries have been submitted for {selectedStudent?.fullName || "your child"} yet.
          </p>
        </div>
      ) : (
        <div className="office-table-wrapper">
          <table className="office-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>#</th>
                <th>Date</th>
                <th>Day of Week</th>
                <th style={{ textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const recDate = new Date(r.date);
                const dayName = recDate.toLocaleDateString("en-IN", { weekday: "long" });
                const isPresent = r.status === "PRESENT";
                const isAbsent = r.status === "ABSENT";
                const isLate = r.status === "LATE";
                const isHalf = r.status === "HALF_DAY";

                return (
                  <tr key={r.id}>
                    <td style={{ color: "#94a3b8", fontSize: "12.5px" }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: "#0f172a" }}>
                      {recDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ color: "#475569" }}>{dayName}</td>
                    <td style={{ textAlign: "right" }}>
                      {isPresent ? (
                        <span className="office-pill office-pill-green">Present</span>
                      ) : isAbsent ? (
                        <span className="office-pill office-pill-red">Absent</span>
                      ) : isLate ? (
                        <span className="office-pill office-pill-amber">Late</span>
                      ) : isHalf ? (
                        <span className="office-pill office-pill-amber">Half Day</span>
                      ) : (
                        <span className="office-pill office-pill-blue">On Leave</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ParentAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={20} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading attendance...</div>
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
