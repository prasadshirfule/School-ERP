"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Plus, Trash2, X, Save, AlertCircle, Sparkles } from "lucide-react";

type ClassItem = { id: string; name: string };
type Subject = { id: string; name: string };
type Topic = {
  id: string;
  topicTitle: string;
  description: string | null;
  order: number;
  isCompleted: boolean;
  completedDate: string | null;
};

export default function TeacherSyllabusPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [academicYear] = useState("2026-27");

  // Add topic
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ]).then(([c, s]) => {
      setClasses(Array.isArray(c) ? c : []);
      setSubjects(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, []);

  const fetchTopics = () => {
    if (!selectedClass || !selectedSubject) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    fetch(`/api/syllabus?classId=${selectedClass}&subjectId=${selectedSubject}&academicYear=${academicYear}`)
      .then((r) => r.json())
      .then((data) => {
        setTopics(Array.isArray(data) ? data : []);
        setLoadingTopics(false);
      });
  };

  useEffect(() => {
    fetchTopics();
  }, [selectedClass, selectedSubject, academicYear]);

  const handleAddTopic = async () => {
    if (!newTitle.trim()) {
      setError("Topic title is required");
      return;
    }
    setAddingTopic(true);
    setError("");
    const res = await fetch("/api/syllabus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClass,
        subjectId: selectedSubject,
        academicYear,
        topicTitle: newTitle,
        description: newDesc,
      }),
    });
    if (res.ok) {
      setNewTitle("");
      setNewDesc("");
      setShowAddForm(false);
      fetchTopics();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to add topic");
    }
    setAddingTopic(false);
  };

  const toggleComplete = async (topic: Topic) => {
    await fetch("/api/syllabus", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: topic.id, isCompleted: !topic.isCompleted }),
    });
    fetchTopics();
  };

  const deleteTopic = async (id: string) => {
    await fetch(`/api/syllabus?id=${id}`, { method: "DELETE" });
    fetchTopics();
  };

  const completed = topics.filter((t) => t.isCompleted).length;
  const total = topics.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading syllabus...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Syllabus Tracker</h1>
          <p className="page-subtitle">Track teaching milestones and mark curriculum topics completed</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <BookOpen size={18} color="#34d399" />
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "11px" }}>Class</label>
            <select
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ width: "180px" }}
            >
              <option value="">— Select Class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "11px" }}>Subject</label>
            <select
              className="form-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ width: "180px" }}
            >
              <option value="">— Select Subject —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedClass && selectedSubject && (
        <>
          {/* Progress Card */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={16} color="#34d399" />
                <span style={{ fontSize: "14px", fontWeight: 600 }}>
                  {completed} of {total} topics covered ({pct}%)
                </span>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddForm(!showAddForm)}
                style={{ gap: "5px" }}
              >
                <Plus size={14} />
                <span>Add Topic</span>
              </button>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Add Topic Form */}
          {showAddForm && (
            <div className="card" style={{ marginBottom: "16px", border: "1px dashed var(--primary-border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>New Syllabus Topic</span>
                <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={14} /></button>
              </div>
              {error && (
                <div className="alert alert-error" style={{ marginBottom: "12px" }}>
                  <AlertCircle size={14} /> <span>{error}</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Topic Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Chapter 1: Real Numbers"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Sub-topics (optional)</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. Euclid's division lemma, Fundamental Theorem of Arithmetic"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddTopic} disabled={addingTopic}>
                    <Save size={14} /> {addingTopic ? "Adding..." : "Save Topic"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Topic List */}
          {loadingTopics ? (
            <div className="loading"><Sparkles size={16} className="animate-spin" /> Loading topics...</div>
          ) : topics.length === 0 ? (
            <div className="card empty-state" style={{ padding: "40px 20px" }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
              <p style={{ color: "var(--text-secondary)", marginBottom: "12px" }}>No syllabus topics defined for this subject yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
                <Plus size={14} /> Add First Topic
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>Status</th>
                      <th style={{ width: "60px" }}>#</th>
                      <th>Topic</th>
                      <th>Description</th>
                      <th>Completed On</th>
                      <th style={{ width: "80px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((t, idx) => (
                      <tr key={t.id} style={{ opacity: t.isCompleted ? 0.75 : 1 }}>
                        <td>
                          <button
                            onClick={() => toggleComplete(t)}
                            title={t.isCompleted ? "Mark incomplete" : "Mark complete"}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: t.isCompleted ? "#34d399" : "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, textDecoration: t.isCompleted ? "line-through" : "none" }}>
                          {t.topicTitle}
                        </td>
                        <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          {t.description || "—"}
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {t.completedDate ? new Date(t.completedDate).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn-icon danger"
                            onClick={() => deleteTopic(t.id)}
                            title="Delete topic"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
