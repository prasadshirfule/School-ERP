"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { School, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

const ROLE_DASHBOARDS: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  PRINCIPAL: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  PARENT: "/parent/dashboard",
  ACCOUNTANT: "/accountant/dashboard",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError("Invalid email address or password. Please try again.");
      setLoading(false);
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role || "ADMIN";
    router.push(ROLE_DASHBOARDS[role] || "/admin/dashboard");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-badge">
          <School size={26} color="white" />
        </div>
        <div className="login-title">Welcome to SchoolERP</div>
        <p className="login-subtitle">Sign in to manage classes, students & records</p>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="e.g. admin@greenfield.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "8px", height: "42px", fontSize: "14px" }}
            disabled={loading}
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
            <Sparkles size={13} color="#818cf8" />
            <span>Demo: <strong style={{ color: "var(--text-secondary)" }}>admin@greenfield.edu</strong> / <strong style={{ color: "var(--text-secondary)" }}>password123</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
