"use client";

import { useEffect, useState } from "react";
import { Megaphone, Sparkles, Calendar, Bell } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  body: string;
  audience: string[];
  createdAt: string;
}

export default function ParentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notices?role=PARENT")
      .then((r) => r.json())
      .then((data) => {
        setNotices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading school circulars & notices...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">School Circulars & Notices</h1>
          <p className="page-subtitle">Official announcements, upcoming event schedules, and holiday circulars from school administration.</p>
        </div>
      </div>

      {notices.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <Megaphone size={26} color="#fb7185" />
            </div>
            <div className="empty-state-title">No Active Circulars</div>
            <p className="empty-state-text">
              There are no notices published for parents at this moment.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {notices.map((n) => {
            const dateObj = new Date(n.createdAt);
            return (
              <div key={n.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        background: "rgba(251, 113, 133, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Bell size={18} color="#fb7185" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{n.title}</h3>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={14} />
                    {dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>

                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {n.body}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
