"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Receipt, CheckCircle2, AlertCircle, Sparkles, Clock, CalendarDays, Award, Printer, FileText } from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import ReportCardView, { ReportCardPayload } from "@/components/ReportCardView";

type Attendance = {
  id: string;
  date: string;
  status: string;
};

type Invoice = {
  id: string;
  amountDue: string;
  discountAmount: string;
  dueDate: string;
  status: string;
  feeStructure: { name: string };
  payments: { amount: string; method: string; paidAt: string; receiptNumber: string }[];
};

const STATUS_BADGE: Record<string, string> = {
  PRESENT: "badge-success",
  ABSENT: "badge-danger",
  LATE: "badge-warning",
  HALF_DAY: "badge-warning",
  LEAVE: "badge-info",
  UNPAID: "badge-danger",
  PARTIALLY_PAID: "badge-warning",
  PAID: "badge-success",
  OVERDUE: "badge-danger",
  WAIVED: "badge-info",
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"attendance" | "fees" | "report-card">("attendance");
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reportCardData, setReportCardData] = useState<ReportCardPayload | null>(null);
  const [loadingReportCard, setLoadingReportCard] = useState(false);
  const [selectedExamIndex, setSelectedExamIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/parent/students/${id}/attendance`).then((r) => r.json()),
      fetch(`/api/parent/students/${id}/invoices`).then((r) => r.json()),
      fetch(`/api/students/${id}/report-card`).then((r) => r.json()),
    ]).then(([att, inv, rc]) => {
      setAttendance(Array.isArray(att) ? att : []);
      setInvoices(Array.isArray(inv) ? inv : []);
      setReportCardData(rc && !rc.error ? rc : null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading student profile & records...</div>;

  const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
  const absentCount = attendance.filter((a) => a.status === "ABSENT").length;
  const totalDays = attendance.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/parent/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "var(--text-muted)", textDecoration: "none", marginBottom: "8px", fontWeight: 500 }}>
            <ArrowLeft size={14} />
            <span>Back to Children Overview</span>
          </Link>
          <h1 className="page-title">Student Academic & Fee Portfolio</h1>
          <p className="page-subtitle">Detailed attendance register and tuition fee payment statement</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-indigo">
            <CalendarDays size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Days Tracked</span>
            <span className="stat-value">{totalDays}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Days Present</span>
            <span className="stat-value" style={{ color: "#34d399" }}>{presentCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-rose">
            <AlertCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Days Absent</span>
            <span className="stat-value" style={{ color: "#fb7185" }}>{absentCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-teal">
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Overall Attendance</span>
            <span className="stat-value" style={{ color: totalDays > 0 && (presentCount / totalDays) >= 0.75 ? "#34d399" : "#fbbf24" }}>
              {totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : "—"}%
            </span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "attendance" ? "tab-active" : ""}`} onClick={() => setTab("attendance")}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={15} />
            <span>Attendance Log ({attendance.length})</span>
          </div>
        </button>
        <button className={`tab ${tab === "fees" ? "tab-active" : ""}`} onClick={() => setTab("fees")}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Receipt size={15} />
            <span>Fee Invoices & Payments ({invoices.length})</span>
          </div>
        </button>
        <button className={`tab ${tab === "report-card" ? "tab-active" : ""}`} onClick={() => setTab("report-card")}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Award size={15} />
            <span>Academic Report Card</span>
          </div>
        </button>
      </div>

      {tab === "attendance" && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Session Date</th>
                <th style={{ width: "180px" }}>Recorded Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={2}>
                    <div className="empty-state">
                      <div className="empty-state-icon-wrap">
                        <Calendar size={26} color="#818cf8" />
                      </div>
                      <div className="empty-state-title">No attendance logs found</div>
                      <p className="empty-state-text">Attendance records will appear here as teachers log daily presence.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                attendance.map((a) => (
                  <tr key={a.id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {formatDate(a.date)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[a.status] || "badge-info"}`}>
                        <span className="badge-dot" />
                        <span>{a.status.replace("_", " ")}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "fees" && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fee Structure Item</th>
                <th className="text-right">Payable Amount</th>
                <th>Due Date</th>
                <th>Invoice Status</th>
                <th className="text-right">Payments Made</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon-wrap">
                        <Receipt size={26} color="#fbbf24" />
                      </div>
                      <div className="empty-state-title">No fee invoices issued</div>
                      <p className="empty-state-text">There are no outstanding fee invoices billed for this student at this time.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.feeStructure.name}</td>
                    <td className="num-cell">₹{inv.amountDue}</td>
                    <td style={{ color: "var(--text-muted)" }}>{formatDate(inv.dueDate)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[inv.status] || "badge-info"}`}>
                        <span className="badge-dot" />
                        <span>{inv.status.replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="num-cell">
                      {inv.payments.length === 0 ? (
                        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>Pending</span>
                      ) : (
                        <span style={{ color: "#34d399" }}>
                          {inv.payments.length} paid · ₹{inv.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "report-card" && (
        <div>
          {!reportCardData ? (
            <div className="card">
              <div className="empty-state" style={{ padding: "36px 16px" }}>
                <div className="empty-state-icon-wrap" style={{ background: "var(--role-parent-light)", color: "#fb7185" }}>
                  <FileText size={26} />
                </div>
                <div className="empty-state-title">No Academic Report Cards Available</div>
                <p className="empty-state-text">
                  Assessment scores and term examination marks have not been published by teachers yet.
                </p>
              </div>
            </div>
          ) : (
            <ReportCardView data={reportCardData} />
          )}
        </div>
      )}
    </div>
  );
}
