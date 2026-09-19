"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, Download, AlertCircle, Sparkles, Filter, Paperclip } from "lucide-react";

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

type Child = {
  id: string;
  fullName: string;
  section: { id: string; name: string; class: { id: string; name: string } } | null;
};

export default function ParentAssignmentsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters: All, Upcoming, Past Due (strictly no "Completed" filter)
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UPCOMING" | "PAST_DUE">("ALL");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data: any[]) => {
        const studentList = Array.isArray(data) ? data : [];
        setChildren(studentList);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeChild = children[selectedChildIndex] || null;
  const sectionId = activeChild?.section?.id || "";

  useEffect(() => {
    if (!sectionId) {
      setAssignments([]);
      return;
    }
    fetch(`/api/assignments?sectionId=${sectionId}`)
      .then((r) => r.json())
      .then((data) => {
        setAssignments(Array.isArray(data) ? data : []);
      })
      .catch(() => setAssignments([]));
  }, [sectionId]);

  const formatDisplayDate = (d: string | null) => {
    if (!d) return "No Due Date";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? d
      : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const isPastDue = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDateStr).getTime() < today.getTime();
  };

  // Get unique subjects for dropdown
  const uniqueSubjects = Array.from(new Set(assignments.map((a) => a.subject.name)));

  const filteredAssignments = assignments.filter((item) => {
    // Subject filter
    if (selectedSubject !== "ALL" && item.subject.name !== selectedSubject) {
      return false;
    }

    const pastDue = isPastDue(item.dueDate);
    if (filterStatus === "UPCOMING") return !pastDue;
    if (filterStatus === "PAST_DUE") return pastDue;
    return true;
  });

  const upcomingCount = assignments.filter((a) => !isPastDue(a.dueDate)).length;
  const pastDueCount = assignments.filter((a) => isPastDue(a.dueDate)).length;

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
          <p className="page-subtitle">
            {activeChild
              ? `Homework tasks, syllabus notes, and study material for ${activeChild.fullName}`
              : "Homework tasks and class study materials"}
          </p>
        </div>

        {/* Child Selector if multiple children */}
        {children.length > 1 && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Child:</span>
            <select
              className="form-select"
              value={selectedChildIndex}
              onChange={(e) => setSelectedChildIndex(Number(e.target.value))}
              style={{ width: "auto" }}
            >
              {children.map((c, i) => (
                <option key={c.id} value={i}>{c.fullName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: "20px", padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          {/* Status Tabs: All, Upcoming, Past Due */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={`btn btn-sm ${filterStatus === "ALL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterStatus("ALL")}
            >
              All ({assignments.length})
            </button>
            <button
              className={`btn btn-sm ${filterStatus === "UPCOMING" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterStatus("UPCOMING")}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              className={`btn btn-sm ${filterStatus === "PAST_DUE" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterStatus("PAST_DUE")}
            >
              Past Due ({pastDueCount})
            </button>
          </div>

          {/* Subject Filter */}
          {uniqueSubjects.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={14} color="var(--text-muted)" />
              <select
                className="form-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{ width: "160px", fontSize: "12px", padding: "4px 8px" }}
              >
                <option value="ALL">All Subjects</option>
                {uniqueSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <div className="card empty-state" style={{ padding: "40px 20px" }}>
          <BookOpen size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <div className="empty-state-title">No Assignments Found</div>
          <p style={{ color: "var(--text-secondary)" }}>
            {filterStatus === "UPCOMING"
              ? "There are no pending upcoming assignments right now."
              : filterStatus === "PAST_DUE"
              ? "No past due assignments."
              : "No assignments or study notes have been posted for this class yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {filteredAssignments.map((item) => {
            const pastDue = isPastDue(item.dueDate);

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderLeft: `4px solid ${pastDue ? "var(--border-color)" : "#34d399"}`,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span className="badge badge-teal">{item.subject.name}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Teacher: <strong>{item.teacher.fullName}</strong>
                    </span>
                  </div>

                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px 0", color: "var(--text-primary)" }}>
                    {item.title}
                  </h3>

                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", marginBottom: "14px", lineHeight: "1.5" }}>
                    {item.description || "No specific instructions provided."}
                  </p>
                </div>

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
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} color={pastDue ? "var(--text-muted)" : "#34d399"} />
                    <span style={{ color: pastDue ? "var(--text-muted)" : "var(--text-primary)", fontWeight: pastDue ? 400 : 600 }}>
                      Due: {formatDisplayDate(item.dueDate)}
                    </span>
                    {pastDue && (
                      <span className="badge badge-warning" style={{ fontSize: "10.5px", padding: "2px 6px" }}>
                        Past Due
                      </span>
                    )}
                  </div>

                  {item.attachmentUrl && (
                    <a
                      href={item.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "4px 10px", fontSize: "12px", gap: "5px" }}
                    >
                      <Download size={13} />
                      <span>Download Attachment</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
