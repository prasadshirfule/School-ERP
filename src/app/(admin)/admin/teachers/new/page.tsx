"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

export default function NewTeacherPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Full name, email address, and temporary password are required.");
      return;
    }

    if (password.length < 6) {
      setError("Temporary password must be at least 6 characters.");
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
        setError(data.error || "Failed to create teacher account.");
        setSubmitting(false);
        return;
      }

      setSuccess(`Teacher account for ${fullName} created successfully! Redirecting...`);
      setTimeout(() => {
        router.push("/admin/teachers");
      }, 1200);
    } catch {
      setError("Network error while creating teacher account.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <Link href="/admin/dashboard">Admin</Link>
        <span className="breadcrumb-separator">/</span>
        <Link href="/admin/teachers">Teachers</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Add Teacher</span>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">Add New Faculty Member</h1>
          <p className="page-subtitle">
            Register a new teacher profile and provision their portal login credentials.
          </p>
        </div>
        <Link href="/admin/teachers" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </Link>
      </div>

      {/* Alert Messages */}
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

      {/* Form Card */}
      <div className="card" style={{ maxWidth: "720px", padding: "24px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div className="form-group">
              <label className="form-label">
                Full Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  style={{ paddingLeft: "36px" }}
                  placeholder="e.g. Vikramaditya Singh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <User
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Email Address (Login Username) <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: "36px" }}
                  placeholder="e.g. v.singh@school.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
              </div>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                The teacher will use this email address to log in to their faculty portal.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number</label>
              <div style={{ position: "relative" }}>
                <input
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: "36px" }}
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Phone
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Initial Portal Password <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: "36px" }}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
              </div>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Provide a temporary password for first-time login.
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                marginTop: "12px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ padding: "10px 24px" }}
              >
                <Save size={16} />
                <span>{submitting ? "Creating Account..." : "Create Teacher Account"}</span>
              </button>
              <Link href="/admin/teachers" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
