"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  X,
  Save,
} from "lucide-react";

type SectionOption = { id: string; name: string; class: { name: string } };
type StudentData = { id: string; fullName: string; admissionNo: string };

const STATUSES = [
  { key: "PRESENT", label: "Present", color: "green" },
  { key: "ABSENT", label: "Absent", color: "red" },
  { key: "LATE", label: "Late", color: "amber" },
  { key: "HALF_DAY", label: "Half Day", color: "amber" },
  { key: "LEAVE", label: "On Leave", color: "blue" },
];

export default function AttendancePage() {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/sections").then((r) => r.json()).then((data) => {
      if (!ignore && Array.isArray(data)) {
        setSections(data);
        if (data.length > 0 && !sectionId) {
          setSectionId(data[0].id);
        }
      }
    });
    return () => {
      ignore = true;
    };
  }, [sectionId]);

  useEffect(() => {
    if (!sectionId) return;
    let ignore = false;

    Promise.all([
      fetch(`/api/students?sectionId=${sectionId}`).then((r) => r.json()),
      fetch(`/api/attendance?sectionId=${sectionId}&date=${date}`).then((r) => r.json()),
    ]).then(([studentsData, attendanceData]) => {
      if (ignore) return;
      const validStudents = Array.isArray(studentsData) ? studentsData : [];
      setStudents(validStudents);

      const att: Record<string, string> = {};
      const ex = new Set<string>();
      if (Array.isArray(attendanceData)) {
        for (const rec of attendanceData) {
          att[rec.studentId] = rec.status;
          ex.add(rec.studentId);
        }
      }
      for (const s of validStudents) {
        if (!att[s.id]) att[s.id] = "PRESENT";
      }
      setAttendance(att);
      setExisting(ex);
      setLoading(false);
    }).catch(() => {
      if (!ignore) setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [sectionId, date]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setIsError(false);

    const records = students.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] || "PRESENT",
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, date, records }),
      });

      const data = await res.json();
      setSaving(false);

      if (res.ok) {
        setMessage(data.message || `Attendance saved successfully for ${records.length} students.`);
        setIsError(false);
        setExisting(new Set(students.map((s) => s.id)));
      } else {
        setMessage(data.error || "Failed to save attendance");
        setIsError(true);
      }
    } catch (err: unknown) {
      setSaving(false);
      setMessage(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsError(true);
    }
  };

  const markAll = (status: string) => {
    const updated: Record<string, string> = {};
    for (const s of students) {
      updated[s.id] = status;
    }
    setAttendance(updated);
  };

  const setStudentStatus = (studentId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  // Count summaries
  const presentCount = students.filter((s) => (attendance[s.id] || "PRESENT") === "PRESENT").length;
  const absentCount = students.filter((s) => (attendance[s.id] || "PRESENT") === "ABSENT").length;

  return (
    <div className="office-page-container">
      {/* ─── Page Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Daily Attendance Register</h1>
          <p className="office-subtitle">
            Select classroom section, set attendance date, and mark student status with 1-click controls
          </p>
        </div>
      </div>

      {/* ─── Classroom & Date Selector Card ─── */}
      <div className="office-card" style={{ marginBottom: "20px" }}>
        <div className="office-form-grid-2">
          <div className="office-form-group">
            <label className="office-form-label">Select Class & Section</label>
            <select
              className="office-select"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">-- Choose Classroom --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class.name} — Section {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="office-form-group">
            <label className="office-form-label">Attendance Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="office-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {message && (
        <div
          style={{
            background: isError ? "#fef2f2" : "#ecfdf5",
            border: `1px solid ${isError ? "#fecaca" : "#a7f3d0"}`,
            color: isError ? "#991b1b" : "#065f46",
            borderRadius: "8px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="office-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading students for this classroom...</div>
        </div>
      ) : !sectionId ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
          Please select a classroom section to load the daily student attendance register.
        </div>
      ) : students.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
          No enrolled students found in this section.
        </div>
      ) : (
        <div className="office-card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Card Action Header */}
          <div
            style={{
              padding: "18px 22px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Class Roster ({students.length} Students)
              </div>
              <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                Present: <strong style={{ color: "#059669" }}>{presentCount}</strong> • Absent:{" "}
                <strong style={{ color: "#dc2626" }}>{absentCount}</strong>
                {existing.size > 0 && " • Previously recorded"}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => markAll("PRESENT")}
                className="office-btn office-btn-secondary office-btn-sm"
              >
                <Check size={14} color="#059669" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => markAll("ABSENT")}
                className="office-btn office-btn-secondary office-btn-sm"
              >
                <X size={14} color="#dc2626" />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Student Attendance Rows Table */}
          <div className="office-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table className="office-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th style={{ width: "130px" }}>Adm. No.</th>
                  <th>Student Full Name</th>
                  <th style={{ textAlign: "right" }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, index) => {
                  const currentStatus = attendance[s.id] || "PRESENT";
                  return (
                    <tr key={s.id}>
                      <td style={{ color: "#94a3b8", fontSize: "13px" }}>{index + 1}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: "#1e3a8a" }}>
                        {s.admissionNo}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{s.fullName}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {STATUSES.map((status) => {
                            const isSelected = currentStatus === status.key;
                            let activeStyle: React.CSSProperties = {};
                            if (isSelected) {
                              if (status.color === "green") {
                                activeStyle = { background: "#059669", color: "#ffffff", borderColor: "#059669", fontWeight: 700 };
                              } else if (status.color === "red") {
                                activeStyle = { background: "#dc2626", color: "#ffffff", borderColor: "#dc2626", fontWeight: 700 };
                              } else if (status.color === "amber") {
                                activeStyle = { background: "#d97706", color: "#ffffff", borderColor: "#d97706", fontWeight: 700 };
                              } else {
                                activeStyle = { background: "#1e3a8a", color: "#ffffff", borderColor: "#1e3a8a", fontWeight: 700 };
                              }
                            }

                            return (
                              <button
                                key={status.key}
                                type="button"
                                onClick={() => setStudentStatus(s.id, status.key)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#334155",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  transition: "all 0.12s ease",
                                  ...activeStyle,
                                }}
                              >
                                {status.label}
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

          {/* Bottom Save Action Bar */}
          <div
            style={{
              padding: "20px 24px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Total: <strong>{students.length}</strong> students | Present: <strong>{presentCount}</strong> | Absent: <strong>{absentCount}</strong>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="office-btn office-btn-success"
              style={{ minWidth: "220px", height: "44px" }}
            >
              {saving ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  <span>Saving Attendance...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Attendance Register</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
