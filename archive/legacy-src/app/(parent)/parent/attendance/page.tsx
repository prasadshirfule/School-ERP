"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Calendar, Sparkles, AlertCircle } from "lucide-react";

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
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data: Student[]) => {
        if (Array.isArray(data)) {
          setStudents(data);
          if (!selectedStudentId && data.length > 0) {
            setSelectedStudentId(data[0].id);
          }
        }
      });
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/parent/students/${selectedStudentId}/attendance`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Metrics computation
  const totalDays = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const leaveCount = records.filter((r) => r.status === "LEAVE" || r.status === "HALF_DAY").length;
  const attendancePct = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Attendance Tracker</h1>
          <p className="page-subtitle">Detailed attendance register and overall participation statistics.</p>
        </div>
      </div>

      {students.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`btn ${selectedStudentId === s.id ? "btn-primary" : "btn-secondary"}`}
            >
              {s.fullName} ({s.section ? `${s.section.class.name}-${s.section.name}` : "Enrolled"})
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-teal">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{attendancePct}%</span>
            <span className="stat-label">Attendance Percentage</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-sky">
            <Calendar size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{presentCount}</span>
            <span className="stat-label">Days Present (Last 90 days)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-coral">
            <XCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{absentCount}</span>
            <span className="stat-label">Days Absent</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <Sparkles size={18} className="animate-spin" /> Loading attendance records...
        </div>
      ) : records.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <Calendar size={26} color="#38bdf8" />
            </div>
            <div className="empty-state-title">No Attendance Recorded</div>
            <p className="empty-state-text">
              No daily attendance records have been registered for {selectedStudent?.fullName || "your child"} yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "0" }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const dateObj = new Date(r.date);
                  const isPresent = r.status === "PRESENT";
                  const isAbsent = r.status === "ABSENT";
                  const isLate = r.status === "LATE";

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{dateObj.toLocaleDateString("en-IN", { weekday: "long" })}</td>
                      <td>
                        <span
                          className={`badge ${
                            isPresent
                              ? "badge-teal"
                              : isAbsent
                              ? "badge-rose"
                              : isLate
                              ? "badge-amber"
                              : "badge-blue"
                          }`}
                        >
                          <span className="badge-dot" />
                          <span>{r.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentAttendancePage() {
  return (
    <Suspense fallback={<div className="loading"><Sparkles size={18} className="animate-spin" /> Loading attendance...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}

