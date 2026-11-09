"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function SuperAdminMfaSetupPage() {
  const [statusLoading, setStatusLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [remainingCodes, setRemainingCodes] = useState(0);

  // Setup state
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpAuthUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Disable state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/super-admin/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.mfaEnabled);
        setEmail(data.email);
        setRemainingCodes(data.remainingRecoveryCodes);
      }
    } catch {
      // Ignore
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadStatus() {
      try {
        const res = await fetch("/api/super-admin/mfa");
        if (!ignore && res.ok) {
          const data = await res.json();
          setMfaEnabled(data.mfaEnabled);
          setEmail(data.email);
          setRemainingCodes(data.remainingRecoveryCodes);
        }
      } catch {
        // Ignore
      } finally {
        if (!ignore) {
          setStatusLoading(false);
        }
      }
    }
    loadStatus();
    return () => {
      ignore = true;
    };
  }, []);

  const handleStartSetup = async () => {
    setSetupLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/super-admin/mfa", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSetupData({
          secret: data.secret,
          otpAuthUrl: data.otpAuthUrl,
          recoveryCodes: data.recoveryCodes,
        });
      } else {
        setError(data.error || "Failed to initialize MFA setup");
      }
    } catch {
      setError("Network error initializing MFA setup");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifyAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/super-admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Multi-Factor Authentication has been successfully activated!");
        setMfaEnabled(true);
        setSetupData(null);
        setVerifyCode("");
        fetchStatus();
      } else {
        setError(data.error || "Failed to activate MFA");
      }
    } catch {
      setError("Network error activating MFA");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableCode) {
      setError("Password and 6-digit code are required.");
      return;
    }

    setDisabling(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/mfa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("MFA has been disabled.");
        setDisableModalOpen(false);
        setDisablePassword("");
        setDisableCode("");
        fetchStatus();
      } else {
        setError(data.error || "Failed to disable MFA");
      }
    } catch {
      setError("Network error disabling MFA");
    } finally {
      setDisabling(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/super-admin/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "#64748b",
            textDecoration: "none",
            marginBottom: "12px",
          }}
        >
          <ArrowLeft size={14} /> Back to Super Admin Dashboard
        </Link>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Platform Admin Multi-Factor Authentication (MFA)
        </h1>
        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
          Mandatory two-factor security for Super Admin platform governance
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#b91c1c",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            color: "#15803d",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Status Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: mfaEnabled ? "#ecfdf5" : "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: mfaEnabled ? "#059669" : "#ea580c",
              }}
            >
              {mfaEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                {statusLoading
                  ? "Checking status..."
                  : mfaEnabled
                  ? "MFA Protection Active"
                  : "MFA Not Configured"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                Account: {email || "Super Admin"}
                {mfaEnabled && ` • ${remainingCodes} recovery code(s) remaining`}
              </div>
            </div>
          </div>

          <div>
            {!statusLoading && (
              <>
                {mfaEnabled ? (
                  <button
                    onClick={() => setDisableModalOpen(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                  >
                    Disable MFA
                  </button>
                ) : (
                  <button
                    onClick={handleStartSetup}
                    disabled={setupLoading}
                    style={{
                      padding: "9px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#2563eb",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {setupLoading ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                    <span>Begin MFA Setup</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Setup Wizard */}
      {setupData && !mfaEnabled && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #3b82f6",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(37,99,235,0.08)",
          }}
        >
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1e3a8a", marginBottom: "16px" }}>
            Step 1: Configure Authenticator App
          </h2>

          <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, marginBottom: "16px" }}>
            Open Google Authenticator, Microsoft Authenticator, 1Password, or any RFC 6238 compatible app. Select
            <strong> Add Account</strong> &gt; <strong>Enter setup key</strong>, and paste the key below:
          </p>

          {/* Secret Key Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f1f5f9",
              padding: "12px 16px",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "1px",
              color: "#0f172a",
              marginBottom: "20px",
            }}
          >
            <span>{setupData.secret}</span>
            <button
              onClick={() => copyToClipboard(setupData.secret, setCopiedKey)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                border: "none",
                background: "#ffffff",
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#2563eb",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey ? "Copied" : "Copy Key"}</span>
            </button>
          </div>

          {/* Recovery Codes Section */}
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1e3a8a", marginBottom: "8px" }}>
            Step 2: Save Emergency Recovery Codes
          </h2>
          <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
            If you ever lose access to your authenticator phone, each of these 8 codes can be used once as a backup login code. Store them in your secure password manager now:
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            {setupData.recoveryCodes.map((code, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "monospace",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                {i + 1}. {code}
              </div>
            ))}
          </div>

          <button
            onClick={() => copyToClipboard(setupData.recoveryCodes.join("\n"), setCopiedCodes)}
            style={{
              padding: "7px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
              marginBottom: "24px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {copiedCodes ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCodes ? "Copied All Codes!" : "Copy All Recovery Codes"}</span>
          </button>

          {/* Verification Code Input */}
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1e3a8a", marginBottom: "8px" }}>
            Step 3: Confirm 6-Digit Code
          </h2>
          <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
            Enter the 6-digit number shown on your authenticator app to verify setup and activate protection:
          </p>

          <form onSubmit={handleVerifyAndActivate} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="e.g. 123456"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              style={{
                padding: "10px 14px",
                border: "2px solid #3b82f6",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "3px",
                width: "160px",
                textAlign: "center",
                outline: "none",
              }}
              required
            />
            <button
              type="submit"
              disabled={verifying}
              style={{
                padding: "11px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {verifying ? "Verifying..." : "Verify & Enable MFA"}
            </button>
          </form>
        </div>
      )}

      {/* Disable Modal */}
      {disableModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#dc2626", marginBottom: "8px" }}>
              Disable Multi-Factor Authentication
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", lineHeight: 1.4 }}>
              Disabling MFA reduces your Super Admin account security. Enter your password and current 6-digit authenticator code to proceed.
            </p>

            <form onSubmit={handleDisableMfa}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your account password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "15px",
                    letterSpacing: "2px",
                    fontWeight: 700,
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setDisableModalOpen(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {disabling ? "Disabling..." : "Confirm Disable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
