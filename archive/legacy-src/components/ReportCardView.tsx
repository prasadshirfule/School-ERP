"use client";

import React, { useState } from "react";
import { Printer, Download, X, FileText, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface ReportCardPayload {
  student: {
    id: string;
    admissionNo: string;
    rollNumber: string;
    fullName: string;
    academicYear: string;
    photoUrl?: string | null;
    dob: string;
    gender?: string | null;
    fatherName?: string | null;
    motherName?: string | null;
    section?: {
      name: string;
      className: string;
    } | null;
    school: {
      name: string;
      boardType: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      logoUrl?: string | null;
      principalName?: string | null;
      affiliationNumber?: string | null;
      establishedYear?: number | null;
      trustName?: string | null;
    };
  };
  slots: {
    term1: { code: string; name: string; maxScore: number; isVaryingMax?: boolean }[];
    term2: { code: string; name: string; maxScore: number; isVaryingMax?: boolean }[];
    t1MaxTotal: number;
    t2MaxTotal: number;
    combinedMax: number;
  };
  subjects: {
    subjectId: string;
    subjectName: string;
    ut1: number | null;
    ut1Max?: number | null;
    ut2: number | null;
    ut2Max?: number | null;
    term1: number | null;
    term1Max?: number | null;
    term1Total: number | null;
    term1TotalMax?: number | null;
    ut3: number | null;
    ut3Max?: number | null;
    ut4: number | null;
    ut4Max?: number | null;
    term2: number | null;
    term2Max?: number | null;
    term2Total: number | null;
    term2TotalMax?: number | null;
    grandTotal: number | null;
    grandTotalMax?: number | null;
    grade: string;
  }[];
  summary: {
    totalGrandScore: number;
    totalGrandMax: number;
    overallPercentage: number;
    overallGrade: string;
    hasAnyMarks: boolean;
  };
  attendance: {
    exam: string;
    workingDays: number;
    present: number;
    attendancePct: string;
  }[];
  remarks: string;
  gradingScale: {
    id?: string;
    grade: string;
    minScore: number;
    maxScore: number;
  }[];
}

interface Props {
  data: ReportCardPayload;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function ReportCardView({ data, onClose, showCloseButton = false }: Props) {
  const { student, slots, subjects, summary, attendance, remarks, gradingScale } = data;
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const hasT1 = slots.term1 && slots.term1.length > 0;
  const hasT2 = slots.term2 && slots.term2.length > 0;

  const hasVaryingT1 = slots.term1 ? slots.term1.some((s) => s.isVaryingMax) : false;
  const hasVaryingT2 = slots.term2 ? slots.term2.some((s) => s.isVaryingMax) : false;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("printable-report-card");
      if (!element) return;

      const studentNameClean = (student.fullName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
      const academicYearClean = (student.academicYear || "2025-26").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${studentNameClean}_ReportCard_${academicYearClean}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getSlotScoreInfo = (s: typeof subjects[0], code: string) => {
    const c = code.toLowerCase().replace(/[\s_-]/g, "");
    if (c === "ut1" || c === "unittest1") return { score: s.ut1, max: s.ut1Max };
    if (c === "ut2" || c === "unittest2") return { score: s.ut2, max: s.ut2Max };
    if (c === "term1" || c === "term1exam" || c === "termi") return { score: s.term1, max: s.term1Max };
    if (c === "ut3" || c === "unittest3") return { score: s.ut3, max: s.ut3Max };
    if (c === "ut4" || c === "unittest4") return { score: s.ut4, max: s.ut4Max };
    if (c === "term2" || c === "term2exam" || c === "termii") return { score: s.term2, max: s.term2Max };
    return { score: null, max: null };
  };

  const totalCols =
    (hasT1 ? slots.term1.length + 1 : 0) +
    (hasT2 ? slots.term2.length + 1 : 0) +
    2; // Subject column + Grade column

  return (
    <div className="report-card-wrapper">
      {/* Top Action Bar (Hidden on print) */}
      <div className="report-card-actions no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Academic Performance Evaluation
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
            <span>Print Report Card</span>
          </button>
          {showCloseButton && onClose && (
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

      {/* ─── Official Printable Sheet ─── */}
      <div className="report-card-sheet" id="printable-report-card">
        {/* Header Section: Logo on Top-Left Corner, School Text Fully Centered */}
        <div className="rc-header">
          {student.school.logoUrl ? (
            <div className="rc-logo-wrap">
              <img
                src={student.school.logoUrl}
                alt={student.school.name}
                className="rc-school-logo"
              />
            </div>
          ) : (
            <div className="rc-logo-placeholder">
              <FileText size={32} color="#991b1b" />
            </div>
          )}

          <div className="rc-school-info">
            {student.school.trustName && (
              <div className="rc-trust-name">{student.school.trustName}</div>
            )}
            <h1 className="rc-school-name">{student.school.name}</h1>
            {student.school.address && (
              <div className="rc-school-address">{student.school.address}</div>
            )}
            <div className="rc-sub-title">
              REPORT CARD ({student.academicYear || "2025–2026"})
            </div>
          </div>

          <div className="rc-header-divider" />
        </div>

        {/* Student Profile Box */}
        <div className="rc-student-card">
          <div className="rc-student-grid">
            <div className="rc-grid-item">
              <span className="rc-label">Name:</span>
              <span className="rc-val rc-capitalize">{student.fullName}</span>
            </div>
            <div className="rc-grid-item">
              <span className="rc-label">Roll No:</span>
              <span className="rc-val">{student.rollNumber || "—"}</span>
            </div>

            <div className="rc-grid-item">
              <span className="rc-label">Class:</span>
              <span className="rc-val">
                {student.section
                  ? `${student.section.className} — Sec ${student.section.name}`
                  : "Unassigned"}
              </span>
            </div>
            <div className="rc-grid-item">
              <span className="rc-label">Admission No:</span>
              <span className="rc-val rc-monospace">{student.admissionNo}</span>
            </div>

            <div className="rc-grid-item">
              <span className="rc-label">Father:</span>
              <span className="rc-val rc-capitalize">{student.fatherName || "—"}</span>
            </div>
            <div className="rc-grid-item">
              <span className="rc-label">DOB:</span>
              <span className="rc-val">{formatDate(student.dob)}</span>
            </div>

            <div className="rc-grid-item">
              <span className="rc-label">Mother:</span>
              <span className="rc-val rc-capitalize">{student.motherName || "—"}</span>
            </div>
            <div className="rc-grid-item">
              <span className="rc-label">Board:</span>
              <span className="rc-val">{student.school.boardType}</span>
            </div>
          </div>

          {/* Student Photo Box */}
          <div className="rc-photo-box">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.fullName} className="rc-photo-img" />
            ) : (
              <span className="rc-photo-placeholder">Photo</span>
            )}
          </div>
        </div>

        {/* Marks Table with Dynamic Slot Columns and Centered Layout */}
        <div className="rc-table-wrap">
          <table className="rc-marks-table">
            <thead>
              {/* Top Colored Band */}
              <tr>
                <th rowSpan={2} className="rc-th-subject">
                  SUBJECT
                </th>
                {hasT1 && (
                  <th colSpan={slots.term1.length + 1} className="rc-th-term1">
                    TERM 1
                  </th>
                )}
                {hasT2 && (
                  <th colSpan={slots.term2.length + 1} className="rc-th-term2">
                    TERM 2
                  </th>
                )}
                <th rowSpan={2} className="rc-th-grade">
                  GRADE
                </th>
              </tr>

              {/* Sub Columns for Visible Slots with Real Max Scores */}
              <tr>
                {hasT1 && (
                  <>
                    {slots.term1.map((slot) => (
                      <th key={slot.code} className="rc-th-t1-sub">
                        {slot.name}
                        {!slot.isVaryingMax && (
                          <>
                            <br />
                            <span className="rc-th-max">({slot.maxScore})</span>
                          </>
                        )}
                      </th>
                    ))}
                    <th className="rc-th-t1-sub rc-th-total">
                      TOTAL
                      {!hasVaryingT1 && (
                        <>
                          <br />
                          <span className="rc-th-max">({slots.t1MaxTotal})</span>
                        </>
                      )}
                    </th>
                  </>
                )}

                {hasT2 && (
                  <>
                    {slots.term2.map((slot) => (
                      <th key={slot.code} className="rc-th-t2-sub">
                        {slot.name}
                        {!slot.isVaryingMax && (
                          <>
                            <br />
                            <span className="rc-th-max">({slot.maxScore})</span>
                          </>
                        )}
                      </th>
                    ))}
                    <th className="rc-th-t2-sub rc-th-total">
                      TOTAL
                      {!hasVaryingT2 && (
                        <>
                          <br />
                          <span className="rc-th-max">({slots.t2MaxTotal})</span>
                        </>
                      )}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                    No subject examination marks submitted yet.
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.subjectId}>
                    <td className="rc-td-subject rc-capitalize">{s.subjectName}</td>

                    {/* Visible Term 1 Slot Marks */}
                    {hasT1 && (
                      <>
                        {slots.term1.map((slot) => {
                          const { score, max } = getSlotScoreInfo(s, slot.code);
                          if (score === null) {
                            return <td key={slot.code} className="rc-num">—</td>;
                          }
                          return (
                            <td key={slot.code} className="rc-num">
                              {slot.isVaryingMax ? `${score}/${max ?? slot.maxScore}` : score}
                            </td>
                          );
                        })}
                        <td className="rc-num rc-bold">
                          {s.term1Total !== null
                            ? hasVaryingT1
                              ? `${s.term1Total}/${s.term1TotalMax ?? slots.t1MaxTotal}`
                              : s.term1Total
                            : "—"}
                        </td>
                      </>
                    )}

                    {/* Visible Term 2 Slot Marks */}
                    {hasT2 && (
                      <>
                        {slots.term2.map((slot) => {
                          const { score, max } = getSlotScoreInfo(s, slot.code);
                          if (score === null) {
                            return <td key={slot.code} className="rc-num">—</td>;
                          }
                          return (
                            <td key={slot.code} className="rc-num">
                              {slot.isVaryingMax ? `${score}/${max ?? slot.maxScore}` : score}
                            </td>
                          );
                        })}
                        <td className="rc-num rc-bold">
                          {s.term2Total !== null
                            ? hasVaryingT2
                              ? `${s.term2Total}/${s.term2TotalMax ?? slots.t2MaxTotal}`
                              : s.term2Total
                            : "—"}
                        </td>
                      </>
                    )}

                    <td className="rc-grade-cell">{s.grade}</td>
                  </tr>
                ))
              )}

              {/* Grand Total Summary Row */}
              <tr className="rc-grand-total-row">
                <td className="rc-td-subject rc-bold">Grand Total</td>
                {hasT1 && hasT2 ? (
                  <>
                    <td colSpan={slots.term1.length + 1} className="rc-center rc-bold">
                      {summary.totalGrandScore} / {summary.totalGrandMax}
                    </td>
                    <td colSpan={slots.term2.length + 1} className="rc-center rc-bold">
                      {summary.overallPercentage}%
                    </td>
                  </>
                ) : hasT1 ? (
                  <td colSpan={slots.term1.length + 1} className="rc-center rc-bold">
                    {summary.totalGrandScore} / {summary.totalGrandMax} &nbsp; ({summary.overallPercentage}%)
                  </td>
                ) : hasT2 ? (
                  <td colSpan={slots.term2.length + 1} className="rc-center rc-bold">
                    {summary.totalGrandScore} / {summary.totalGrandMax} &nbsp; ({summary.overallPercentage}%)
                  </td>
                ) : (
                  <td className="rc-center rc-bold">—</td>
                )}
                <td className="rc-grade-cell rc-bold">{summary.overallGrade}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attendance Table (Centered Columns) */}
        <div className="rc-table-wrap" style={{ marginTop: "16px" }}>
          <table className="rc-attendance-table">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>SESSION</th>
                <th style={{ width: "25%" }}>WORKING DAYS</th>
                <th style={{ width: "25%" }}>PRESENT</th>
                <th style={{ width: "25%" }}>ATTENDANCE %</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((att) => (
                <tr key={att.exam}>
                  <td className="rc-bold">{att.exam}</td>
                  <td>{att.workingDays}</td>
                  <td>{att.present}</td>
                  <td className="rc-bold">{att.attendancePct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Remarks Section */}
        <div className="rc-remarks-section">
          <strong>Remarks:</strong> {remarks}
        </div>

        {/* Grading Scale Band (Centered Table) */}
        <div className="rc-grading-scale-wrap">
          <div className="rc-grading-header">GRADING SCALE</div>
          <table className="rc-grading-table">
            <thead>
              <tr>
                {gradingScale.map((g) => (
                  <th key={g.grade}>{g.grade}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {gradingScale.map((g) => (
                  <td key={g.grade}>{g.minScore}-{g.maxScore}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures Section (Page Footer pinned to bottom) */}
        <div className="rc-signatures-grid">
          <div className="rc-signature-col">
            <div className="rc-sig-line" />
            <div className="rc-sig-label">Parent</div>
          </div>
          <div className="rc-signature-col">
            <div className="rc-sig-line" />
            <div className="rc-sig-label">Class Teacher</div>
          </div>
          <div className="rc-signature-col">
            {student.school.principalName && (
              <div className="rc-principal-name">{student.school.principalName}</div>
            )}
            <div className="rc-sig-line" />
            <div className="rc-sig-label">Principal</div>
          </div>
        </div>
      </div>

      {/* Scoped CSS styling matching reference layout exactly & print layout */}
      <style jsx>{`
        .report-card-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .report-card-actions {
          width: 100%;
          max-width: 800px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          margin-bottom: 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .report-card-sheet {
          width: 100%;
          max-width: 800px;
          min-height: 1050px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 24px 32px 32px 32px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Header Layout: Logo on top-left corner, School Text strictly Centered */
        .rc-header {
          position: relative;
          text-align: center;
          margin-bottom: 14px;
        }
        .rc-logo-wrap,
        .rc-logo-placeholder {
          position: absolute;
          left: 0;
          top: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .rc-school-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .rc-school-info {
          text-align: center;
          padding: 0 48px; /* Avoid collision with absolute corner logo */
        }
        .rc-trust-name {
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 3px;
          letter-spacing: 0.3px;
        }
        .rc-school-name {
          margin: 0;
          font-size: 23px;
          font-weight: 800;
          color: #991b1b;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-family: Georgia, serif;
          line-height: 1.2;
        }
        .rc-school-address {
          font-size: 11px;
          color: #334155;
          margin-top: 3px;
          font-weight: 500;
          line-height: 1.3;
        }
        .rc-sub-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          margin-top: 3px;
          letter-spacing: 0.5px;
        }
        .rc-header-divider {
          height: 2px;
          background: #2563eb;
          margin-top: 14px;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Student Details Card */
        .rc-student-card {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 12px 18px;
          margin-top: 14px;
          margin-bottom: 16px;
          gap: 16px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-student-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 24px;
          font-size: 12.5px;
        }
        .rc-grid-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .rc-label {
          font-weight: 700;
          color: #0f172a;
          min-width: 95px;
        }
        .rc-val {
          color: #334155;
          font-weight: 500;
        }
        .rc-capitalize {
          text-transform: capitalize;
        }
        .rc-monospace {
          font-family: monospace;
          font-weight: 600;
        }
        .rc-photo-box {
          width: 72px;
          height: 86px;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          flex-shrink: 0;
          overflow: hidden;
        }
        .rc-photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .rc-photo-placeholder {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Tables Common: Center Aligned */
        .rc-table-wrap {
          width: 100%;
          overflow-x: auto;
        }
        .rc-marks-table,
        .rc-attendance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
          text-align: center;
        }
        .rc-marks-table th,
        .rc-marks-table td,
        .rc-attendance-table th,
        .rc-attendance-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Marks Table Headers */
        .rc-th-subject {
          background-color: #14532d !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 11px;
          width: 18%;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-th-term1 {
          background-color: #15803d !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-th-t1-sub {
          background-color: #16a34a !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 10.5px;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-th-term2 {
          background-color: #1d4ed8 !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-th-t2-sub {
          background-color: #2563eb !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 10.5px;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-th-total {
          background-color: rgba(0, 0, 0, 0.15) !important;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-th-max {
          font-size: 9.5px;
          font-weight: 500;
          opacity: 0.9;
        }
        .rc-th-grade {
          background-color: #ea580c !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 11px;
          width: 10%;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Marks Table Cells: Center Aligned */
        .rc-td-subject {
          text-align: center !important;
          font-weight: 600;
          color: #0f172a;
        }
        .rc-num {
          text-align: center !important;
          color: #334155;
        }
        .rc-grade-cell {
          text-align: center !important;
          font-weight: 700;
          color: #1d4ed8;
        }
        .rc-grand-total-row {
          background-color: #fef9c3 !important;
          font-size: 12px;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-grand-total-row td {
          background-color: #fef9c3 !important;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-center {
          text-align: center !important;
        }
        .rc-bold {
          font-weight: 700;
        }

        /* Attendance Table: Center Aligned */
        .rc-attendance-table th {
          background-color: #1d4ed8 !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 11px;
          padding: 6px;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-attendance-table td {
          text-align: center !important;
        }

        /* Remarks */
        .rc-remarks-section {
          font-size: 12px;
          color: #1e40af;
          margin: 14px 0 14px 0;
          font-weight: 700;
        }

        /* Grading Scale Band (Centered Table) */
        .rc-grading-scale-wrap {
          border: 1px solid #7e22ce;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-grading-header {
          background-color: #6b21a8 !important;
          color: #ffffff !important;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          padding: 4px 0;
          letter-spacing: 0.5px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-grading-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
          text-align: center;
        }
        .rc-grading-table th {
          background-color: #f3e8ff !important;
          color: #581c87 !important;
          font-weight: 700;
          padding: 4px;
          border: 1px solid #e9d5ff;
          text-align: center !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .rc-grading-table td {
          padding: 4px;
          color: #374151;
          border: 1px solid #e9d5ff;
          text-align: center !important;
        }

        /* Signatures Grid (True Page Footer pinned to bottom) */
        .rc-signatures-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          padding: 24px 16px 8px 16px;
        }
        .rc-signature-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 140px;
        }
        .rc-principal-name {
          font-size: 11.5px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .rc-sig-line {
          width: 100%;
          border-bottom: 1.5px solid #0f172a;
          margin-bottom: 6px;
        }
        .rc-sig-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #0f172a;
        }

        /* ─── PRINT SPECIFIC RULES ─── */
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-card,
          #printable-report-card * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            height: 277mm !important;
            min-height: 277mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .rc-signatures-grid {
            margin-top: auto !important;
            padding-bottom: 4mm !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
        }
      `}</style>
    </div>
  );
}
