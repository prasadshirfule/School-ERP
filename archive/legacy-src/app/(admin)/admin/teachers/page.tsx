"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Mail,
  Phone,
  School,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Lock,
  UserCheck,
  UserX,
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
    fetchTeachers();
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
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
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
    } catch (err: any) {
      setError(err.message || "Failed to update teacher status");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading teachers faculty...
      </div>
    );
  }

  const activeCount = teachers.filter((t) => t.isActive).length;
  const assignedCount = teachers.filter((t) => t.sections.length > 0).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers Directory</h1>
          <p className="page-subtitle">
            Manage teaching faculty profiles, class teacher allocations, and portal login credentials
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          <span>{showForm ? "Close Form" : "Add Teacher"}</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: "20px" }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Quick Add Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header">
            <h3 className="card-title">Add New Faculty Member</h3>
          </div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Full Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. Vikramaditya Singh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Email Address (Login Username) <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="e.g. teacher@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Initial Password <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Create Teacher Account</span>
                  </>
                )}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-teal">
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Faculty</span>
            <span className="stat-value">{teachers.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-emerald">
            <UserCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Teachers</span>
            <span className="stat-value" style={{ color: "#34d399" }}>
              {activeCount}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-indigo">
            <School size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Class Teachers Assigned</span>
            <span className="stat-value">{assignedCount}</span>
          </div>
        </div>
      </div>

      {/* Teachers Roster Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Teacher Name</th>
              <th>Email & Contact</th>
              <th>Assigned Class & Sections</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon-wrap">
                      <Users size={26} color="#2dd4bf" />
                    </div>
                    <div className="empty-state-title">No teachers registered yet</div>
                    <p className="empty-state-text">
                      Add teaching staff to assign class teachers and enable attendance marking.
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: "10px" }}
                      onClick={() => setShowForm(true)}
                    >
                      <Plus size={14} />
                      <span>Add First Teacher</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              teachers.map((t) => {
                const isToggling = togglingId === t.id;
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "10px",
                            background: "var(--role-teacher-light)",
                            color: "#2dd4bf",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "14px",
                          }}
                        >
                          {t.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {t.fullName}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            ID: {t.id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                          <Mail size={12} color="var(--text-muted)" />
                          <span>{t.email}</span>
                        </div>
                        {t.phone && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            <Phone size={12} />
                            <span>{t.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {t.sections.length === 0 ? (
                        <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                          No section assigned
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {t.sections.map((sec) => (
                            <span key={sec.id} className="badge badge-teal" style={{ fontSize: "11.5px" }}>
                              <span className="badge-dot" />
                              <span>
                                {sec.className} — {sec.name}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.isActive ? (
                        <span className="badge badge-success">
                          <span className="badge-dot" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <span className="badge-dot" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className={`btn btn-sm ${t.isActive ? "btn-secondary" : "btn-primary"}`}
                        onClick={() => handleToggleStatus(t)}
                        disabled={isToggling}
                        style={{ height: "30px", fontSize: "12px", padding: "0 10px" }}
                      >
                        {isToggling ? (
                          <Sparkles size={12} className="animate-spin" />
                        ) : t.isActive ? (
                          <>
                            <UserX size={12} />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} />
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
