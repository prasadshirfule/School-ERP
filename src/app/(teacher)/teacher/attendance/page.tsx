"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Calendar, AlertCircle, Sparkles, Check, X, Clock } from "lucide-react";

type SectionOption = { id: string; name: string; class: { name: string } };
type StudentData = { id: string; fullName: string; admissionNo: string };

const STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "LEAVE"];
const STATUS_COLORS: Record<string, string> = {
  PRESENT: "badge-success",
  ABSENT: "badge-danger",
  LATE: "badge-warning",
  HALF_DAY: "badge-warning",
  LEAVE: "badge-info",
};

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

  useEffect(() => {
    fetch("/api/sections").then((r) => r.json()).then(setSections);
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    setLoading(true);
    setMessage("");

    Promise.all([
      fetch(`/api/students?sectionId=${sectionId}`).then((r) => r.json()),
      fetch(`/api/attendance?sectionId=${sectionId}&date=${date}`).then((r) => r.json()),
    ]).then(([studentsData, attendanceData]) => {
      setStudents(studentsData);

      const att: Record<string, string> = {};
      const ex = new Set<string>();
      for (const rec of attendanceData) {
        att[rec.studentId] = rec.status;
        ex.add(rec.studentId);
      }
      for (const s of studentsData) {
        if (!att[s.id]) att[s.id] = "PRESENT";
      }
      setAttendance(att);
      setExisting(ex);
      setLoading(false);
    });
  }, [sectionId, date]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const records = students.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] || "PRESENT",
    }));

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, date, records }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setMessage(data.message);
      setExisting(new Set(students.map((s) => s.id)));
    } else {
      setMessage(data.error || "Failed to save attendance");
    }
  };

  const markAll = (status: string) => {
    const updated: Record<string, string> = {};
    for (const s of students) {
      updated[s.id] = status;
    }
    setAttendance(updated);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Attendance Register</h1>
          <p className="page-subtitle">Select your section, pick the date, and record or update student attendance</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Select Classroom Batch</label>
            <select className="form-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">Select section batch...</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.class.name} — Section {s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Attendance Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes("Failed") || message.includes("error") ? "alert-error" : "alert-success"}`}>
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {sectionId && !loading && students.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Class Roster ({students.length} Students)</h3>
              {existing.size > 0 && (
                <span style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px", display: "inline-block" }}>
                  ✨ Attendance recorded for {existing.size} student(s) on this date. Saving will update in-place.
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => markAll("PRESENT")}>
                <Check size={13} color="#10b981" />
                <span>All Present</span>
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => markAll("ABSENT")}>
                <X size={13} color="#f43f5e" />
                <span>All Absent</span>
              </button>
            </div>
          </div>

          <div className="table-container" style={{ marginBottom: "20px" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "140px" }}>Admission #</th>
                  <th>Student Name</th>
                  <th style={{ width: "220px" }}>Attendance State</th>
                  <th style={{ width: "140px" }}>Database Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "12.5px", color: "#818cf8", fontWeight: 600 }}>{s.admissionNo}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.fullName}</td>
                    <td>
                      <select
                        className="form-select"
                        value={attendance[s.id] || "PRESENT"}
                        onChange={(e) => setAttendance((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        style={{ height: "34px", padding: "4px 10px", fontSize: "13px", width: "140px" }}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>{st.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {existing.has(s.id) ? (
                        <span className={`badge ${STATUS_COLORS[attendance[s.id]] || "badge-info"}`}>
                          <span className="badge-dot" />
                          <span>{attendance[s.id]}</span>
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <span className="badge-dot" />
                          <span>Unsaved</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ height: "42px", padding: "0 22px" }}>
              <CheckCircle2 size={16} />
              <span>{saving ? "Saving..." : existing.size > 0 ? "Update Attendance Register" : "Submit Daily Attendance"}</span>
            </button>
          </div>
        </div>
      )}

      {sectionId && !loading && students.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <Calendar size={26} color="#2dd4bf" />
            </div>
            <div className="empty-state-title">No students found in this section</div>
            <p className="empty-state-text">There are currently no students enrolled in the selected class section.</p>
          </div>
        </div>
      )}

      {loading && <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading attendance register...</div>}
    </div>
  );
}
