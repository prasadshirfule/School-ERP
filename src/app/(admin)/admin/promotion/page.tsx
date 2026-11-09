"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ArrowRight, Sparkles, CheckCircle2, UserCheck, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Section {
  id: string;
  name: string;
  academicYear: string;
  class: { id: string; name: string };
}

interface Student {
  id: string;
  admissionNo: string;
  rollNumber: string;
  fullName: string;
  academicYear: string;
}

export default function StudentPromotionPage() {
  const toast = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [sourceSectionId, setSourceSectionId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [targetAcademicYear, setTargetAcademicYear] = useState("2027-28");
  const [action, setAction] = useState<"PROMOTE" | "RETAIN" | "GRADUATE">("PROMOTE");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSections(data);
          if (data.length > 0) {
            setSourceSectionId(data[0].id);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (!sourceSectionId) return;
    let ignore = false;

    async function loadStudents() {
      try {
        const res = await fetch(`/api/students?sectionId=${sourceSectionId}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setStudents(data);
            setSelectedStudentIds(new Set(data.map((s: Student) => s.id)));
          } else {
            setStudents([]);
          }
        }
      } catch {
        if (!ignore) setStudents([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      ignore = true;
    };
  }, [sourceSectionId]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handlePromote = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error("Please select at least one student to promote/process.");
      return;
    }

    if ((action === "PROMOTE" || action === "RETAIN") && !targetSectionId) {
      toast.error("Please select a target destination section.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/students/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          studentIds: Array.from(selectedStudentIds),
          targetSectionId: action === "GRADUATE" ? null : targetSectionId,
          targetAcademicYear,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process promotion");
      }

      toast.success(data.message || `Successfully processed students`);

      // Refresh student list
      const refreshRes = await fetch(`/api/students?sectionId=${sourceSectionId}`);
      const refreshedData = await refreshRes.json();
      setStudents(Array.isArray(refreshedData) ? refreshedData : []);
      setSelectedStudentIds(new Set());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to process promotion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Year-End Student Promotion &amp; Rollover</h1>
          <p className="office-subtitle">
            Promote student cohorts to the next grade level, retain students, or graduate outgoing batches
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "flex-start" }}>
        {/* Promotion Controls */}
        <div className="office-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 className="office-card-title">Promotion Parameters</h3>

          <div className="office-form-group">
            <label className="office-form-label">Current Classroom Section (Source)</label>
            <select
              className="office-select"
              value={sourceSectionId}
              onChange={(e) => setSourceSectionId(e.target.value)}
              style={{ width: "100%" }}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class.name} — Section {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div className="office-form-group">
            <label className="office-form-label">Promotion Action</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className={`office-btn office-btn-sm ${action === "PROMOTE" ? "office-btn-primary" : "office-btn-secondary"}`}
                style={{ flex: 1 }}
                onClick={() => setAction("PROMOTE")}
              >
                Promote
              </button>
              <button
                type="button"
                className={`office-btn office-btn-sm ${action === "RETAIN" ? "office-btn-primary" : "office-btn-secondary"}`}
                style={{ flex: 1 }}
                onClick={() => setAction("RETAIN")}
              >
                Retain
              </button>
              <button
                type="button"
                className={`office-btn office-btn-sm ${action === "GRADUATE" ? "office-btn-primary" : "office-btn-secondary"}`}
                style={{ flex: 1 }}
                onClick={() => setAction("GRADUATE")}
              >
                Graduate
              </button>
            </div>
          </div>

          {action !== "GRADUATE" && (
            <div className="office-form-group">
              <label className="office-form-label">Target Destination Section</label>
              <select
                className="office-select"
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">-- Choose Target Section --</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class.name} — Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="office-form-group">
            <label className="office-form-label">New Academic Session</label>
            <input
              type="text"
              className="office-input"
              value={targetAcademicYear}
              onChange={(e) => setTargetAcademicYear(e.target.value)}
              placeholder="e.g. 2027-28"
              style={{ width: "100%" }}
            />
          </div>

          <button
            type="button"
            className="office-btn office-btn-primary"
            style={{ width: "100%", justifyContent: "center", height: "44px" }}
            onClick={handlePromote}
            disabled={submitting || selectedStudentIds.size === 0}
          >
            {submitting ? (
              <>
                <Sparkles size={16} className="animate-spin" />
                <span>Processing Promotion...</span>
              </>
            ) : (
              <>
                <UserCheck size={16} />
                <span>
                  Execute {action} ({selectedStudentIds.size} Selected)
                </span>
              </>
            )}
          </button>
        </div>

        {/* Student Roster Selection Table */}
        <div className="office-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Students in Current Section ({students.length})
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Select students to include in this rollover operation
              </div>
            </div>
            {students.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="office-btn office-btn-secondary office-btn-sm"
              >
                {selectedStudentIds.size === students.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <Sparkles size={20} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
              <span>Loading student roster...</span>
            </div>
          ) : students.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              No students found in this section.
            </div>
          ) : (
            <div className="office-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
              <table className="office-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>Select</th>
                    <th>Roll #</th>
                    <th>Adm. No.</th>
                    <th>Full Name</th>
                    <th>Session</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const isSelected = selectedStudentIds.has(s.id);
                    return (
                      <tr
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        style={{ cursor: "pointer", background: isSelected ? "#eff6ff" : undefined }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ color: "#64748b" }}>{s.rollNumber || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontWeight: 600, color: "#1e3a8a" }}>
                          {s.admissionNo}
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{s.fullName}</td>
                        <td>
                          <span className="office-pill office-pill-blue">{s.academicYear}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
