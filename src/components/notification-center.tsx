"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, CheckCircle2, AlertCircle, Info, Clock } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl?: string | null;
  link?: string | null;
  isRead?: boolean;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let ignore = false;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setNotifications(data.notifications || []);
          }
        }
      } catch {}
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt && !n.isRead).length;

  const markRead = async (id: string, linkTarget?: string | null) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    if (linkTarget) {
      setOpen(false);
      router.push(linkTarget);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "SUCCESS": return <CheckCircle2 size={16} color="#059669" />;
      case "WARNING": return <AlertCircle size={16} color="#d97706" />;
      case "ERROR": return <AlertCircle size={16} color="#dc2626" />;
      default: return <Info size={16} color="#1e3a8a" />;
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px",
          borderRadius: "8px",
          color: "#64748b",
        }}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              backgroundColor: "#dc2626",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "42px",
            right: "0",
            width: "360px",
            maxHeight: "440px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1e3a8a",
                    textDecoration: "underline",
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                <Bell size={28} style={{ margin: "0 auto 8px" }} />
                <div>No notifications yet</div>
              </div>
            ) : (
              notifications.map((n) => {
                const targetLink = n.linkUrl || n.link;
                const isItemRead = Boolean(n.readAt || n.isRead);
                return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id, targetLink)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    gap: "10px",
                    cursor: targetLink ? "pointer" : "default",
                    backgroundColor: isItemRead ? "#fff" : "#f8fafc",
                    transition: "background-color 0.15s",
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: "2px" }}>{getIcon(n.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: isItemRead ? 500 : 700,
                        fontSize: "13px",
                        color: "#0f172a",
                        marginBottom: "2px",
                      }}
                    >
                      {n.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                      {n.message}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        marginTop: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Clock size={11} />
                      <span>{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                  {!isItemRead && (
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#1e3a8a",
                        flexShrink: 0,
                        marginTop: "6px",
                      }}
                    />
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
