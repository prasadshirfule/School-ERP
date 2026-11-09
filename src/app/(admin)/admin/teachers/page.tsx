"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Plus,
  Mail,
  Phone,
  School,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  UserX,
  Search,
  X,
} from "lucide-react";

type TeacherData = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  sections: { id: string; name: string; className: string; academicYear: string }[];
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers?all=true");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (err) {
      console.error("Failed to load teachers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch("/api/teachers?all=true")
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) {
          setTeachers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Full name, email, and password are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create teacher");
        setSubmitting(false);
        return;
      }

      setSuccess(`Teacher account for ${fullName} created successfully!`);
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setShowForm(false);
      fetchTeachers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (teacher: TeacherData) => {
    setTogglingId(teacher.id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          isActive: !teacher.isActive,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTeachers((prev) =>
          prev.map((t) => (t.id === teacher.id ? { ...t, isActive: updated.isActive } : t))
        );
        setSuccess(
          `Teacher ${teacher.fullName} is now ${updated.isActive ? "active" : "deactivated"}.`
        );
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update teacher status");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update teacher status");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q))
    );
  }, [teachers, searchQuery]);

  if (loading) {
    return (
      <div className="office-page-container" style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "15px" }}>
          <Sparkles size={20} className="animate-spin" color="#1e3a8a" />
          <span>Loading teachers faculty directory...</span>
        </div>
      </div>
    );
  }

  const activeCount = teachers.filter((t) => t.isActive).length;
  const assignedCount = teachers.filter((t) => t.sections.length > 0).length;

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Teachers Directory</h1>
          <p className="office-subtitle">
            Manage teaching faculty profiles, class teacher allocations, and portal credentials
          </p>
        </div>
        <div className="office-actions-bar">
          <button
            className="office-btn office-btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showForm ? "Cancel Form" : "Add Teacher"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13.5px",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13.5px",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* ─── Add Teacher Form ─── */}
      {showForm && (
        <div className="office-card" style={{ border: "2px solid #bfdbfe", background: "#f8fafc" }}>
          <div className="office-card-header">
            <h3 className="office-card-title">Register New Faculty Member</h3>
          </div>
          <form onSubmit={handleCreate}>
            <div className="office-form-grid-2">
              <div className="office-form-group">
                <label className="office-form-label">
                  Full Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vikramaditya Singh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>
              <div className="office-form-group">
                <label className="office-form-label">
                  Email Address (Login Username) <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. teacher@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>
            </div>

            <div className="office-form-grid-2">
              <div className="office-form-group">
                <label className="office-form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="office-form-group">
                <label className="office-form-label">
                  Initial Password <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button className="office-btn office-btn-primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Create Faculty Account</span>
                  </>
                )}
              </button>
              <button
                className="office-btn office-btn-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Metric Highlights ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Faculty</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{teachers.length}</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Active Teachers</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>{activeCount}</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#f8fafc",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <School size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Class Teachers Assigned</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{assignedCount}</div>
          </div>
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div className="office-search-wrapper" style={{ flex: 1, minWidth: "240px", maxWidth: "380px" }}>
          <Search size={16} className="office-search-icon" />
          <input
            type="text"
            placeholder="Search teacher by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="office-input office-search-input"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ fontSize: "13px", color: "#64748b" }}>
          Showing <strong>{filteredTeachers.length}</strong> of {teachers.length} teachers
        </div>
      </div>

      {/* ─── Teachers Table ─── */}
      <div className="office-table-wrapper">
        <table className="office-table">
          <thead>
            <tr>
              <th>Teacher Name</th>
              <th>Email & Contact</th>
              <th>Assigned Class Sections</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ maxWidth: "360px", margin: "0 auto" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "#eff6ff",
                        color: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                      }}
                    >
                      <Users size={24} />
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                      {searchQuery ? "No matching teachers found" : "No teachers registered yet"}
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                      {searchQuery
                        ? `No teacher matches "${searchQuery}". Please check the spelling.`
                        : "Register teachers to assign classroom periods and manage attendance."}
                    </p>
                    <button
                      className="office-btn office-btn-primary office-btn-sm"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus size={14} />
                      <span>Add First Teacher</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTeachers.map((t) => {
                const isToggling = togglingId === t.id;
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "#eff6ff",
                            color: "#1e3a8a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "13.5px",
                            flexShrink: 0,
                          }}
                        >
                          {t.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{t.fullName}</div>
                          <div style={{ fontSize: "11.5px", color: "#64748b", fontFamily: "monospace" }}>
                            ID: {t.id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#334155" }}>
                          <Mail size={13} color="#64748b" />
                          <span>{t.email}</span>
                        </div>
                        {t.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
                            <Phone size={12} color="#64748b" />
                            <span>{t.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {t.sections.length === 0 ? (
                        <span style={{ fontSize: "12.5px", color: "#94a3b8" }}>No class assigned</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                          {t.sections.map((sec) => (
                            <span key={sec.id} className="office-pill office-pill-blue">
                              {sec.className} — {sec.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.isActive ? (
                        <span className="office-pill office-pill-green">Active</span>
                      ) : (
                        <span className="office-pill office-pill-red">Inactive</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className={`office-btn office-btn-sm ${t.isActive ? "office-btn-secondary" : "office-btn-primary"}`}
                        onClick={() => handleToggleStatus(t)}
                        disabled={isToggling}
                      >
                        {isToggling ? (
                          <Sparkles size={12} className="animate-spin" />
                        ) : t.isActive ? (
                          <>
                            <UserX size={13} />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
