"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartHandshake, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface ParentRegisterSuccess {
  message?: string;
  verificationToken?: string;
}

export default function ParentSignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ParentRegisterSuccess | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/parent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create parent account");
      }

      setSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", padding: "40px 16px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              backgroundColor: "var(--brand-primary)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <HeartHandshake size={24} />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
            Parent Account Sign Up
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
            Register to view your child&apos;s daily attendance, report cards, fee receipts, and school notices.
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "12px 16px",
              borderRadius: "8px",
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

        {success ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
              Account Verification Required
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              {success.message}
            </p>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Registered Email:</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
                {formData.email}
              </div>
              <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Verification Token:</div>
              <code
                style={{
                  display: "block",
                  padding: "8px 12px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                {success.verificationToken}
              </code>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link
                href={`/verify-email?type=parent&email=${encodeURIComponent(formData.email)}&token=${encodeURIComponent(success.verificationToken || "")}`}
                className="btn btn-primary"
                style={{ padding: "10px 20px", textDecoration: "none" }}
              >
                Verify & Activate Account →
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "28px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  className="form-input"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="parent@example.com"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Important: Use the same email provided to the school at the time of your child&apos;s admission to automatically link their records.
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                height: "42px",
                marginTop: "20px",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {loading ? "Creating Account..." : "Create Parent Account"}
              <ArrowRight size={16} />
            </button>

            <div style={{ marginTop: "16px", textAlign: "center", fontSize: "13px" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--brand-primary)", fontWeight: 500, textDecoration: "none" }}>
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
