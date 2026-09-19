"use client";

import { useEffect, useState, useCallback } from "react";
import {
  School, Plus, AlertCircle, Sparkles, ChevronDown, ChevronRight,
  Users, Pencil, Trash2, UserPlus, Check, X, GraduationCap,
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

/* ─── Helpers ─── */

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateDefaultSections(count: number): SectionDraft[] {
  return Array.from({ length: count }, (_, i) => ({
    name: LETTERS[i] || `S${i + 1}`,
    classTeacherId: "",
  }));
}

/* ─── Main Component ─── */

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

  const fetchClasses = useCallback(async () => {
    const res = await fetch("/api/classes");
    const data = await res.json();
    setClasses(data);
    setLoading(false);
  }, []);

  const fetchTeachers = useCallback(async () => {
    const res = await fetch("/api/teachers");
    const data = await res.json();
    setTeachers(data);
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [fetchClasses, fetchTeachers]);

  // Update section drafts when section count changes
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
  };

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading classes...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Classes & Sections</h1>
          <p className="page-subtitle">
            Organize your school's academic grades and manage sections within each class
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          <span>{showForm ? "Close" : "Add Class"}</span>
        </button>
      </div>

      {/* ─── Creation Form ─── */}
      {showForm && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header">
            <h3 className="card-title">Create New Class with Sections</h3>
          </div>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Class Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Class 1, Grade 10"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Number of Sections</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="26"
                  value={sectionCount}
                  onChange={(e) => handleSectionCountChange(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Section preview cards */}
            <div style={{ marginTop: "16px", marginBottom: "8px" }}>
              <label className="form-label" style={{ marginBottom: "12px", display: "block" }}>
                Section Preview
              </label>
              <div className="section-preview-grid">
                {sectionDrafts.map((draft, idx) => (
                  <div key={idx} className="section-preview-card">
                    <div className="section-preview-badge">Section {idx + 1}</div>
                    <div className="form-group" style={{ marginBottom: "8px" }}>
                      <label className="form-label" style={{ fontSize: "12px" }}>Name</label>
                      <input
                        className="form-input"
                        value={draft.name}
                        onChange={(e) => updateDraftName(idx, e.target.value)}
                        placeholder="A"
                        required
                        style={{ fontWeight: 600, textAlign: "center" }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "0" }}>
                      <label className="form-label" style={{ fontSize: "12px" }}>Teacher (optional)</label>
                      <select
                        className="form-select"
                        value={draft.classTeacherId}
                        onChange={(e) => updateDraftTeacher(idx, e.target.value)}
                        style={{ fontSize: "13px" }}
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
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Class & Sections"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Classes Table with Expandable Rows ─── */}
      {classes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <School size={26} color="#818cf8" />
            </div>
            <div className="empty-state-title">No classes created yet</div>
            <p className="empty-state-text">
              Add your first academic class to get your school roster organized.
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: "10px" }}
              onClick={() => setShowForm(true)}
            >
              <Plus size={14} />
              <span>Add First Class</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="classes-list">
          {classes.map((cls) => {
            const totalStudents = cls.sections.reduce(
              (sum, s) => sum + (s._count?.students || 0),
              0
            );
            const isExpanded = expandedClassId === cls.id;

            return (
              <div key={cls.id} className={`class-row-card ${isExpanded ? "class-row-expanded" : ""}`}>
                {/* Class header row */}
                <div
                  className="class-row-header"
                  onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                >
                  <div className="class-row-left">
                    <span className="class-expand-icon">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <div>
                      <div className="class-row-name">{cls.name}</div>
                      <div className="class-row-meta">
                        Level {cls.order} · {cls.sections.length} section{cls.sections.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="class-row-right">
                    <span className="badge badge-teal">
                      <Users size={12} />
                      <span>{totalStudents} student{totalStudents !== 1 ? "s" : ""}</span>
                    </span>
                  </div>
                </div>

                {/* Expanded section details */}
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

/* ─── Expanded Sections Sub-component ─── */

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
  };

  return (
    <div className="class-sections-panel">
      {error && (
        <div className="alert alert-error" style={{ margin: "0 0 12px 0" }}>
          <AlertCircle size={14} />
          <span style={{ fontSize: "13px" }}>{error}</span>
        </div>
      )}

      {cls.sections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-muted)", fontSize: "14px" }}>
          No sections yet — add one below.
        </div>
      ) : (
        <div className="section-cards-grid">
          {cls.sections.map((section) => {
            const isEditing = editingId === section.id;

            return (
              <div key={section.id} className="section-detail-card">
                {isEditing ? (
                  /* ─── Edit Mode ─── */
                  <>
                    <div className="form-group" style={{ marginBottom: "8px" }}>
                      <label className="form-label" style={{ fontSize: "12px" }}>Name</label>
                      <input
                        className="form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "10px" }}>
                      <label className="form-label" style={{ fontSize: "12px" }}>Class Teacher</label>
                      <select
                        className="form-select"
                        value={editTeacher}
                        onChange={(e) => setEditTeacher(e.target.value)}
                        style={{ fontSize: "13px" }}
                      >
                        <option value="">— Unassigned —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.fullName}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveEdit}
                        disabled={actionLoading}
                      >
                        <Check size={13} />
                        <span>Save</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X size={13} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* ─── Display Mode ─── */
                  <>
                    <div className="section-detail-header">
                      <span className="section-detail-name">Section {section.name}</span>
                      <div className="section-detail-actions">
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => startEdit(section)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          title={
                            section._count.students > 0
                              ? "Cannot delete — students enrolled"
                              : "Delete section"
                          }
                          onClick={() => handleDelete(section)}
                          disabled={section._count.students > 0}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="section-detail-info">
                      <div className="section-detail-row">
                        <GraduationCap size={13} />
                        <span>{section._count.students} student{section._count.students !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="section-detail-row">
                        <UserPlus size={13} />
                        <span>
                          {section.classTeacher?.fullName || (
                            <em style={{ color: "var(--text-muted)" }}>No teacher assigned</em>
                          )}
                        </span>
                      </div>
                      <div className="section-detail-row" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        AY {section.academicYear}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Section inline form */}
      {addingSection ? (
        <div className="add-section-inline">
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: "0", flex: "1", minWidth: "120px" }}>
              <label className="form-label" style={{ fontSize: "12px" }}>Section Name</label>
              <input
                className="form-input"
                placeholder="e.g. C"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: "0", flex: "1", minWidth: "160px" }}>
              <label className="form-label" style={{ fontSize: "12px" }}>Teacher (optional)</label>
              <select
                className="form-select"
                value={newSectionTeacher}
                onChange={(e) => setNewSectionTeacher(e.target.value)}
                style={{ fontSize: "13px" }}
              >
                <option value="">— Unassigned —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddSection}
                disabled={actionLoading || !newSectionName.trim()}
              >
                <Check size={13} />
                <span>Add</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setAddingSection(false); setError(""); }}
              >
                <X size={13} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop: "8px" }}
          onClick={() => { setAddingSection(true); setError(""); }}
        >
          <Plus size={13} />
          <span>Add Section</span>
        </button>
      )}
    </div>
  );
}
