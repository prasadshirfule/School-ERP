"use client";

import React, { useEffect, useState } from "react";
import { Building2, Sparkles, Plus, Trash2, Edit2, Users, UserCheck, X, Save, AlertCircle } from "lucide-react";

type Teacher = { id: string; fullName: string };
type Department = {
  id: string;
  name: string;
  headOfDepartmentId: string | null;
  headOfDepartment: Teacher | null;
  teachers: Teacher[];
  createdAt: string;
};

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [hodId, setHodId] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = () => {
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
    ])
      .then(([depts, teachers]) => {
        setDepartments(Array.isArray(depts) ? depts : []);
        setAllTeachers(Array.isArray(teachers) ? teachers : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setName("");
    setHodId("");
    setSelectedTeacherIds([]);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setHodId(dept.headOfDepartmentId || "");
    setSelectedTeacherIds(dept.teachers.map((t) => t.id));
    setError("");
    setShowModal(true);
  };

  const handleToggleTeacher = (tId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Department name is required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const url = "/api/departments";
      const method = editingDept ? "PATCH" : "POST";
      const payload: any = {
        name: name.trim(),
        headOfDepartmentId: hodId || null,
        teacherIds: selectedTeacherIds,
      };
      if (editingDept) payload.id = editingDept.id;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save department");
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Are you sure you want to delete the department "${dept.name}"? Teachers will be unlinked.`)) return;
    try {
      const res = await fetch(`/api/departments?id=${dept.id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading departments...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic &amp; Operational Departments</h1>
          <p className="page-subtitle">
            Organize faculty into departments, assign Heads of Department (HOD), and manage staff rosters
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ gap: "6px" }}>
          <Plus size={16} />
          <span>New Department</span>
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="card empty-state" style={{ padding: "40px 20px" }}>
          <Building2 size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <div className="empty-state-title">No Departments Created Yet</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
            Create academic departments (e.g. Science, Mathematics, Languages, Administration) to organize your staff.
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={14} /> Add First Department
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {departments.map((dept) => (
            <div key={dept.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--role-admin-light)",
                        color: "#818cf8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{dept.name}</h3>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {dept.teachers.length} Faculty Member{dept.teachers.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn-icon"
                      onClick={() => openEditModal(dept)}
                      title="Edit Department"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDelete(dept)}
                      title="Delete Department"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* HOD info */}
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <UserCheck size={16} color="#34d399" />
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                      Head of Department (HOD)
                    </span>
                    <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                      {dept.headOfDepartment ? dept.headOfDepartment.fullName : "Not Assigned"}
                    </strong>
                  </div>
                </div>

                {/* Teacher roster badges */}
                <div style={{ marginBottom: "10px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    Assigned Teachers:
                  </span>
                  {dept.teachers.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {dept.teachers.map((t) => (
                        <span key={t.id} className="badge badge-teal" style={{ fontSize: "11.5px" }}>
                          {t.fullName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No teachers assigned yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Department Modal ─── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: "520px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={18} color="#818cf8" />
                <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>
                  {editingDept ? "Edit Department" : "New Department"}
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "14px" }}>
                <AlertCircle size={15} /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Science, Mathematics, Humanities, Administration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Head of Department (HOD)</label>
                <select
                  className="form-select"
                  value={hodId}
                  onChange={(e) => setHodId(e.target.value)}
                >
                  <option value="">— Select Teacher (Optional) —</option>
                  {allTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Faculty Members</label>
                <div
                  style={{
                    maxHeight: "180px",
                    overflowY: "auto",
                    padding: "10px",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {allTeachers.map((t) => {
                    const isChecked = selectedTeacherIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                          cursor: "pointer",
                          color: isChecked ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: isChecked ? 600 : 400,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTeacher(t.id)}
                          style={{ cursor: "pointer" }}
                        />
                        <span>{t.fullName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: "6px" }}>
                  {saving ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{saving ? "Saving..." : "Save Department"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
