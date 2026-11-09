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
    setLoading(true);
    fetch(`/api/students?sectionId=${sourceSectionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data);
          setSelectedStudentIds(new Set(data.map((s: Student) => s.id)));
        } else {
          setStudents([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      toast.error("Please select a target section.");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to process promotion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Year-End Student Promotion & Rollover</h1>
          <p className="page-subtitle">
            Promote cohorts to the next grade, retain students, or graduate outgoing batches with historical record preservation.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "flex-start" }}>
        {/* Promotion Controls */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>Promotion Workflow</h3>

          <div>
            <label className="form-label">Current Section (Source)</label>
            <select
              className="form-control"
              value={sourceSectionId}
              onChange={(e) => setSourceSectionId(e.target.value)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class.name} — Section {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Action Type</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className={`btn btn-sm ${action === "PROMOTE" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1 }}
                onClick={() => setAction("PROMOTE")}
              >
                Promote
              </button>
              <button
                type="button"
                className={`btn btn-sm ${action === "RETAIN" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1 }}
                onClick={() => setAction("RETAIN")}
              >
                Retain
              </button>
              <button
                type="button"
                className={`btn btn-sm ${action === "GRADUATE" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1 }}
                onClick={() => setAction("GRADUATE")}
              >
                Graduate
              </button>
            </div>
          </div>

          {action !== "GRADUATE" && (
            <div>
              <label className="form-label">Target Section</label>
              <select
                className="form-control"
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
              >
                <option value="">-- Select Destination Section --</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class.name} — Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="form-label">New Academic Year</label>
            <input
              type="text"
              className="form-control"
              value={targetAcademicYear}
              onChange={(e) => setTargetAcademicYear(e.target.value)}
              placeholder="e.g. 2027-28"
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
            onClick={handlePromote}
            disabled={submitting || selectedStudentIds.size === 0}
          >
            {submitting ? (
              <>
                <Sparkles size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <UserCheck size={16} />
                <span>Execute {action} ({selectedStudentIds.size})</span>
              </>
            )}
          </button>
        </div>

        {/* Student Selection Table */}
        <div className="card" style={{ padding: "0" }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              Students in Selected Section ({students.length})
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="btn btn-secondary btn-sm"
            >
              {selectedStudentIds.size === students.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {loading ? (
            <div className="loading" style={{ padding: "30px" }}>
              <Sparkles size={18} className="animate-spin" /> Loading section roster...
            </div>
          ) : students.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              No active students found in this section.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === students.length && students.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Admission No</th>
                    <th>Roll</th>
                    <th>Student Name</th>
                    <th>Current Session</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      style={{ cursor: "pointer", background: selectedStudentIds.has(s.id) ? "rgba(251, 113, 133, 0.04)" : "transparent" }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={() => toggleStudent(s.id)}
                        />
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{s.admissionNo}</td>
                      <td>{s.rollNumber || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{s.academicYear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
