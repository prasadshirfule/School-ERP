"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  AlertCircle,
  Sparkles,
  Check,
  X,
  Clock,
  ArrowLeft,
  Users,
  Save,
} from "lucide-react";

type SectionOption = { id: string; name: string; class: { name: string } };
type StudentData = { id: string; fullName: string; admissionNo: string };

const STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "LEAVE"] as const;
const STATUS_COLORS: Record<string, string> = {
  PRESENT: "badge-success",
  ABSENT: "badge-danger",
  LATE: "badge-warning",
  HALF_DAY: "badge-warning",
  LEAVE: "badge-info",
};

export default function AdminAttendancePage() {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSections(data);
          if (data.length > 0) setSectionId(data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load sections", err));
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    setLoading(true);
    setMessage("");
    setError("");

    Promise.all([
      fetch(`/api/students?sectionId=${sectionId}`).then((r) => r.json()),
      fetch(`/api/attendance?sectionId=${sectionId}&date=${date}`).then((r) => r.json()),
    ])
      .then(([studentsData, attendanceData]) => {
        const studentList = Array.isArray(studentsData) ? studentsData : [];
        setStudents(studentList);

        const att: Record<string, string> = {};
        const ex = new Set<string>();
        if (Array.isArray(attendanceData)) {
          for (const rec of attendanceData) {
            att[rec.studentId] = rec.status;
            ex.add(rec.studentId);
          }
        }
        for (const s of studentList) {
          if (!att[s.id]) att[s.id] = "PRESENT";
        }
        setAttendance(att);
        setExisting(ex);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load attendance", err);
        setError("Failed to load attendance data for selected section");
        setLoading(false);
      });
  }, [sectionId, date]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    const records = Object.entries(attendance).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, date, records }),
      });

      if (res.ok) {
        setMessage(`Attendance saved successfully for ${records.length} students!`);
        const updatedExisting = new Set<string>();
        for (const r of records) updatedExisting.add(r.studentId);
        setExisting(updatedExisting);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save attendance");
      }
    } catch {
      setError("Network error while saving attendance");
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: string) => {
    const updated: Record<string, string> = {};
    for (const s of students) {
      updated[s.id] = status;
    }
    setAttendance(updated);
  };

  const presentCount = Object.values(attendance).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(attendance).filter((s) => s === "ABSENT").length;
  const otherCount = students.length - presentCount - absentCount;

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <Link href="/admin/dashboard">Admin</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Take Attendance</span>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">Take Class Attendance</h1>
          <p className="page-subtitle">
            Select a class section and date to mark daily student presence records.
          </p>
        </div>
        <Link href="/admin/dashboard" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Notification Alerts */}
      {message && (
        <div className="alert alert-success" style={{ marginBottom: "20px" }}>
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Controls Card */}
      <div className="card" style={{ marginBottom: "20px", padding: "18px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            alignItems: "flex-end",
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Select Class &amp; Section <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <select
              className="form-input"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              {sections.length === 0 ? (
                <option value="">No sections available</option>
              ) : (
                sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.class.name} - Section {sec.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Attendance Date <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => markAll("PRESENT")}
              disabled={loading || students.length === 0}
            >
              Mark All Present
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => markAll("ABSENT")}
              disabled={loading || students.length === 0}
            >
              Mark All Absent
            </button>
          </div>
        </div>
      </div>

      {/* Roster & Attendance Table */}
      {loading ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <Sparkles size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Loading student roster...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <Users size={32} style={{ color: "#94a3b8", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
            No Students Enrolled
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
            There are no active students in the selected class section.
          </p>
          <Link href="/admin/students/new" className="btn btn-primary btn-sm">
            + Enroll Student
          </Link>
        </div>
      ) : (
        <div className="card">
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                Total: {students.length}
              </span>
              <span className="badge badge-success" style={{ fontSize: "11px" }}>
                Present: {presentCount}
              </span>
              <span className="badge badge-danger" style={{ fontSize: "11px" }}>
                Absent: {absentCount}
              </span>
              {otherCount > 0 && (
                <span className="badge badge-warning" style={{ fontSize: "11px" }}>
                  Other: {otherCount}
                </span>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: "8px 18px" }}
            >
              <Save size={16} />
              <span>{saving ? "Saving..." : "Save Attendance"}</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>#</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th style={{ width: "380px" }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const currentStatus = attendance[student.id] || "PRESENT";
                  return (
                    <tr key={student.id}>
                      <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{student.admissionNo}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {student.fullName}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {STATUSES.map((status) => {
                            const isSelected = currentStatus === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  setAttendance((prev) => ({ ...prev, [student.id]: status }))
                                }
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "11.5px",
                                  fontWeight: isSelected ? 700 : 500,
                                  borderRadius: "6px",
                                  border: isSelected
                                    ? "1.5px solid var(--primary)"
                                    : "1px solid var(--border-color)",
                                  background: isSelected ? "var(--primary-light)" : "var(--bg-surface)",
                                  color: isSelected ? "var(--primary)" : "var(--text-secondary)",
                                  cursor: "pointer",
                                  transition: "all 0.12s ease",
                                }}
                              >
                                {status === "PRESENT"
                                  ? "Present"
                                  : status === "ABSENT"
                                  ? "Absent"
                                  : status === "LATE"
                                  ? "Late"
                                  : status === "HALF_DAY"
                                  ? "Half Day"
                                  : "Leave"}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: "10px 22px" }}
            >
              <Save size={16} />
              <span>{saving ? "Saving..." : "Save Attendance"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
