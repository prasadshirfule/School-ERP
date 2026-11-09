"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Users,
  Calendar,
  Receipt,
  ShieldCheck,
  Database,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

export default function AdminExportPage() {
  const [studentStatus, setStudentStatus] = useState("all");
  const [studentFormat, setStudentFormat] = useState("csv");
  const [attendanceFormat, setAttendanceFormat] = useState("csv");
  const [feesFormat, setFeesFormat] = useState("csv");
  const [attendanceStart, setAttendanceStart] = useState("");
  const [attendanceEnd, setAttendanceEnd] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (url: string, key: string) => {
    setDownloading(key);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(null), 1500);
  };

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Data Export & Retention Vault</h1>
          <p className="office-subtitle">
            Export tenant-scoped student registries, historical attendance, and fee ledgers compliant with institutional retention standards
          </p>
        </div>
      </div>

      {/* ─── Compliance Banner ─── */}
      <div
        className="office-card"
        style={{
          marginBottom: "28px",
          padding: "18px 20px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
        }}
      >
        <ShieldCheck size={24} color="#1e3a8a" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
            Institutional Data Sovereignty & Portability
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
            Under the Digital Personal Data Protection (DPDP) Act, your institution owns 100% of student, parent,
            and academic data. All exports below are strictly scoped to your tenant with zero cross-tenant leakage.
            Archived student records remain preserved for 10-year statutory audit retention.
          </p>
        </div>
      </div>

      {/* ─── Export Grid ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
        {/* Card 1: Students Roster */}
        <div className="office-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#eff6ff",
                color: "#1e3a8a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Student Master Register
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                Full demographics, class roster, parent contacts, and status
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Filter Status
              </label>
              <select
                className="form-input"
                style={{ fontSize: "12.5px", padding: "6px 8px" }}
                value={studentStatus}
                onChange={(e) => setStudentStatus(e.target.value)}
              >
                <option value="all">All Students</option>
                <option value="active">Active Enrolled Only</option>
                <option value="archived">Graduated / Archived</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Format
              </label>
              <select
                className="form-input"
                style={{ fontSize: "12.5px", padding: "6px 8px" }}
                value={studentFormat}
                onChange={(e) => setStudentFormat(e.target.value)}
              >
                <option value="csv">CSV (Excel Compatible)</option>
                <option value="json">JSON (Structured)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() =>
              handleDownload(
                `/api/admin/export/students?format=${studentFormat}&status=${studentStatus}`,
                "students"
              )
            }
            disabled={downloading === "students"}
            className="btn btn-primary"
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Download size={15} />
            <span>{downloading === "students" ? "Generating..." : "Download Student Register"}</span>
          </button>
        </div>

        {/* Card 2: Attendance Register */}
        <div className="office-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Attendance Historical Log
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                Daily student attendance, leaves, and absence records
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Start Date
              </label>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: "12.5px", padding: "6px 8px" }}
                value={attendanceStart}
                onChange={(e) => setAttendanceStart(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                End Date
              </label>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: "12.5px", padding: "6px 8px" }}
                value={attendanceEnd}
                onChange={(e) => setAttendanceEnd(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={() => {
              let url = `/api/admin/export/attendance?format=${attendanceFormat}`;
              if (attendanceStart) url += `&startDate=${attendanceStart}`;
              if (attendanceEnd) url += `&endDate=${attendanceEnd}`;
              handleDownload(url, "attendance");
            }}
            disabled={downloading === "attendance"}
            className="btn btn-primary"
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Download size={15} />
            <span>{downloading === "attendance" ? "Generating..." : "Download Attendance Log"}</span>
          </button>
        </div>

        {/* Card 3: Fee Invoices & Payments */}
        <div className="office-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Fee Collection & Ledger
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                Invoices, payment receipts, offline drafts, and outstanding balances
              </p>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Export Format
            </label>
            <select
              className="form-input"
              style={{ fontSize: "12.5px", padding: "6px 8px" }}
              value={feesFormat}
              onChange={(e) => setFeesFormat(e.target.value)}
            >
              <option value="csv">CSV (Accounting & Tally Compatible)</option>
              <option value="json">JSON (Audit Ledger)</option>
            </select>
          </div>

          <button
            onClick={() => handleDownload(`/api/admin/export/fees?format=${feesFormat}`, "fees")}
            disabled={downloading === "fees"}
            className="btn btn-primary"
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Download size={15} />
            <span>{downloading === "fees" ? "Generating..." : "Download Fee Ledger"}</span>
          </button>
        </div>

        {/* Card 4: Encrypted Tenant Backup & Disaster Recovery */}
        <div className="office-card" style={{ display: "flex", flexDirection: "column", gap: "16px", border: "1px solid #bfdbfe" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#dbeafe",
                color: "#1e40af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Encrypted Disaster Recovery Backup
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                Complete AES-256-GCM encrypted archive covering all 25 tenant data models
              </p>
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "#475569", lineHeight: "1.5", margin: 0 }}>
            Includes students, academic structures, fee ledgers, grading, attendance, notices, and documents.
            Payload is cryptographically sealed with a SHA-256 integrity checksum.
          </p>

          <button
            onClick={() => handleDownload("/api/admin/backup", "backup")}
            disabled={downloading === "backup"}
            className="btn btn-primary"
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: "#1e40af" }}
          >
            <Download size={15} />
            <span>{downloading === "backup" ? "Encrypting & Packing..." : "Export Encrypted Backup (.bak)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
