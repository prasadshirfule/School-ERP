"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Plus, AlertCircle, Sparkles, Send, X, Users, Calendar } from "lucide-react";
import { formatDate } from "@/lib/formatDate";

type Notice = {
  id: string;
  title: string;
  body: string;
  audience: string[];
  createdAt: string;
};

const ROLES = [
  { key: "TEACHER", label: "Teachers & Staff" },
  { key: "PARENT", label: "Parents & Guardians" },
  { key: "ACCOUNTANT", label: "Accounts Team" },
  { key: "PRINCIPAL", label: "Principal & Headmaster" },
  { key: "ADMIN", label: "School Office" },
];

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<string[]>(["TEACHER", "PARENT"]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/notices");
      if (res.ok) {
        setNotices(await res.json());
      }
    } catch (err) {
      console.error("Failed to load notices", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/notices");
        if (res.ok && !ignore) {
          setNotices(await res.json());
        }
      } catch (err) {
        console.error("Failed to load notices", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const toggleRole = (role: string) => {
    setAudience((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (audience.length === 0) {
      setError("Please select at least one recipient audience group.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, audience }),
      });

      setSubmitting(false);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to publish notice");
        return;
      }

      setShowForm(false);
      setTitle("");
      setBody("");
      setAudience(["TEACHER", "PARENT"]);
      fetchNotices();
    } catch (err: unknown) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : "Failed to publish notice";
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
        <div style={{ color: "#64748b", fontSize: "14px" }}>Loading notice board circulars...</div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">School Notice Board</h1>
          <p className="office-subtitle">
            Broadcast official circulars, event announcements, and notifications to school staff and parents
          </p>
        </div>
        <div className="office-actions-bar">
          <button
            className="office-btn office-btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showForm ? "Cancel" : "Compose Notice"}</span>
          </button>
        </div>
      </div>

      {/* ─── Compose Notice Form ─── */}
      {showForm && (
        <div className="office-card" style={{ border: "2px solid #bfdbfe", background: "#f8fafc" }}>
          <div className="office-card-header">
            <h3 className="office-card-title">Compose Broadcast Circular</h3>
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "14px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate}>
            <div className="office-form-group">
              <label className="office-form-label">
                Notice Title / Headline <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                className="office-input"
                style={{ width: "100%" }}
                placeholder="e.g. Schedule for Annual Sports Day & Parent Invitations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="office-form-group">
              <label className="office-form-label">
                Notice Message & Details <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                className="office-input"
                style={{ width: "100%", height: "100px", resize: "vertical" }}
                placeholder="Full notice content, guidelines, dates, and instructions for recipients..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            <div className="office-form-group">
              <label className="office-form-label">Target Audience Roles</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}>
                {ROLES.map((r) => {
                  const isChecked = audience.includes(r.key);
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => toggleRole(r.key)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${isChecked ? "#1e3a8a" : "#cbd5e1"}`,
                        background: isChecked ? "#eff6ff" : "#ffffff",
                        color: isChecked ? "#1e3a8a" : "#475569",
                        fontWeight: isChecked ? 600 : 500,
                        fontSize: "12.5px",
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                      }}
                    >
                      {isChecked ? "✓ " : ""}{r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="submit"
                disabled={submitting}
                className="office-btn office-btn-primary"
              >
                <Send size={14} />
                <span>{submitting ? "Publishing..." : "Publish Circular"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="office-btn office-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Notice Feed ─── */}
      {notices.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <Megaphone size={36} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Notice Board is Empty</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 16px 0" }}>
            Publish your first school circular to announce upcoming events, examinations, or holidays.
          </p>
          <button className="office-btn office-btn-primary office-btn-sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            <span>Compose Notice</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {notices.map((n) => (
            <div key={n.id} className="office-card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px 0" }}>
                    {n.title}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
                    <Calendar size={13} />
                    <span>Published: {formatDate(n.createdAt)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {n.audience.map((aud) => (
                    <span key={aud} className="office-pill office-pill-blue">
                      {aud}
                    </span>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: "13.5px", color: "#334155", margin: "14px 0 0 0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {n.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
