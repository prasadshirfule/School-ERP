"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, X, Save, FileText } from "lucide-react";

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminRemark: string | null;
  createdAt: string;
};

export default function TeacherLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Application Modal State
  const [showModal, setShowModal] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchMyLeaves = () => {
    fetch("/api/leave")
      .then((r) => r.json())
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const openApplyModal = () => {
    setLeaveType("Casual");
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setReason("");
    setError("");
    setShowModal(true);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      setError("Please complete all required fields");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit leave request");
      }

      setShowModal(false);
      setSuccessMsg("Leave application submitted successfully for administrator review.");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchMyLeaves();
    } catch (err: any) {
      setError(err.message || "Failed to submit leave application");
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

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading your leave history...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leave Applications</h1>
          <p className="page-subtitle">Apply for time off, view approval status, and check past leave history</p>
        </div>
        <button className="btn btn-primary" onClick={openApplyModal} style={{ gap: "6px" }}>
          <Plus size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: "16px" }}>
          <CheckCircle2 size={16} /> <span>{successMsg}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="card empty-state" style={{ padding: "40px 20px" }}>
          <Calendar size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
          <div className="empty-state-title">No Leave Applications on Record</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
            You have not submitted any leave requests yet.
          </p>
          <button className="btn btn-primary btn-sm" onClick={openApplyModal}>
            <Plus size={14} /> Submit First Application
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date Range</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Admin Remarks</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const days = calcDays(req.startDate, req.endDate);

                  return (
                    <tr key={req.id}>
                      <td>
                        <span className="badge badge-teal">{req.leaveType}</span>
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        <div>{formatDisplayDate(req.startDate)} to</div>
                        <div style={{ color: "var(--text-muted)" }}>{formatDisplayDate(req.endDate)}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{days} {days === 1 ? "day" : "days"}</td>
                      <td style={{ maxWidth: "240px", fontSize: "13px" }}>{req.reason}</td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {formatDisplayDate(req.createdAt)}
                      </td>
                      <td>
                        {req.status === "PENDING" && <span className="badge badge-warning">Pending Review</span>}
                        {req.status === "APPROVED" && <span className="badge badge-success">Approved</span>}
                        {req.status === "REJECTED" && <span className="badge badge-danger">Rejected</span>}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "180px" }}>
                        {req.adminRemark || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Apply Leave Modal ─── */}
      {showModal && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: "480px", width: "100%", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={18} color="#818cf8" />
                <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>Apply for Leave</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "14px" }}>
                <AlertCircle size={15} /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleApply} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Leave Type *</label>
                <select
                  className="form-select"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="Casual">Casual Leave (CL)</option>
                  <option value="Sick">Medical / Sick Leave (ML)</option>
                  <option value="Earned">Earned Leave (EL)</option>
                  <option value="Maternity">Maternity / Paternity Leave</option>
                  <option value="Duty">On Duty / Official Duty</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Explanation *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Provide reason for time off..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: "6px" }}>
                  {submitting ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{submitting ? "Submitting..." : "Submit Application"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
