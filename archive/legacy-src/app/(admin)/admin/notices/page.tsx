"use client";

import { useEffect, useState } from "react";
import { Megaphone, Plus, AlertCircle, Sparkles, Send } from "lucide-react";
import { formatDate } from "@/lib/formatDate";

type Notice = {
  id: string;
  title: string;
  body: string;
  audience: string[];
  createdAt: string;
};

const ROLES = ["ADMIN", "TEACHER", "PARENT", "ACCOUNTANT", "PRINCIPAL"];

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<string[]>([]);
  const [error, setError] = useState("");

  const fetchNotices = async () => {
    const res = await fetch("/api/notices");
    setNotices(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchNotices(); }, []);

  const toggleRole = (role: string) => {
    setAudience((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (audience.length === 0) {
      setError("Please select at least one recipient audience role.");
      return;
    }
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, audience }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to publish notice");
      return;
    }
    setShowForm(false);
    setTitle("");
    setBody("");
    setAudience([]);
    fetchNotices();
  };

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading notices...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notice Board</h1>
          <p className="page-subtitle">Broadcast circulars, event updates, and news to teachers, staff, and parents</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          <span>{showForm ? "Close Form" : "Compose Notice"}</span>
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header">
            <h3 className="card-title">Create New Broadcast Notice</h3>
          </div>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Notice Headline</label>
              <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Schedule for Upcoming Parent-Teacher Meeting" required />
            </div>
            <div className="form-group">
              <label className="form-label">Notice Body & Details</label>
              <textarea className="form-textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Provide full information, dates, instructions..." required />
            </div>
            <div className="form-group">
              <label className="form-label">Target Audience Roles</label>
              <div className="checkbox-group">
                {ROLES.map((role) => (
                  <label key={role} className="checkbox-label">
                    <input type="checkbox" checked={audience.includes(role)} onChange={() => toggleRole(role)} />
                    <span>{role}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button className="btn btn-primary" type="submit">
                <Send size={15} />
                <span>Publish Announcement</span>
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {notices.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon-wrap">
                <Megaphone size={26} color="#fb7185" />
              </div>
              <div className="empty-state-title">No notices published yet</div>
              <p className="empty-state-text">Publish your first broadcast to keep parents and school staff informed.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: "10px" }} onClick={() => setShowForm(true)}>
                <Plus size={14} />
                <span>Publish Notice</span>
              </button>
            </div>
          </div>
        ) : (
          notices.map((n) => (
            <div key={n.id} className="card">
              <div className="card-header" style={{ marginBottom: "12px" }}>
                <h3 className="card-title" style={{ fontSize: "16px" }}>{n.title}</h3>
                <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                  {formatDate(n.createdAt)}
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.65, marginBottom: "16px", whiteSpace: "pre-wrap" }}>
                {n.body}
              </p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginRight: "4px" }}>Audience:</span>
                {n.audience.map((role) => (
                  <span key={role} className="badge badge-info">
                    <span className="badge-dot" />
                    <span>{role}</span>
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
