"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck, Sparkles, Calendar, FileText, Search, User } from "lucide-react";

type TCLog = {
  id: string;
  tcNumber: string;
  issueDate: string;
  reasonForLeaving: string;
  lastAttendanceDate: string;
  conductRemark: string;
  createdAt: string;
  student: {
    fullName: string;
    admissionNo: string;
    section: { name: string; class: { name: string } } | null;
  };
  generatedByUser: { email: string };
};

export default function CertificatesPage() {
  const [logs, setLogs] = useState<TCLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/certificates/generate")
      .then((r) => r.json())
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tcNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
        <div style={{ color: "#64748b", fontSize: "14px" }}>Loading TC Register records...</div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Transfer Certificates (TC) Register</h1>
          <p className="office-subtitle">
            Permanent school registry of all issued Transfer, Leaving, and Bonafide Certificates
          </p>
        </div>
        <div className="office-actions-bar">
          <Link href="/admin/students" className="office-btn office-btn-secondary">
            <User size={14} />
            <span>Generate from Student Profile</span>
          </Link>
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div className="office-search-wrapper" style={{ flex: 1, minWidth: "240px", maxWidth: "380px" }}>
          <Search size={16} className="office-search-icon" />
          <input
            type="text"
            placeholder="Search by student name or TC number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="office-input office-search-input"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ fontSize: "13px", color: "#64748b" }}>
          Total Issued: <strong>{logs.length}</strong> certificates
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <FileText size={36} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>No Transfer Certificates Issued Yet</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 16px 0" }}>
            When a Transfer Certificate is generated from a student&apos;s profile, it is permanently logged here.
          </p>
          <Link href="/admin/students" className="office-btn office-btn-primary office-btn-sm">
            <span>Go to Student Directory</span>
          </Link>
        </div>
      ) : (
        <div className="office-table-wrapper">
          <table className="office-table">
            <thead>
              <tr>
                <th style={{ width: "140px" }}>TC Number</th>
                <th>Student Name</th>
                <th>Class & Section</th>
                <th>Issue Date</th>
                <th>Reason for Leaving</th>
                <th>Conduct</th>
                <th>Issued By</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e3a8a", fontSize: "13px" }}>
                    {log.tcNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{log.student.fullName}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{log.student.admissionNo}</div>
                  </td>
                  <td style={{ color: "#334155" }}>
                    {log.student.section
                      ? `${log.student.section.class.name} — ${log.student.section.name}`
                      : "—"}
                  </td>
                  <td style={{ color: "#475569", fontSize: "13px" }}>
                    {new Date(log.issueDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ maxWidth: "220px", fontSize: "13px", color: "#334155" }}>
                    {log.reasonForLeaving}
                  </td>
                  <td>
                    <span className="office-pill office-pill-green">
                      {log.conductRemark}
                    </span>
                  </td>
                  <td style={{ fontSize: "12.5px", color: "#64748b" }}>
                    {log.generatedByUser.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
