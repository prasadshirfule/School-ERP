"use client";

import { useEffect, useState } from "react";
import { FileCheck, Sparkles, Calendar, FileText } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/certificates/generate")
      .then((r) => r.json())
      .then((data) => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading TC Register...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">TC Register &amp; Certificates</h1>
          <p className="page-subtitle">
            Permanent record of all Transfer Certificates issued. Generate certificates from individual student profiles.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <FileCheck size={16} color="#818cf8" />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
            To generate Bonafide, TC, or Character certificates, navigate to a student&apos;s profile page → Generate Certificate section.
          </span>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap"><FileText size={26} color="#818cf8" /></div>
            <div className="empty-state-title">No Transfer Certificates issued yet</div>
            <p className="empty-state-text">
              When a Transfer Certificate is generated from a student&apos;s profile, it will appear here as a permanent record.
            </p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>TC Number</th>
                <th>Student</th>
                <th>Class</th>
                <th>Issue Date</th>
                <th>Reason</th>
                <th>Conduct</th>
                <th>Issued By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>
                    {log.tcNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{log.student.fullName}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{log.student.admissionNo}</div>
                  </td>
                  <td>
                    {log.student.section
                      ? `${log.student.section.class.name} — ${log.student.section.name}`
                      : "—"
                    }
                  </td>
                  <td>
                    {new Date(log.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ maxWidth: "200px" }}>{log.reasonForLeaving}</td>
                  <td>
                    <span className="badge badge-teal">
                      <span className="badge-dot" />
                      <span>{log.conductRemark}</span>
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{log.generatedByUser.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
