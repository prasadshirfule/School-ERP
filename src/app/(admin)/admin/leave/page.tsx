"use client";

import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Sparkles, User, FileText, Check, X, Filter } from "lucide-react";

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
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
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
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading staff leave requests...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Leave Management</h1>
          <p className="page-subtitle">Review, approve, and track leave applications from teaching and administrative staff</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="stat-card" style={{ borderLeft: "4px solid #fbbf24" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Pending Approval</span>
            <Clock size={18} color="#fbbf24" />
          </div>
          <div className="stat-value" style={{ color: "#fbbf24" }}>{pendingCount}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #34d399" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Approved Leaves</span>
            <CheckCircle2 size={18} color="#34d399" />
          </div>
          <div className="stat-value" style={{ color: "#34d399" }}>{approvedCount}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #f87171" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Rejected</span>
            <XCircle size={18} color="#f87171" />
          </div>
          <div className="stat-value" style={{ color: "#f87171" }}>{rejectedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
          <button
            key={st}
            className={`btn btn-sm ${selectedStatus === st ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedStatus(st)}
          >
            {st === "ALL" ? `All Requests (${requests.length})` : `${st.charAt(0) + st.slice(1).toLowerCase()} (${requests.filter((r) => r.status === st).length})`}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="card empty-state" style={{ padding: "40px 20px" }}>
          <Clock size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <div className="empty-state-title">No Leave Requests Found</div>
          <p style={{ color: "var(--text-secondary)" }}>
            {selectedStatus === "ALL" ? "No staff leave applications have been submitted yet." : `No ${selectedStatus.toLowerCase()} leave requests.`}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Remark</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const staffName = req.user.teacherProfile?.fullName || req.user.email;
                  const days = calcDays(req.startDate, req.endDate);

                  return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{staffName}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{req.user.role} • {req.user.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-teal">{req.leaveType}</span>
                      </td>
                      <td style={{ fontSize: "12.5px" }}>
                        <div>{formatDisplayDate(req.startDate)} to</div>
                        <div style={{ color: "var(--text-muted)" }}>{formatDisplayDate(req.endDate)}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{days} {days === 1 ? "day" : "days"}</td>
                      <td style={{ maxWidth: "200px", fontSize: "13px" }}>{req.reason}</td>
                      <td>
                        {req.status === "PENDING" && <span className="badge badge-warning">Pending Review</span>}
                        {req.status === "APPROVED" && <span className="badge badge-success">Approved</span>}
                        {req.status === "REJECTED" && <span className="badge badge-danger">Rejected</span>}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "160px" }}>
                        {req.adminRemark || "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {req.status === "PENDING" ? (
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openReviewModal(req, "APPROVED")}
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => openReviewModal(req, "REJECTED")}
                              style={{ padding: "4px 8px", fontSize: "12px", color: "var(--danger)" }}
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => openReviewModal(req, req.status === "APPROVED" ? "REJECTED" : "APPROVED")}
                            style={{ fontSize: "11.5px" }}
                          >
                            Change Status
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Approve/Reject Modal ─── */}
      {targetRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setTargetRequest(null)}
        >
          <div
            className="card"
            style={{ maxWidth: "460px", width: "100%", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>
                {actionType === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button className="btn-icon" onClick={() => setTargetRequest(null)}><X size={16} /></button>
            </div>

            <div style={{ padding: "12px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", marginBottom: "16px", fontSize: "13px" }}>
              <div><strong>Applicant:</strong> {targetRequest.user.teacherProfile?.fullName || targetRequest.user.email}</div>
              <div style={{ marginTop: "4px" }}><strong>Type:</strong> {targetRequest.leaveType}</div>
              <div style={{ marginTop: "4px" }}><strong>Dates:</strong> {formatDisplayDate(targetRequest.startDate)} — {formatDisplayDate(targetRequest.endDate)}</div>
              <div style={{ marginTop: "4px", color: "var(--text-secondary)" }}><strong>Reason:</strong> {targetRequest.reason}</div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "14px" }}>
                <AlertCircle size={15} /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Decision</label>
                <div style={{ display: "flex", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="radio"
                      name="decision"
                      checked={actionType === "APPROVED"}
                      onChange={() => setActionType("APPROVED")}
                    />
                    <span style={{ color: "#34d399", fontWeight: 600 }}>Approve</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="radio"
                      name="decision"
                      checked={actionType === "REJECTED"}
                      onChange={() => setActionType("REJECTED")}
                    />
                    <span style={{ color: "#f87171", fontWeight: 600 }}>Reject</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Remark / Notes (optional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Approved. Please ensure syllabus substitute is assigned."
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setTargetRequest(null)} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${actionType === "APPROVED" ? "btn-primary" : "btn-danger"}`}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : actionType === "APPROVED" ? "Confirm Approval" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
