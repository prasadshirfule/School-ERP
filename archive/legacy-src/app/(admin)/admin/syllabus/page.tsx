"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Sparkles, BookOpen, CheckCircle2, Plus, Trash2, X, Save, AlertCircle } from "lucide-react";

type ClassItem = { id: string; name: string };
type Subject = { id: string; name: string };
type Topic = {
  id: string; topicTitle: string; description: string | null;
  order: number; isCompleted: boolean; completedDate: string | null;
};

export default function AdminSyllabusPage() {
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
    if (!selectedClass || !selectedSubject) { setTopics([]); return; }
    setLoadingTopics(true);
    fetch(`/api/syllabus?classId=${selectedClass}&subjectId=${selectedSubject}&academicYear=${academicYear}`)
      .then((r) => r.json())
      .then((data) => { setTopics(Array.isArray(data) ? data : []); setLoadingTopics(false); });
  };

  useEffect(() => { fetchTopics(); }, [selectedClass, selectedSubject, academicYear]);

  const handleAddTopic = async () => {
    if (!newTitle.trim()) { setError("Topic title is required"); return; }
    setAddingTopic(true); setError("");
    const res = await fetch("/api/syllabus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClass, subjectId: selectedSubject, academicYear, topicTitle: newTitle, description: newDesc }),
    });
    if (res.ok) { setNewTitle(""); setNewDesc(""); setShowAddForm(false); fetchTopics(); }
    else { const d = await res.json(); setError(d.error || "Failed to add topic"); }
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

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading syllabus data...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Syllabus Tracking</h1>
          <p className="page-subtitle">Manage curriculum topics and track completion progress per class and subject</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <BookOpen size={18} color="#34d399" />
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "11px" }}>Class</label>
            <select className="form-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={{ width: "180px" }}>
              <option value="">— Select —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "11px" }}>Subject</label>
            <select className="form-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={{ width: "180px" }}>
              <option value="">— Select —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <div className="form-group">
                <label className="form-label">Topic Title *</label>
                <input className="form-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Quadratic Equations" />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-textarea" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional notes..." rows={2} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-sm" onClick={handleAddTopic} disabled={addingTopic} style={{ gap: "5px" }}>
                  <Save size={14} /> <span>{addingTopic ? "Adding..." : "Add Topic"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Topic List */}
          {loadingTopics ? (
            <div className="loading"><Sparkles size={16} className="animate-spin" /> Loading topics...</div>
          ) : topics.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon-wrap"><BookOpen size={26} color="#34d399" /></div>
                <div className="empty-state-title">No syllabus topics yet</div>
                <p className="empty-state-text">Click &quot;Add Topic&quot; to start building the curriculum for this class and subject.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {topics.map((topic, i) => (
                <div
                  key={topic.id}
                  className={`syllabus-topic-row ${topic.isCompleted ? "syllabus-topic-completed" : ""}`}
                >
                  <div
                    className={`syllabus-check ${topic.isCompleted ? "syllabus-check-done" : ""}`}
                    onClick={() => toggleComplete(topic)}
                  >
                    {topic.isCompleted && <CheckCircle2 size={14} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: topic.isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                      textDecoration: topic.isCompleted ? "line-through" : "none",
                    }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px", marginRight: "8px" }}>#{i + 1}</span>
                      {topic.topicTitle}
                    </div>
                    {topic.description && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{topic.description}</div>
                    )}
                    {topic.isCompleted && topic.completedDate && (
                      <div style={{ fontSize: "11px", color: "#34d399", marginTop: "2px" }}>
                        ✓ Completed {new Date(topic.completedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                  <button className="btn-icon btn-icon-danger" onClick={() => deleteTopic(topic.id)} title="Delete topic">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
