"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface ParentLinkRequest {
  id: string;
  admissionNo: string;
  relationship: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  parent: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string;
  };
  student: {
    id: string;
    fullName: string;
    admissionNo: string;
    rollNumber: string | null;
    section: {
      name: string;
      class: { name: string };
    } | null;
  } | null;
}

export default function AdminParentLinksPage() {
  const [requests, setRequests] = useState<ParentLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/parent-links");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err: unknown) {
      console.error("Error fetching parent links:", err);
      setMessage({ type: "error", text: "Failed to load link requests" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/parent-links");
        if (res.ok && !ignore) {
          const data = await res.json();
          setRequests(data.requests || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Error fetching parent links:", err);
          setMessage({ type: "error", text: "Failed to load link requests" });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleApprove = async (id: string, studentName: string, parentName: string) => {
    if (!confirm(`Approve link between student "${studentName}" and parent "${parentName}"?`)) return;

    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/parent-links/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve link");

      setMessage({ type: "success", text: data.message || "Link approved successfully" });
      await fetchRequests();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Approval failed" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, studentName: string) => {
    const reason = prompt(`Enter reason for rejecting link with "${studentName}":`, "Student identity or relationship could not be verified");
    if (reason === null) return;

    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/parent-links/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject link");

      setMessage({ type: "success", text: "Link request rejected." });
      await fetchRequests();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Rejection failed" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (id: string, studentName: string, parentName: string) => {
    const reason = prompt(
      `Revoke access link between student "${studentName}" and parent "${parentName}"? Enter reason:`,
      "Administrative guardian reassignment or withdrawal"
    );
    if (reason === null) return;

    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/parent-links/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke link");

      setMessage({ type: "success", text: data.message || "Link revoked successfully" });
      await fetchRequests();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Revocation failed" });
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      r.parent.fullName.toLowerCase().includes(q) ||
      (r.parent.email && r.parent.email.toLowerCase().includes(q)) ||
      r.admissionNo.toLowerCase().includes(q) ||
      (r.student && r.student.fullName.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Parent-Student Link Verification</h1>
          <p className="office-subtitle">
            Review and authorize parental access requests to student records, grades, and fee invoices
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: message.type === "success" ? "#065f46" : "#b91c1c",
          }}
        >
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Search & Tabs ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={filterStatus === "PENDING" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ fontSize: "12.5px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span
                style={{
                  backgroundColor: filterStatus === "PENDING" ? "#fff" : "#1e3a8a",
                  color: filterStatus === "PENDING" ? "#1e3a8a" : "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "10px",
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus("APPROVED")}
            className={filterStatus === "APPROVED" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ fontSize: "12.5px", padding: "6px 14px" }}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterStatus("REJECTED")}
            className={filterStatus === "REJECTED" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ fontSize: "12.5px", padding: "6px 14px" }}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilterStatus("ALL")}
            className={filterStatus === "ALL" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ fontSize: "12.5px", padding: "6px 14px" }}
          >
            All Requests ({requests.length})
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "10px", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search parent or student..."
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "34px", fontSize: "13px" }}
          />
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="office-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
            <div style={{ color: "#64748b", fontSize: "13.5px" }}>Loading link requests...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <Users size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "15px" }}>
              No {filterStatus.toLowerCase()} link requests found
            </div>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              Parent connection requests submitted from the parent mobile or web portal will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                  <th style={{ padding: "12px 16px" }}>Student Record</th>
                  <th style={{ padding: "12px 16px" }}>Parent Applicant</th>
                  <th style={{ padding: "12px 16px" }}>Claimed Relationship</th>
                  <th style={{ padding: "12px 16px" }}>Requested On</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const studentName = r.student?.fullName || "Unmatched Student";
                  const classInfo = r.student?.section
                    ? `${r.student.section.class.name} - ${r.student.section.name}`
                    : "No section assigned";

                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{studentName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          Adm: {r.admissionNo} • {classInfo}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500, color: "#0f172a" }}>{r.parent.fullName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {r.parent.email || "No email"} • {r.parent.phone}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="office-pill office-pill-blue">{r.relationship}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            backgroundColor:
                              r.status === "APPROVED" ? "#ecfdf5" : r.status === "REJECTED" ? "#fee2e2" : "#fef3c7",
                            color:
                              r.status === "APPROVED" ? "#065f46" : r.status === "REJECTED" ? "#991b1b" : "#92400e",
                          }}
                        >
                          {r.status}
                        </span>
                        {r.rejectionReason && (
                          <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                            {r.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {r.status === "PENDING" ? (
                          <div style={{ display: "inline-flex", gap: "8px" }}>
                            <button
                              onClick={() => handleApprove(r.id, studentName, r.parent.fullName)}
                              disabled={processingId === r.id}
                              className="btn btn-primary"
                              style={{ padding: "5px 12px", fontSize: "12px" }}
                            >
                              Approve Link
                            </button>
                            <button
                              onClick={() => handleReject(r.id, studentName)}
                              disabled={processingId === r.id}
                              className="btn btn-secondary"
                              style={{ padding: "5px 12px", fontSize: "12px", color: "#dc2626" }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : r.status === "APPROVED" ? (
                          <button
                            onClick={() => handleRevoke(r.id, studentName, r.parent.fullName)}
                            disabled={processingId === r.id}
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "11.5px", color: "#dc2626", borderColor: "#fecaca", cursor: "pointer" }}
                            title="Revoke parent guardian access"
                          >
                            Revoke Link
                          </button>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
