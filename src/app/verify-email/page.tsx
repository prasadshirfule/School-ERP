"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, ArrowRight, Mail } from "lucide-react";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "parent" ? "parent" : "school";
  const initialEmail = searchParams.get("email") || "";
  const initialToken = searchParams.get("token") || "";

  const [type, setType] = useState<"school" | "parent">(initialType);
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = type === "parent" ? "/api/parent/verify-email" : "/api/schools/verify-email";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token: token.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setSuccess(data.message || "Email verified successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
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
          <Mail size={24} />
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
          Verify Your Email
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          Confirm your email verification token to activate your account.
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
            Verification Complete
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
            {success}
          </p>

          <Link
            href="/login"
            className="btn btn-primary"
            style={{ padding: "10px 24px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <span>Proceed to Login</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleVerify}
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
                Account Type
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="accountType"
                    value="school"
                    checked={type === "school"}
                    onChange={() => setType("school")}
                  />
                  School Registration
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="accountType"
                    value="parent"
                    checked={type === "parent"}
                    onChange={() => setType("parent")}
                  />
                  Parent Account
                </label>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                Verification Token *
              </label>
              <input
                type="text"
                required
                placeholder="Paste your verification token here"
                className="form-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
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
            {loading ? "Verifying Token..." : "Verify & Confirm"}
            <ArrowRight size={16} />
          </button>

          <div style={{ marginTop: "16px", textAlign: "center", fontSize: "13px" }}>
            <Link href="/login" style={{ color: "var(--brand-primary)", fontWeight: 500, textDecoration: "none" }}>
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", padding: "40px 16px" }}>
      <Suspense fallback={<div style={{ textAlign: "center", padding: "40px" }}>Loading verification portal...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
