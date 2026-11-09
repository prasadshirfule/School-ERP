"use client";

import { useEffect, useState } from "react";
import {
  School,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Users,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

/* ─── Types ─── */
type TeacherOption = { id: string; fullName: string };

type SectionData = {
  id: string;
  name: string;
  academicYear: string;
  classTeacher?: { id: string; fullName: string } | null;
  classTeacherId?: string | null;
  _count: { students: number };
};

type ClassData = {
  id: string;
  name: string;
  order: number;
  sections: SectionData[];
};

type SectionDraft = {
  name: string;
  classTeacherId: string;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateDefaultSections(count: number): SectionDraft[] {
  return Array.from({ length: count }, (_, i) => ({
    name: LETTERS[i] || `S${i + 1}`,
    classTeacherId: "",
  }));
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  // Creation form state
  const [className, setClassName] = useState("");
  const [sectionCount, setSectionCount] = useState(1);
  const [sectionDrafts, setSectionDrafts] = useState<SectionDraft[]>(generateDefaultSections(1));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClasses = async () => {
    const res = await fetch("/api/classes");
    const data = await res.json();
    setClasses(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
    ])
      .then(([classesData, teachersData]) => {
        setClasses(Array.isArray(classesData) ? classesData : []);
        setTeachers(Array.isArray(teachersData) ? teachersData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSectionCountChange = (count: number) => {
    const clamped = Math.max(1, Math.min(26, count));
    setSectionCount(clamped);
    setSectionDrafts((prev) => {
      if (clamped > prev.length) {
        return [
          ...prev,
          ...Array.from({ length: clamped - prev.length }, (_, i) => ({
            name: LETTERS[prev.length + i] || `S${prev.length + i + 1}`,
            classTeacherId: "",
          })),
        ];
      }
      return prev.slice(0, clamped);
    });
  };

  const updateDraftName = (idx: number, name: string) => {
    setSectionDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, name } : d)));
  };

  const updateDraftTeacher = (idx: number, classTeacherId: string) => {
    setSectionDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, classTeacherId } : d)));
  };

  const resetForm = () => {
    setClassName("");
    setSectionCount(1);
    setSectionDrafts(generateDefaultSections(1));
    setError("");
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: className,
          sections: sectionDrafts.map((d) => ({
            name: d.name,
            classTeacherId: d.classTeacherId || undefined,
          })),
        }),
      });

      setSubmitting(false);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create class");
        return;
      }

      resetForm();
      fetchClasses();
    } catch (err: unknown) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Failed to create class");
    }
  };

  if (loading) {
    return (
      <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
        <div style={{ color: "#64748b", fontSize: "14px" }}>Loading classes & sections...</div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Classes & Sections</h1>
          <p className="office-subtitle">
            Configure academic grade levels, classroom sections, and class teacher allocations
          </p>
        </div>
        <div className="office-actions-bar">
          <button
            className="office-btn office-btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showForm ? "Cancel" : "Add Class"}</span>
          </button>
        </div>
      </div>

      {/* ─── Add Class Form ─── */}
      {showForm && (
        <div className="office-card" style={{ border: "2px solid #bfdbfe", background: "#f8fafc" }}>
          <div className="office-card-header">
            <h3 className="office-card-title">Create Class & Allocate Sections</h3>
          </div>
          {error && (
            <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
              {error}
            </div>
          )}
          <form onSubmit={handleCreate}>
            <div className="office-form-grid-2">
              <div className="office-form-group">
                <label className="office-form-label">
                  Class / Grade Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class 1, Grade 10"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div className="office-form-group">
                <label className="office-form-label">
                  Number of Sections <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="26"
                  value={sectionCount}
                  onChange={(e) => handleSectionCountChange(Number(e.target.value))}
                  className="office-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>
            </div>

            {/* Section preview cards */}
            <div style={{ marginTop: "14px", marginBottom: "14px" }}>
              <label className="office-form-label" style={{ marginBottom: "8px", display: "block" }}>
                Section Assignments
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                {sectionDrafts.map((draft, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px" }}>
                      Section {idx + 1}
                    </div>
                    <div style={{ marginBottom: "8px" }}>
                      <input
                        className="office-input"
                        value={draft.name}
                        onChange={(e) => updateDraftName(idx, e.target.value)}
                        placeholder="A"
                        required
                        style={{ height: "32px", fontSize: "13px", fontWeight: 600, textAlign: "center", width: "100%" }}
                      />
                    </div>
                    <div>
                      <select
                        className="office-select"
                        value={draft.classTeacherId}
                        onChange={(e) => updateDraftTeacher(idx, e.target.value)}
                        style={{ height: "32px", fontSize: "12px", width: "100%" }}
                      >
                        <option value="">— Unassigned —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button className="office-btn office-btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Class & Sections"}
              </button>
              <button className="office-btn office-btn-secondary" type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Class List ─── */}
      {classes.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <School size={36} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>No Classes Configured</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 16px 0" }}>
            Add your school grade levels (e.g. Class 1 to 12) to start assigning students and sections.
          </p>
          <button className="office-btn office-btn-primary office-btn-sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            <span>Add First Class</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {classes.map((cls) => {
            const isExpanded = expandedClassId === cls.id;
            const totalStudents = cls.sections.reduce((acc, s) => acc + s._count.students, 0);

            return (
              <div key={cls.id} className="office-card" style={{ padding: 0, overflow: "hidden" }}>
                <div
                  onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    background: isExpanded ? "#f8fafc" : "#ffffff",
                    borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ color: "#64748b" }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{cls.name}</div>
                      <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                        Level {cls.order} • {cls.sections.length} section{cls.sections.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <span className="office-pill office-pill-blue">
                    <Users size={12} />
                    <span>{totalStudents} student{totalStudents !== 1 ? "s" : ""}</span>
                  </span>
                </div>

                {isExpanded && (
                  <ExpandedSections
                    cls={cls}
                    teachers={teachers}
                    onRefresh={fetchClasses}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandedSections({
  cls,
  teachers,
  onRefresh,
}: {
  cls: ClassData;
  teachers: TeacherOption[];
  onRefresh: () => void;
}) {
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionTeacher, setNewSectionTeacher] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: cls.id,
          name: newSectionName.trim(),
          academicYear: "2026-27",
          classTeacherId: newSectionTeacher || undefined,
        }),
      });

      setActionLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add section");
        return;
      }

      setAddingSection(false);
      setNewSectionName("");
      setNewSectionTeacher("");
      onRefresh();
    } catch (err: unknown) {
      setActionLoading(false);
      setError(err instanceof Error ? err.message : "Failed to add section");
    }
  };

  const startEdit = (section: SectionData) => {
    setEditingId(section.id);
    setEditName(section.name);
    setEditTeacher(section.classTeacherId || section.classTeacher?.id || "");
    setError("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editName.trim(),
          classTeacherId: editTeacher || null,
        }),
      });

      setActionLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update section");
        return;
      }

      setEditingId(null);
      onRefresh();
    } catch (err: unknown) {
      setActionLoading(false);
      setError(err instanceof Error ? err.message : "Failed to update section");
    }
  };

  const handleDelete = async (section: SectionData) => {
    if (section._count.students > 0) {
      setError(
        `Cannot delete Section ${section.name} — ${section._count.students} student(s) enrolled. Reassign them first.`
      );
      return;
    }

    if (!confirm(`Delete Section ${section.name}? This cannot be undone.`)) return;

    setActionLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: section.id }),
      });

      setActionLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete section");
        return;
      }

      onRefresh();
    } catch (err: unknown) {
      setActionLoading(false);
      setError(err instanceof Error ? err.message : "Failed to delete section");
    }
  };

  return (
    <div style={{ padding: "16px 20px", background: "#f8fafc" }}>
      {error && (
        <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
        {cls.sections.map((section) => {
          const isEditingThis = editingId === section.id;
          return (
            <div
              key={section.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {isEditingThis ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="office-input"
                    style={{ width: "70px", height: "32px", fontSize: "13px" }}
                  />
                  <select
                    value={editTeacher}
                    onChange={(e) => setEditTeacher(e.target.value)}
                    className="office-select"
                    style={{ height: "32px", fontSize: "12.5px" }}
                  >
                    <option value="">— Unassigned —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveEdit}
                    disabled={actionLoading}
                    className="office-btn office-btn-primary office-btn-sm"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="office-btn office-btn-secondary office-btn-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                      Section {section.name}
                    </span>
                    <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                      Teacher:{" "}
                      <strong style={{ color: "#334155" }}>
                        {section.classTeacher?.fullName || "Unassigned"}
                      </strong>
                    </span>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      ({section._count.students} students)
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => startEdit(section)}
                      className="office-btn office-btn-secondary office-btn-sm"
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(section)}
                      className="office-btn office-btn-secondary office-btn-sm"
                      style={{ color: "#dc2626" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {addingSection ? (
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="Section Name (e.g. C)"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            className="office-input"
            style={{ width: "160px", height: "34px", fontSize: "13px" }}
          />
          <select
            value={newSectionTeacher}
            onChange={(e) => setNewSectionTeacher(e.target.value)}
            className="office-select"
            style={{ height: "34px", fontSize: "12.5px" }}
          >
            <option value="">-- Assign Teacher --</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddSection}
            disabled={actionLoading || !newSectionName.trim()}
            className="office-btn office-btn-primary office-btn-sm"
          >
            Save Section
          </button>
          <button
            onClick={() => setAddingSection(false)}
            className="office-btn office-btn-secondary office-btn-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingSection(true)}
          className="office-btn office-btn-secondary office-btn-sm"
        >
          <Plus size={13} />
          <span>Add Section to {cls.name}</span>
        </button>
      )}
    </div>
  );
}
