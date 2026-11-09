"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Activity,
  FileText,
  Ban,
  Check,
} from "lucide-react";

interface SchoolData {
  id: string;
  name: string;
  boardType: string;
  email: string | null;
  phone: string | null;
  principalName: string | null;
  affiliationNumber: string | null;
  status: string;
  isActive: boolean;
  suspendedReason: string | null;
  createdAt: string;
  studentCount: number;
  staffCount: number;
  classCount: number;
  subscription?: {
    id: string;
    status: string;
    planName: string;
    trialEndsAt: string;
    currentPeriodEnd: string;
  } | null;
}

interface RegistrationRequest {
  id: string;
  schoolName: string;
  boardType: string;
  officialEmail: string;
  phone: string;
  principalName: string;
  affiliationNo: string | null;
  adminName: string;
  adminEmail: string;
  adminPhone: string | null;
  status: string;
  emailVerifiedAt: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  schoolId: string | null;
  userEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
}

export default function SuperAdminDashboardPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [mfaStatus, setMfaStatus] = useState<{ mfaEnabled: boolean; remainingRecoveryCodes?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schoolsRes, requestsRes, auditRes, mfaRes] = await Promise.all([
        fetch("/api/super-admin/schools"),
        fetch("/api/super-admin/requests"),
        fetch("/api/super-admin/audit-logs?limit=25"),
        fetch("/api/super-admin/mfa"),
      ]);

      if (schoolsRes.ok) {
        const data = await schoolsRes.json();
        setSchools(data.schools || []);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
      if (mfaRes.ok) {
        const mfaData = await mfaRes.json();
        setMfaStatus({
          mfaEnabled: !!mfaData.mfaEnabled,
          remainingRecoveryCodes: mfaData.remainingRecoveryCodes,
        });
      }
    } catch (err) {
      console.error("Failed to load super admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [schoolsRes, requestsRes, auditRes, mfaRes] = await Promise.all([
          fetch("/api/super-admin/schools"),
          fetch("/api/super-admin/requests"),
          fetch("/api/super-admin/audit-logs?limit=25"),
          fetch("/api/super-admin/mfa"),
        ]);

        if (!ignore && schoolsRes.ok) {
          const data = await schoolsRes.json();
          setSchools(data.schools || []);
        }
        if (!ignore && requestsRes.ok) {
          const data = await requestsRes.json();
          setRequests(data.requests || []);
        }
        if (!ignore && auditRes.ok) {
          const data = await auditRes.json();
          setAuditLogs(data.logs || []);
        }
        if (!ignore && mfaRes.ok) {
          const mfaData = await mfaRes.json();
          setMfaStatus({
            mfaEnabled: !!mfaData.mfaEnabled,
            remainingRecoveryCodes: mfaData.remainingRecoveryCodes,
          });
        }
      } catch (err) {
        console.error("Failed to load super admin data", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleApprove = async (id: string, schoolName: string) => {
    if (!confirm(`Are you sure you want to approve registration for "${schoolName}"? This will create their tenant school and activate the school administrator account.`)) {
      return;
    }

    setProcessingId(id);
    setNotification(null);
    try {
      const res = await fetch(`/api/super-admin/requests/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve request");

      setNotification({
        type: "success",
        message: `Successfully approved "${schoolName}". School tenant and administrator are now active.`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to approve request",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, schoolName: string) => {
    const reason = prompt(`Enter reason for rejecting "${schoolName}":`, "Institution does not meet verification requirements");
    if (reason === null) return;

    setProcessingId(id);
    setNotification(null);
    try {
      const res = await fetch(`/api/super-admin/requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject request");

      setNotification({
        type: "success",
        message: `Rejected registration request for "${schoolName}".`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to reject request",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleSuspension = async (school: SchoolData) => {
    const isCurrentlySuspended = school.status === "SUSPENDED" || !school.isActive;
    const action = isCurrentlySuspended ? "REINSTATE" : "SUSPEND";
    let reason = "Administrative decision";

    if (!isCurrentlySuspended) {
      const inputReason = prompt(`Enter reason for suspending "${school.name}":`, "Payment dispute / compliance audit");
      if (inputReason === null) return;
      reason = inputReason;
    } else {
      if (!confirm(`Are you sure you want to reinstate "${school.name}"? All teachers, accountants and parents will regain access immediately.`)) {
        return;
      }
    }

    setProcessingId(school.id);
    setNotification(null);
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update school status");

      setNotification({
        type: "success",
        message: `Successfully ${isCurrentlySuspended ? "reinstated" : "suspended"} "${school.name}".`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update school status",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleExtendTrial = async (schoolId: string, schoolName: string) => {
    if (!confirm(`Extend 30-day trial for "${schoolName}"?`)) return;
    setProcessingId(schoolId);
    setNotification(null);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EXTEND_TRIAL", schoolId, days: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend trial");
      setNotification({
        type: "success",
        message: `Successfully extended trial for "${schoolName}" by 30 days.`,
      });
      await fetchData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to extend trial",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(schoolSearch.toLowerCase())) ||
      (s.principalName && s.principalName.toLowerCase().includes(schoolSearch.toLowerCase()))
  );

  const activeSchoolsCount = schools.filter((s) => s.status === "APPROVED" && s.isActive).length;
  const suspendedSchoolsCount = schools.filter((s) => s.status === "SUSPENDED" || !s.isActive).length;
  const totalStudentsCount = schools.reduce((acc, s) => acc + s.studentCount, 0);

  return (
    <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span
              style={{
                backgroundColor: "var(--brand-primary)",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              PLATFORM OWNER
            </span>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Platform Super Admin Control Center
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
            Multi-school tenant governance, school registration approvals, account suspension, and platform audit trail.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Mandatory MFA Alert Banner for Un-enrolled Super Admins */}
      {!loading && mfaStatus && !mfaStatus.mfaEnabled && (
        <div
          style={{
            marginBottom: "24px",
            padding: "16px 20px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#FEE2E2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#DC2626",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: "#991B1B" }}>
                Mandatory Multi-Factor Authentication (MFA) Setup Required
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#B91C1C", lineHeight: 1.5 }}>
                Your Platform Super Admin account does not have TOTP MFA activated. To protect school isolation and platform controls, please enroll your authenticator app (Google Authenticator, Authy) now.
              </p>
            </div>
          </div>
          <a
            href="/super-admin/mfa-setup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "#DC2626",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <ShieldCheck size={16} />
            <span>Enroll MFA Authenticator</span>
          </a>
        </div>
      )}

      {/* Active MFA Protected Status Banner */}
      {!loading && mfaStatus && mfaStatus.mfaEnabled && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px 16px",
            borderRadius: "8px",
            backgroundColor: "#F0FDF4",
            border: "1px solid #BBF7D0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534" }}>
            <ShieldCheck size={16} />
            <span>Platform Super Admin account is protected by TOTP Multi-Factor Authentication.</span>
          </div>
          <a
            href="/super-admin/mfa-setup"
            style={{
              color: "#15803D",
              fontWeight: 600,
              textDecoration: "underline",
              fontSize: "12.5px",
            }}
          >
            Manage MFA & Recovery Codes ({mfaStatus.remainingRecoveryCodes ?? 0} remaining)
          </a>
        </div>
      )}

      {notification && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: notification.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${notification.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: notification.type === "success" ? "#065f46" : "#b91c1c",
          }}
        >
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total Registered Schools
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--brand-primary)", marginTop: "6px" }}>
            {schools.length}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Institutions in database
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Pending Registration Requests
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: pendingRequests.length > 0 ? "#d97706" : "var(--text-primary)", marginTop: "6px" }}>
            {pendingRequests.length}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Awaiting owner approval
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Active Schools
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#059669", marginTop: "6px" }}>
            {activeSchoolsCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Operating normally
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Suspended Schools
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: suspendedSchoolsCount > 0 ? "#dc2626" : "var(--text-muted)", marginTop: "6px" }}>
            {suspendedSchoolsCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Access blocked
          </div>
        </div>
      </div>

      {/* Section 1: Pending School Registration Requests */}
      <div id="requests" className="card" style={{ padding: "20px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-primary)" }}>
              Pending School Registration Requests
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
              Schools that requested platform access. Approving creates their tenant and activates the school administrator account.
            </p>
          </div>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: pendingRequests.length > 0 ? "#fef3c7" : "#f1f5f9",
              color: pendingRequests.length > 0 ? "#92400e" : "var(--text-muted)",
            }}
          >
            {pendingRequests.length} Pending
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13.5px" }}>
            <CheckCircle2 size={32} style={{ margin: "0 auto 8px auto", color: "#10b981" }} />
            <div>No pending registration requests. All applicant schools have been reviewed.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "10px 12px" }}>School Name & Board</th>
                  <th style={{ padding: "10px 12px" }}>Principal & Phone</th>
                  <th style={{ padding: "10px 12px" }}>School Admin Applicant</th>
                  <th style={{ padding: "10px 12px" }}>Email Status</th>
                  <th style={{ padding: "10px 12px" }}>Requested On</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{req.schoolName}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Board: {req.boardType} • Email: {req.officialEmail}
                      </div>
                      {req.documentUrl && (
                        <div style={{ marginTop: "4px" }}>
                          <a
                            href={req.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11.5px",
                              color: "var(--brand-primary)",
                              fontWeight: 600,
                              textDecoration: "underline",
                            }}
                          >
                            <FileText size={12} />
                            <span>{req.documentName || "Verification Document"}</span>
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{req.principalName}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{req.phone}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 500 }}>{req.adminName}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{req.adminEmail}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {req.emailVerifiedAt ? (
                        <span style={{ color: "#059669", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Check size={14} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: "#d97706", fontSize: "12px" }}>Pending Verification</span>
                      )}
                    </td>
                    <td style={{ padding: "12px", color: "var(--text-muted)" }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          onClick={() => handleApprove(req.id, req.schoolName)}
                          disabled={processingId === req.id}
                          className="btn btn-primary"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id, req.schoolName)}
                          disabled={processingId === req.id}
                          className="btn btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "12px", color: "#dc2626" }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Registered Schools Registry */}
      <div id="schools" className="card" style={{ padding: "20px", marginBottom: "28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-primary)" }}>
              Registered Schools Directory
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
              All onboarded school tenants. Suspending an institution instantly revokes staff and parent portal access.
            </p>
          </div>

          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Filter schools by name or email..."
              className="form-input"
              style={{ paddingLeft: "32px", fontSize: "13px", width: "100%" }}
              value={schoolSearch}
              onChange={(e) => setSchoolSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "10px 12px" }}>School Name & ID</th>
                <th style={{ padding: "10px 12px" }}>Board & Affiliation</th>
                <th style={{ padding: "10px 12px" }}>Students</th>
                <th style={{ padding: "10px 12px" }}>Staff</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Access Management</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((s) => {
                const isSuspended = s.status === "SUSPENDED" || !s.isActive;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        ID: {s.id} • {s.email || "No contact email"}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{s.boardType}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {s.affiliationNumber || "Not recorded"}
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{s.studentCount}</td>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{s.staffCount}</td>
                    <td style={{ padding: "12px" }}>
                      {isSuspended ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Ban size={12} /> Suspended
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            backgroundColor: "#ecfdf5",
                            color: "#065f46",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button
                        onClick={() => handleToggleSuspension(s)}
                        disabled={processingId === s.id}
                        className={isSuspended ? "btn btn-primary" : "btn btn-secondary"}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          color: isSuspended ? "#ffffff" : "#b91c1c",
                        }}
                      >
                        {isSuspended ? "Reinstate School" : "Suspend Access"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section: School Subscriptions & SaaS License Control */}
      <div id="subscriptions" className="card" style={{ padding: "20px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-primary)" }}>
              Tenant Subscriptions & Trial Governance
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
              Monitor school trial periods, commercial SaaS license status, and grant 30-day trial extensions.
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "10px 12px" }}>School Institution</th>
                <th style={{ padding: "10px 12px" }}>Subscription Status</th>
                <th style={{ padding: "10px 12px" }}>Plan Tier</th>
                <th style={{ padding: "10px 12px" }}>Valid Until</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>License Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => {
                const sub = s.subscription;
                const status = sub?.status || "TRIALING";
                const isExpired = status === "EXPIRED" || status === "CANCELLED";
                const validUntil = sub?.trialEndsAt || sub?.currentPeriodEnd;

                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {s.studentCount} enrolled students
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          backgroundColor:
                            status === "ACTIVE" ? "#ecfdf5" : isExpired ? "#fee2e2" : "#fef3c7",
                          color:
                            status === "ACTIVE" ? "#065f46" : isExpired ? "#991b1b" : "#92400e",
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontWeight: 500 }}>
                      {sub?.planName || "Professional"}
                    </td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                      {validUntil ? new Date(validUntil).toLocaleDateString() : "30 days from approval"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button
                        onClick={() => handleExtendTrial(s.id, s.name)}
                        disabled={processingId === s.id}
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        +30 Days Extension
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Platform Audit Logs */}
      <div id="audit" className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-primary)" }}>
              Platform Security & Governance Audit Log
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
              Immutable record of administrative actions, registration approvals, suspensions, and access events.
            </p>
          </div>
          <Activity size={20} color="var(--text-muted)" />
        </div>

        {auditLogs.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No platform audit records logged yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "11px",
                      padding: "3px 6px",
                      borderRadius: "4px",
                      backgroundColor:
                        log.action.includes("SUSPEND")
                          ? "#fee2e2"
                          : log.action.includes("APPROV")
                          ? "#ecfdf5"
                          : "#e0f2fe",
                      color:
                        log.action.includes("SUSPEND")
                          ? "#991b1b"
                          : log.action.includes("APPROV")
                          ? "#065f46"
                          : "#0369a1",
                    }}
                  >
                    {log.action}
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    Target: <strong>{log.targetType}</strong> {log.targetId ? `(${log.targetId})` : ""}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--text-muted)", fontSize: "12px" }}>
                  <span>Actor: {log.userEmail || "System"}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
