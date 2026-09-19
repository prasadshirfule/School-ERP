"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Plus, FileText, Calendar, Upload, Trash2, Edit2, Download, AlertCircle, Sparkles, X, Save, Paperclip } from "lucide-react";

type Section = { id: string; name: string; class: { id: string; name: string } };
type Subject = { id: string; name: string };
type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  section: { id: string; name: string; class: { id: string; name: string } };
  subject: { id: string; name: string };
  teacher: { id: string; fullName: string };
};

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = () => {
    Promise.all([
      fetch("/api/assignments").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ])
      .then(([ass, sec, sub]) => {
        setAssignments(Array.isArray(ass) ? ass : []);
        setSections(Array.isArray(sec) ? sec : []);
        setSubjects(Array.isArray(sub) ? sub : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingAssignment(null);
    setSectionId(sections.length > 0 ? sections[0].id : "");
    setSubjectId(subjects.length > 0 ? subjects[0].id : "");
    setTitle("");
    setDescription("");
    setDueDate("");
    setAttachmentUrl("");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (a: Assignment) => {
    setEditingAssignment(a);
    setSectionId(a.section.id);
    setSubjectId(a.subject.id);
    setTitle(a.title);
    setDescription(a.description);
    setDueDate(a.dueDate ? a.dueDate.slice(0, 10) : "");
    setAttachmentUrl(a.attachmentUrl || "");
    setError("");
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setUploadingFile(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/assignment", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload attachment");
      setAttachmentUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sectionId || !subjectId) {
      setError("Title, Section, and Subject are required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const payload: any = {
        sectionId,
        subjectId,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        attachmentUrl: attachmentUrl || null,
      };
      if (editingAssignment) payload.id = editingAssignment.id;

      const res = await fetch("/api/assignments", {
        method: editingAssignment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save assignment");

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      const res = await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDisplayDate = (d: string | null) => {
    if (!d) return "No Due Date";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? d
      : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading assignments...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignments &amp; Study Notes</h1>
          <p className="page-subtitle">Publish homework, syllabus notes, and study materials for your classes</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ gap: "6px" }}>
          <Plus size={16} />
          <span>Post Assignment / Note</span>
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="card empty-state" style={{ padding: "40px 20px" }}>
          <BookOpen size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <div className="empty-state-title">No Assignments Posted Yet</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
            Create assignments, upload homework sheets, or share study notes with students and parents.
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={14} /> Post First Assignment
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {assignments.map((item) => {
            const isPastDue = item.dueDate ? new Date(item.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) : false;

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderLeft: `4px solid ${isPastDue ? "var(--border-color)" : "#818cf8"}`,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span className="badge badge-teal">{item.section.class.name} — {item.section.name}</span>
                      <span className="badge badge-warning">{item.subject.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button className="btn-icon" onClick={() => openEditModal(item)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "6px 0 8px 0" }}>{item.title}</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", marginBottom: "14px", lineHeight: "1.5" }}>
                    {item.description || "No additional instructions provided."}
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "10px",
                      borderTop: "1px solid var(--border-subtle)",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", color: isPastDue ? "var(--text-muted)" : "var(--text-primary)" }}>
                      <Calendar size={14} color={isPastDue ? "var(--text-muted)" : "#818cf8"} />
                      <span>Due: {formatDisplayDate(item.dueDate)}</span>
                    </div>

                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "3px 8px", fontSize: "11.5px", gap: "4px" }}
                      >
                        <Download size={12} />
                        <span>Attachment</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create/Edit Assignment Modal ─── */}
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
            style={{ maxWidth: "540px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BookOpen size={18} color="#818cf8" />
                <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>
                  {editingAssignment ? "Edit Assignment / Note" : "Post New Assignment or Study Note"}
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
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Class &amp; Section *</label>
                  <select
                    className="form-select"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    required
                  >
                    <option value="">— Select Section —</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.class.name} — Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <select
                    className="form-select"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                  >
                    <option value="">— Select Subject —</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Chapter 4 Practice Questions / Formula Sheet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Instructions</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Describe homework tasks, reference textbook page numbers, or guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Submission Due Date (Optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Document / File Attachment (Optional)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="file"
                    id="assignmentFile"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="assignmentFile"
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: "pointer", gap: "6px" }}
                  >
                    <Upload size={14} />
                    <span>{uploadingFile ? "Uploading..." : "Upload File / PDF"}</span>
                  </label>

                  {attachmentUrl && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                      <Paperclip size={13} color="#34d399" />
                      <span>File attached</span>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => setAttachmentUrl("")}
                        style={{ padding: "2px" }}
                        title="Remove attachment"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || uploadingFile} style={{ gap: "6px" }}>
                  {saving ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{saving ? "Publishing..." : "Publish to Class"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
