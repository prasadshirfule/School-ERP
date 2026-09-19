"use client";

import React, { useState } from "react";
import { Printer, Download, X, FileText, Loader2 } from "lucide-react";

interface CertificateData {
  type: "BONAFIDE" | "TC" | "CHARACTER";
  student: {
    fullName: string;
    admissionNo: string;
    dob: string;
    gender?: string | null;
    fatherName?: string | null;
    motherName?: string | null;
    academicYear: string;
    section?: { name: string; className: string } | null;
  };
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    principalName?: string | null;
    affiliationNumber?: string | null;
    trustName?: string | null;
  };
  fields: Record<string, any>;
}

interface Props {
  data: CertificateData;
  onClose?: () => void;
}

const CERT_TITLES: Record<string, string> = {
  BONAFIDE: "BONAFIDE CERTIFICATE",
  TC: "TRANSFER CERTIFICATE",
  CHARACTER: "CHARACTER CERTIFICATE",
};

function formatCertDate(d: string | undefined): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

export default function CertificateView({ data, onClose }: Props) {
  const { type, student, school, fields } = data;
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("printable-certificate");
      if (!element) return;

      const nameClean = (student.fullName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${nameClean}_${type}_Certificate.pdf`;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="report-card-wrapper">
      {/* Action Bar */}
      <div className="report-card-actions no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
            {CERT_TITLES[type]}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            style={{ gap: "6px" }}
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{downloadingPdf ? "Generating PDF..." : "Download PDF"}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            style={{ gap: "6px" }}
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
          {onClose && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ padding: "6px" }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Certificate Sheet */}
      <div className="certificate-sheet" id="printable-certificate">
        {/* Decorative border */}
        <div className="cert-border-outer">
          <div className="cert-border-inner">
            {/* Header */}
            <div className="cert-header">
              {school.logoUrl ? (
                <div className="cert-logo-wrap">
                  <img src={school.logoUrl} alt={school.name} className="cert-logo" />
                </div>
              ) : (
                <div className="cert-logo-placeholder">
                  <FileText size={32} color="#991b1b" />
                </div>
              )}
              <div className="cert-school-info">
                {school.trustName && <div className="cert-trust">{school.trustName}</div>}
                <h1 className="cert-school-name">{school.name}</h1>
                {school.address && <div className="cert-address">{school.address}</div>}
                {school.affiliationNumber && (
                  <div className="cert-affiliation">Affiliation No: {school.affiliationNumber}</div>
                )}
              </div>
              <div className="cert-header-line" />
            </div>

            {/* Certificate Title */}
            <div className="cert-title">{CERT_TITLES[type]}</div>
            {type === "TC" && fields.tcNumber && (
              <div className="cert-serial">TC No: {fields.tcNumber}</div>
            )}

            {/* Certificate Body */}
            <div className="cert-body">
              {type === "BONAFIDE" && (
                <div className="cert-text">
                  <p>This is to certify that <strong className="cert-highlight">{student.fullName}</strong>,
                    {student.gender ? ` ${student.gender === "Male" ? "son" : student.gender === "Female" ? "daughter" : "ward"}` : " ward"}
                    {" "}of <strong>{student.fatherName || "—"}</strong>
                    {student.motherName ? ` and ${student.motherName}` : ""},
                    is a bonafide student of this institution.</p>
                  <div className="cert-detail-grid">
                    <div className="cert-detail-row">
                      <span className="cert-label">Admission No:</span>
                      <span className="cert-value">{student.admissionNo}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Class & Section:</span>
                      <span className="cert-value">
                        {student.section ? `${student.section.className} — ${student.section.name}` : "—"}
                      </span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Academic Year:</span>
                      <span className="cert-value">{student.academicYear}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Date of Birth:</span>
                      <span className="cert-value">{formatCertDate(student.dob)}</span>
                    </div>
                    {fields.purpose && (
                      <div className="cert-detail-row" style={{ gridColumn: "1 / -1" }}>
                        <span className="cert-label">Purpose:</span>
                        <span className="cert-value">{fields.purpose}</span>
                      </div>
                    )}
                  </div>
                  <p style={{ marginTop: "18px" }}>
                    This certificate is issued on request for the purpose of{" "}
                    <strong>{fields.purpose || "official use"}</strong>.
                  </p>
                </div>
              )}

              {type === "TC" && (
                <div className="cert-text">
                  <p>This is to certify that <strong className="cert-highlight">{student.fullName}</strong>,
                    {student.gender ? ` ${student.gender === "Male" ? "son" : student.gender === "Female" ? "daughter" : "ward"}` : " ward"}
                    {" "}of <strong>{student.fatherName || "—"}</strong>
                    {student.motherName ? ` and ${student.motherName}` : ""},
                    was a student of this institution and is hereby granted this Transfer Certificate.</p>
                  <div className="cert-detail-grid">
                    <div className="cert-detail-row">
                      <span className="cert-label">Admission No:</span>
                      <span className="cert-value">{student.admissionNo}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Date of Birth:</span>
                      <span className="cert-value">{formatCertDate(student.dob)}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Class & Section:</span>
                      <span className="cert-value">
                        {student.section ? `${student.section.className} — ${student.section.name}` : "—"}
                      </span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Academic Year:</span>
                      <span className="cert-value">{student.academicYear}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Last Attendance:</span>
                      <span className="cert-value">{formatCertDate(fields.lastAttendanceDate)}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Reason for Leaving:</span>
                      <span className="cert-value">{fields.reasonForLeaving}</span>
                    </div>
                    <div className="cert-detail-row" style={{ gridColumn: "1 / -1" }}>
                      <span className="cert-label">Conduct & Character:</span>
                      <span className="cert-value">{fields.conductRemark || "Good"}</span>
                    </div>
                  </div>
                  <p style={{ marginTop: "18px" }}>
                    The student's character and conduct during the stay in this institution were found to be{" "}
                    <strong>{fields.conductRemark || "Good"}</strong>.
                  </p>
                </div>
              )}

              {type === "CHARACTER" && (
                <div className="cert-text">
                  <p>This is to certify that <strong className="cert-highlight">{student.fullName}</strong>,
                    {student.gender ? ` ${student.gender === "Male" ? "son" : student.gender === "Female" ? "daughter" : "ward"}` : " ward"}
                    {" "}of <strong>{student.fatherName || "—"}</strong>
                    {student.motherName ? ` and ${student.motherName}` : ""},
                    is/was a student of this institution.</p>
                  <div className="cert-detail-grid">
                    <div className="cert-detail-row">
                      <span className="cert-label">Admission No:</span>
                      <span className="cert-value">{student.admissionNo}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Class & Section:</span>
                      <span className="cert-value">
                        {student.section ? `${student.section.className} — ${student.section.name}` : "—"}
                      </span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Academic Year:</span>
                      <span className="cert-value">{student.academicYear}</span>
                    </div>
                    <div className="cert-detail-row">
                      <span className="cert-label">Date of Birth:</span>
                      <span className="cert-value">{formatCertDate(student.dob)}</span>
                    </div>
                  </div>
                  <p style={{ marginTop: "18px" }}>
                    During the period of study, the student's character and conduct were found to be{" "}
                    <strong>{fields.conductRemark || "Good"}</strong>. We wish the student all the best in future endeavours.
                  </p>
                </div>
              )}
            </div>

            {/* Date & Signatures */}
            <div className="cert-footer">
              <div className="cert-date">
                Date: {formatCertDate(fields.issueDate)}
              </div>
              <div className="cert-signatures">
                <div className="cert-sig-col">
                  <div className="cert-sig-line" />
                  <div className="cert-sig-label">Class Teacher</div>
                </div>
                <div className="cert-sig-col">
                  {school.principalName && (
                    <div className="cert-principal-name">{school.principalName}</div>
                  )}
                  <div className="cert-sig-line" />
                  <div className="cert-sig-label">Principal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .certificate-sheet {
          width: 100%;
          max-width: 800px;
          min-height: 1050px;
          box-sizing: border-box;
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          font-family: Georgia, "Times New Roman", serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .cert-border-outer {
          border: 3px double #991b1b;
          padding: 8px;
          min-height: 1020px;
          display: flex;
          flex-direction: column;
        }
        .cert-border-inner {
          border: 1px solid #d4a373;
          padding: 28px 36px 36px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .cert-header {
          position: relative;
          text-align: center;
          margin-bottom: 10px;
        }
        .cert-logo-wrap, .cert-logo-placeholder {
          position: absolute;
          left: 0; top: 0;
          width: 54px; height: 54px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .cert-logo { width: 100%; height: 100%; object-fit: contain; }
        .cert-school-info { text-align: center; padding: 0 58px; }
        .cert-trust {
          font-size: 11px; font-weight: 600; color: #1e293b;
          margin-bottom: 2px; letter-spacing: 0.3px;
          font-family: -apple-system, sans-serif;
        }
        .cert-school-name {
          margin: 0; font-size: 24px; font-weight: 800;
          color: #991b1b; letter-spacing: 1px;
          text-transform: uppercase; line-height: 1.2;
        }
        .cert-address {
          font-size: 11px; color: #334155; margin-top: 3px;
          font-weight: 500; line-height: 1.3;
          font-family: -apple-system, sans-serif;
        }
        .cert-affiliation {
          font-size: 10.5px; color: #475569; margin-top: 2px;
          font-family: -apple-system, sans-serif; font-weight: 500;
        }
        .cert-header-line {
          height: 2px; background: #991b1b;
          margin-top: 12px; width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .cert-title {
          text-align: center; font-size: 20px; font-weight: 800;
          letter-spacing: 3px; color: #1e293b;
          margin: 22px 0 4px; text-transform: uppercase;
          text-decoration: underline; text-underline-offset: 6px;
        }
        .cert-serial {
          text-align: center; font-size: 13px; font-weight: 600;
          color: #475569; margin-bottom: 4px;
          font-family: monospace;
        }
        .cert-body { flex: 1; margin-top: 24px; }
        .cert-text {
          font-size: 14.5px; line-height: 1.9; color: #1e293b;
        }
        .cert-text p { margin: 0 0 8px; text-align: justify; }
        .cert-highlight {
          text-transform: uppercase; font-size: 15px;
          text-decoration: underline; text-underline-offset: 3px;
        }
        .cert-detail-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px 28px; margin: 18px 0;
          padding: 16px 20px;
          background: #fefce8;
          border: 1px solid #fde68a;
          border-radius: 6px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .cert-detail-row {
          display: flex; align-items: baseline; gap: 8px;
          font-size: 13px;
        }
        .cert-label {
          font-weight: 700; color: #0f172a;
          min-width: 130px; white-space: nowrap;
          font-family: -apple-system, sans-serif; font-size: 12px;
        }
        .cert-value {
          color: #334155; font-weight: 500;
          font-family: -apple-system, sans-serif; font-size: 13px;
        }
        .cert-footer { margin-top: auto; padding-top: 40px; }
        .cert-date {
          font-size: 13px; font-weight: 600; color: #334155;
          margin-bottom: 48px;
          font-family: -apple-system, sans-serif;
        }
        .cert-signatures {
          display: flex; justify-content: space-between;
          padding: 0 20px;
        }
        .cert-sig-col { text-align: center; min-width: 160px; }
        .cert-sig-line {
          width: 100%; height: 1px; background: #334155;
          margin-bottom: 6px;
        }
        .cert-sig-label {
          font-size: 12px; font-weight: 700; color: #1e293b;
          text-transform: uppercase; letter-spacing: 0.5px;
          font-family: -apple-system, sans-serif;
        }
        .cert-principal-name {
          font-size: 13px; font-weight: 600; color: #334155;
          font-style: italic; margin-bottom: 4px;
          font-family: -apple-system, sans-serif;
        }

        @media print {
          .certificate-sheet {
            border: none; box-shadow: none; border-radius: 0;
            padding: 0; margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
