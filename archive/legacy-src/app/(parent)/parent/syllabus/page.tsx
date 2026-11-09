"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Sparkles } from "lucide-react";

type Subject = { id: string; name: string };
type Topic = { id: string; topicTitle: string; description: string | null; order: number; isCompleted: boolean; completedDate: string | null };

export default function ParentSyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classId, setClassId] = useState("");
  const [className, setClassName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    // Get child's class from parent's students
    Promise.all([
      fetch("/api/parent/students").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ]).then(([students, subs]) => {
      setSubjects(Array.isArray(subs) ? subs : []);
      if (students.length > 0 && students[0].section?.class) {
        setClassId(students[0].section.class.id);
        setClassName(students[0].section.class.name);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!classId || !selectedSubject) { setTopics([]); return; }
    setLoadingTopics(true);
    fetch(`/api/syllabus?classId=${classId}&subjectId=${selectedSubject}&academicYear=2026-27`)
      .then((r) => r.json())
      .then((data) => { setTopics(Array.isArray(data) ? data : []); setLoadingTopics(false); });
  }, [classId, selectedSubject]);

  const completed = topics.filter((t) => t.isCompleted).length;
  const total = topics.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading syllabus...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Syllabus Progress</h1>
          <p className="page-subtitle">{className ? `${className} curriculum completion tracker` : "Track your child's syllabus progress"}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BookOpen size={18} color="#fb7185" />
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "11px" }}>Subject</label>
            <select className="form-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={{ width: "220px" }}>
              <option value="">— Select Subject —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedSubject && (
        <>
          {loadingTopics ? (
            <div className="loading"><Sparkles size={16} className="animate-spin" /> Loading topics...</div>
          ) : topics.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon-wrap"><BookOpen size={26} color="#fb7185" /></div>
                <div className="empty-state-title">No syllabus topics available</div>
                <p className="empty-state-text">The teacher has not added syllabus topics for this subject yet.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <CheckCircle2 size={16} color="#34d399" />
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>
                    {completed} of {total} topics covered ({pct}%)
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {topics.map((topic, i) => (
                  <div key={topic.id} className={`syllabus-topic-row ${topic.isCompleted ? "syllabus-topic-completed" : ""}`}>
                    <div className={`syllabus-check ${topic.isCompleted ? "syllabus-check-done" : ""}`} style={{ cursor: "default" }}>
                      {topic.isCompleted && <CheckCircle2 size={14} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: "13.5px", fontWeight: 600,
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
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
