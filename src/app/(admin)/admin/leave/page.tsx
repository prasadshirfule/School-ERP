"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Check,
  X,
} from "lucide-react";

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminRemark: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    teacherProfile: { fullName: string } | null;
  };
  approvedByUser: { id: string; email: string } | null;
};

export default function AdminLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Review Modal State
  const [targetRequest, setTargetRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [adminRemark, setAdminRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = () => {
    fetch("/api/leave")
      .then((r) => r.json())
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openReviewModal = (req: LeaveRequest, action: "APPROVED" | "REJECTED") => {
    setTargetRequest(req);
    setActionType(action);
    setAdminRemark("");
    setError("");
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRequest) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetRequest.id,
          status: actionType,
          adminRemark: adminRemark.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update leave request");
      }

      setTargetRequest(null);
      fetchRequests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDisplayDate = (d: string) => {
    const date = new Date(d);
    return isNaN(date.getTime())
      ? d
      : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const calcDays = (startStr: string, endStr: string) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const filteredRequests = requests.filter((r) => {
    if (selectedStatus === "ALL") return true;
    return r.status === selectedStatus;
  });

  if (loading) {
    return (
      <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
        <div style={{ color: "#64748b", fontSize: "14px" }}>Loading staff leave applications...</div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Staff Leave Management</h1>
          <p className="office-subtitle">
            Review leave requests from teaching faculty, check duration, and record approvals
          </p>
        </div>
      </div>

      {/* ─── Metric Highlights ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
              background: "#fffbeb",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Pending Review</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#d97706" }}>{pendingCount}</div>
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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Approved Leaves</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>{approvedCount}</div>
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
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Rejected</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dc2626" }}>{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* ─── Status Filter Tabs ─── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { key: "ALL", label: `All Requests (${requests.length})` },
          { key: "PENDING", label: `Pending (${pendingCount})` },
          { key: "APPROVED", label: `Approved (${approvedCount})` },
          { key: "REJECTED", label: `Rejected (${rejectedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`office-btn office-btn-sm ${selectedStatus === tab.key ? "office-btn-primary" : "office-btn-secondary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Requests Table ─── */}
      <div className="office-table-wrapper">
        <table className="office-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Leave Type</th>
              <th>Duration</th>
              <th>Reason</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                  No leave requests found for this status.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => {
                const days = calcDays(req.startDate, req.endDate);
                const applicantName = req.user.teacherProfile?.fullName || req.user.email;
                const isPending = req.status === "PENDING";

                return (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{applicantName}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{req.user.email}</div>
                    </td>
                    <td>
                      <span className="office-pill office-pill-blue">{req.leaveType}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {formatDisplayDate(req.startDate)} – {formatDisplayDate(req.endDate)}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {days} day{days !== 1 ? "s" : ""}
                      </div>
                    </td>
                    <td style={{ maxWidth: "260px" }}>
                      <div style={{ fontSize: "13px", color: "#334155" }}>{req.reason}</div>
                      {req.adminRemark && (
                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                          Remark: {req.adminRemark}
                        </div>
                      )}
                    </td>
                    <td>
                      {req.status === "APPROVED" ? (
                        <span className="office-pill office-pill-green">Approved</span>
                      ) : req.status === "REJECTED" ? (
                        <span className="office-pill office-pill-red">Rejected</span>
                      ) : (
                        <span className="office-pill office-pill-amber">Pending</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {isPending ? (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openReviewModal(req, "APPROVED")}
                            className="office-btn office-btn-success office-btn-sm"
                          >
                            <Check size={12} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => openReviewModal(req, "REJECTED")}
                            className="office-btn office-btn-danger office-btn-sm"
                          >
                            <X size={12} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {targetRequest && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setTargetRequest(null)}
        >
          <div
            className="office-card"
            style={{ width: "100%", maxWidth: "440px", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="office-card-header">
              <h3 className="office-card-title">
                {actionType === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button
                type="button"
                onClick={() => setTargetRequest(null)}
                className="office-btn office-btn-secondary office-btn-sm"
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleReviewSubmit}>
              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                  {targetRequest.user.teacherProfile?.fullName || targetRequest.user.email}
                </div>
                <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                  {targetRequest.leaveType} • {formatDisplayDate(targetRequest.startDate)} to {formatDisplayDate(targetRequest.endDate)}
                </div>
              </div>

              <div className="office-form-group">
                <label className="office-form-label">Admin Remark / Feedback (Optional)</label>
                <textarea
                  className="office-input"
                  style={{ width: "100%", height: "70px", resize: "vertical" }}
                  placeholder="e.g. Approved. Please coordinate class coverage with Mr. Verma."
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setTargetRequest(null)}
                  className="office-btn office-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`office-btn ${actionType === "APPROVED" ? "office-btn-success" : "office-btn-danger"}`}
                >
                  {submitting ? "Saving..." : actionType === "APPROVED" ? "Confirm Approval" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
