"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  School,
  ArrowRight,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  GraduationCap,
  CreditCard,
  HeartHandshake,
  CheckCircle2,
} from "lucide-react";

import { sanitizeCallbackUrl } from "@/lib/redirect";

const ROLE_DASHBOARDS: Record<string, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ADMIN: "/admin/dashboard",
  PRINCIPAL: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  PARENT: "/parent/dashboard",
  ACCOUNTANT: "/accountant/dashboard",
};

interface DemoAccount {
  label: string;
  role: string;
  email: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Admin",
    role: "ADMIN",
    email: "admin@dpa.edu.in",
    description: "Full school operations & setup",
    icon: ShieldCheck,
  },
  {
    label: "Teacher",
    role: "TEACHER",
    email: "ananya.sharma@dpa.edu.in",
    description: "Daily attendance & marks entry",
    icon: GraduationCap,
  },
  {
    label: "Accountant",
    role: "ACCOUNTANT",
    email: "accountant@dpa.edu.in",
    description: "Invoicing, fees & receipts",
    icon: CreditCard,
  },
  {
    label: "Parent",
    role: "PARENT",
    email: "parent.sharma@gmail.com",
    description: "Child attendance, grades & fees",
    icon: HeartHandshake,
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const urlError = searchParams.get("error");

  const initialError = urlError === "Configuration"
    ? "Server authentication configuration error. Please verify server environment variables."
    : urlError === "CredentialsSignin"
    ? "Invalid email address or password. Please verify credentials and try again."
    : urlError
    ? `Authentication error: ${urlError}`
    : "";

  const [email, setEmail] = useState("admin@dpa.edu.in");
  const [password, setPassword] = useState("password123");
  const [totpCode, setTotpCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  const handleSelectDemo = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword("password123");
    setTotpCode("");
    setMfaRequired(false);
    setSelectedRole(account.role);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        totpCode: totpCode.trim(),
      });

      if (result?.error) {
        if (result.error.includes("MFA_REQUIRED")) {
          setMfaRequired(true);
          setError("");
        } else if (result.error.includes("INVALID_MFA_CODE")) {
          setError("Invalid 6-digit authenticator code or recovery code. Please try again.");
        } else if (result.error.includes("RATE_LIMITED")) {
          setError("Too many login attempts. Please wait 5 minutes before trying again.");
        } else if (result.error.includes("SCHOOL_SUSPENDED")) {
          setError("Your school access has been suspended. Please contact platform administration.");
        } else if (result.error === "Configuration") {
          setError("Server authentication configuration error. Please verify server deployment environment variables.");
        } else {
          setError("Invalid email address or password. Please verify credentials and try again.");
        }
        setLoading(false);
        return;
      }

      // Check session or use callbackUrl
      let targetUrl = "/";
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionData = await sessionRes.json();
        if (sessionData?.user?.role && ROLE_DASHBOARDS[sessionData.user.role]) {
          targetUrl = ROLE_DASHBOARDS[sessionData.user.role];
        }
      } catch {
        // Fallback to default redirect
      }

      // Validate and sanitize callbackUrl to prevent open redirects
      targetUrl = sanitizeCallbackUrl(callbackUrl, targetUrl);

      // Clean document redirect ensures cookies are committed and layouts mount fresh
      window.location.href = targetUrl;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred during authentication.";
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-badge">
        <School size={28} color="#ffffff" />
      </div>

      <h1 className="login-title">SchoolERP Portal</h1>
      <p className="login-subtitle">
        Institutional School Management & Student Information System
      </p>

      {/* 1-Click Demo Credentials Selector */}
      <div style={{ marginBottom: "22px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          Select Demo Role to Pre-fill
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
          }}
        >
          {DEMO_ACCOUNTS.map((acc) => {
            const Icon = acc.icon;
            const isSelected = selectedRole === acc.role;
            return (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: isSelected
                    ? "2px solid var(--primary)"
                    : "1px solid var(--border-color)",
                  background: isSelected ? "var(--primary-light)" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    color: isSelected ? "var(--primary)" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: isSelected ? "var(--primary)" : "var(--text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {acc.label}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {acc.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={17} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email-input">
            Email Address
          </label>
          <div style={{ position: "relative" }}>
            <Mail
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              id="email-input"
              type="email"
              className="form-input"
              style={{ paddingLeft: "36px", width: "100%" }}
              placeholder="e.g. admin@dpa.edu.in"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSelectedRole("");
              }}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password-input">
            Password
          </label>
          <div style={{ position: "relative" }}>
            <Lock
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              id="password-input"
              type={showPassword ? "text" : "password"}
              className="form-input"
              style={{ paddingLeft: "36px", paddingRight: "36px", width: "100%" }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {mfaRequired && (
          <div className="form-group" style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="form-label" htmlFor="mfa-input" style={{ marginBottom: 0, color: "#1e3a8a", fontWeight: 600 }}>
                2-Step Authenticator Code
              </label>
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setTotpCode(""); setError(""); }}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
              >
                Back to password
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <ShieldCheck
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#2563eb",
                }}
              />
              <input
                id="mfa-input"
                type="text"
                className="form-input"
                style={{
                  paddingLeft: "36px",
                  width: "100%",
                  borderColor: "#3b82f6",
                  letterSpacing: "2px",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
                placeholder="6-digit code or recovery code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={14}
                autoFocus
                required
              />
            </div>
            <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
              Enter the code from Google Authenticator, 1Password, or an 8-character recovery code.
            </span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            width: "100%",
            marginTop: "10px",
            height: "42px",
            fontSize: "14px",
          }}
          disabled={loading}
        >
          {loading ? (
            "Authenticating..."
          ) : mfaRequired ? (
            <>
              <span>Verify & Sign In</span>
              <ShieldCheck size={16} />
            </>
          ) : (
            <>
              <span>Sign In to Workspace</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontSize: "13px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a
            href="/parent-signup"
            style={{
              color: "var(--brand-primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Parent Account Sign Up →
          </a>
          <a
            href="/request-access"
            style={{
              color: "var(--brand-primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Register School →
          </a>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "11.5px",
            color: "var(--text-muted)",
            marginTop: "6px",
          }}
        >
          <CheckCircle2 size={13} color="var(--success)" />
          <span>Public App Gateway • Multi-Tenant Isolated • Platform Protected</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-container">
      <Suspense fallback={<div className="loading">Loading School ERP...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
