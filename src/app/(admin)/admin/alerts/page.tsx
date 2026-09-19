"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Receipt,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  User,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { formatDate } from "@/lib/formatDate";

type OverdueAlert = {
  invoiceId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  photoUrl?: string | null;
  className?: string | null;
  sectionName?: string | null;
  feeDescription: string;
  amountDue: string;
  amountPaid: string;
  amountRemaining: string;
  dueDate: string;
  status: string;
  daysOverdue: number;
  primaryContact?: {
    name: string;
    phone: string;
    relationship: string;
    isPrimary: boolean;
  } | null;
};

type AlertResponse = {
  totalAlerts: number;
  totalOverdueAmount: string;
  alerts: OverdueAlert[];
};

export default function AlertsPage() {
  const [data, setData] = useState<AlertResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts/fees")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading" style={{ margin: "60px auto" }}>
        <Sparkles size={20} className="animate-spin" /> Scanning fee invoices & overdue accounts...
      </div>
    );
  }

  const alerts = data?.alerts || [];
  const totalAmount = data?.totalOverdueAmount || "0.00";
  const criticalCount = alerts.filter((a) => a.daysOverdue >= 15).length;

  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* ─── Header ─── */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Overdue Fee Alerts
            </h1>
            {alerts.length > 0 && (
              <span
                className="badge badge-danger"
                style={{ fontSize: "12px", padding: "4px 8px", fontWeight: 700 }}
              >
                {alerts.length} Overdue
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: "4px" }}>
            Real-time feed of active students with pending or partially paid invoices past their scheduled due date.
          </p>
        </div>
      </div>

      {/* ─── Stat Metrics ─── */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-rose">
            <AlertTriangle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Overdue Invoices</span>
            <span className="stat-value" style={{ color: alerts.length > 0 ? "#fb7185" : "var(--text-primary)" }}>
              {alerts.length}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-amber">
            <Receipt size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Outstanding Overdue</span>
            <span className="stat-value" style={{ color: "#fbbf24" }}>
              ₹{totalAmount}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-indigo">
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Critically Overdue (&gt;15 Days)</span>
            <span className="stat-value" style={{ color: criticalCount > 0 ? "#f43f5e" : "#34d399" }}>
              {criticalCount}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Alerts Table ─── */}
      <div className="card">
        <div
          className="card-header"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={18} color="#fb7185" />
            <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>
              Outstanding Balance Register (Sorted by Most Overdue First)
            </h3>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 16px" }}>
            <div className="empty-state-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
              <CheckCircle2 size={30} />
            </div>
            <div className="empty-state-title">All Student Accounts Are Current!</div>
            <p className="empty-state-text">
              There are zero overdue fee invoices due on or before today across all classes.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class & Section</th>
                  <th>Fee Description</th>
                  <th className="num-cell">Remaining Due</th>
                  <th>Due Date</th>
                  <th>Primary Parent Contact</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const isToday = alert.daysOverdue === 0;

                  return (
                    <tr key={alert.invoiceId}>
                      {/* Student Info with Avatar */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {alert.photoUrl ? (
                            <img
                              src={alert.photoUrl}
                              alt={alert.studentName}
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid var(--border-color)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                background: "var(--role-admin-light)",
                                color: "#818cf8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "13px",
                              }}
                            >
                              {alert.studentName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13.5px" }}>
                              {alert.studentName}
                            </div>
                            <div
                              style={{
                                fontFamily: "monospace",
                                fontSize: "11.5px",
                                color: "#818cf8",
                                marginTop: "1px",
                              }}
                            >
                              {alert.admissionNo}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td>
                        {alert.className ? (
                          <span className="badge badge-teal" style={{ fontSize: "12px" }}>
                            {alert.className} — Sec {alert.sectionName || "A"}
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: "11px" }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Fee Description */}
                      <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                        {alert.feeDescription}
                      </td>

                      {/* Remaining Amount */}
                      <td className="num-cell">
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ fontWeight: 700, color: "#fb7185", fontSize: "14px" }}>
                            ₹{alert.amountRemaining}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                            of ₹{alert.amountDue}
                          </span>
                        </div>
                      </td>

                      {/* Due Date & Overdue Badge */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                            {formatDate(alert.dueDate)}
                          </span>
                          {isToday ? (
                            <span className="badge badge-warning" style={{ fontSize: "10.5px", padding: "1px 5px", width: "fit-content" }}>
                              Due Today
                            </span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: "10.5px", padding: "1px 5px", width: "fit-content" }}>
                              {alert.daysOverdue} {alert.daysOverdue === 1 ? "day" : "days"} overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Primary Parent Contact */}
                      <td>
                        {alert.primaryContact ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                              {alert.primaryContact.name}
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginLeft: "4px" }}>
                                ({alert.primaryContact.relationship})
                              </span>
                            </div>
                            <a
                              href={`tel:${alert.primaryContact.phone}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "12px",
                                color: "#2dd4bf",
                                textDecoration: "none",
                                fontWeight: 500,
                              }}
                            >
                              <Phone size={12} />
                              <span>{alert.primaryContact.phone}</span>
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            No parent linked
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/students/${alert.studentId}`}
                          className="btn btn-secondary btn-sm"
                          style={{ gap: "4px", fontSize: "12px" }}
                        >
                          <span>View Profile</span>
                          <ArrowRight size={13} />
                        </Link>
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
