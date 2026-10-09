"use client";

import { useEffect, useState } from "react";
import { CreditCard, Printer, Sparkles, CheckSquare, Square } from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  admissionNo: string;
  rollNumber: string | null;
  dob: string | null;
  gender: string;
  bloodGroup: string | null;
  emergencyContactPhone: string | null;
  address: string | null;
  photoUrl: string | null;
  section?: {
    id: string;
    name: string;
    class: {
      id: string;
      name: string;
    };
  };
  parents?: Array<{
    parent: {
      fullName: string;
      phone: string;
    };
  }>;
}

interface ClassItem {
  id: string;
  name: string;
  sections: Array<{ id: string; name: string }>;
}

export default function IdCardsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; boardType: string; affiliationNumber?: string }>({
    name: "Delhi Public Academy",
    boardType: "CBSE",
    affiliationNumber: "CBSE/AFF/2026/98214",
  });

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClasses(data);
          if (data.length > 0) {
            setSelectedClassId(data[0].id);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    setLoading(true);
    let url = `/api/students?classId=${selectedClassId}`;
    if (selectedSectionId) {
      url += `&sectionId=${selectedSectionId}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data);
          setSelectedStudentIds(new Set(data.map((s) => s.id)));
        } else {
          setStudents([]);
          setSelectedStudentIds(new Set());
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedClassId, selectedSectionId]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const selectedStudents = students.filter((s) => selectedStudentIds.has(s.id));

  return (
    <div>
      {/* Screen Only Controls */}
      <div className="no-print">
        <div className="page-header">
          <div>
            <h1 className="page-title">Student Identity Cards Studio</h1>
            <p className="page-subtitle">Generate and batch print high-resolution biometric student ID cards.</p>
          </div>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            disabled={selectedStudents.length === 0}
          >
            <Printer size={16} />
            <span>Print {selectedStudents.length} ID Cards</span>
          </button>
        </div>

        {/* Filters and Selection Bar */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <label className="label" style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Class</label>
                <select
                  className="input"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId("");
                  }}
                  style={{ minWidth: "160px" }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Section</label>
                <select
                  className="input"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  style={{ minWidth: "140px" }}
                >
                  <option value="">All Sections</option>
                  {currentClass?.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button onClick={toggleSelectAll} className="btn btn-secondary btn-sm">
                {selectedStudentIds.size === students.length ? (
                  <>
                    <CheckSquare size={14} /> Deselect All
                  </>
                ) : (
                  <>
                    <Square size={14} /> Select All ({students.length})
                  </>
                )}
              </button>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Selected: <strong>{selectedStudentIds.size}</strong> of {students.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <Sparkles size={18} className="animate-spin" /> Loading students for ID card layout...
        </div>
      ) : selectedStudents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <CreditCard size={26} color="#6366f1" />
            </div>
            <div className="empty-state-title">No Students Selected</div>
            <p className="empty-state-text">Select at least one student from the filters above to render ID cards.</p>
          </div>
        </div>
      ) : (
        /* ID Cards Grid (A4 Print Layout) */
        <div className="id-cards-grid">
          {selectedStudents.map((student) => {
            const parent = student.parents?.[0]?.parent;
            const initials = student.fullName
              ? student.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "ST";

            return (
              <div key={student.id} className="id-card-wrapper">
                {/* ID Card Front */}
                <div className="id-card-container">
                  {/* Card Header */}
                  <div className="id-card-header">
                    <div className="id-card-school-name">{schoolInfo.name}</div>
                    <div className="id-card-school-sub">
                      {schoolInfo.boardType} Affiliated • {schoolInfo.affiliationNumber}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="id-card-body">
                    {/* Photo Box */}
                    <div className="id-card-photo-box">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          className="id-card-photo"
                        />
                      ) : (
                        <div className="id-card-photo-placeholder">
                          {initials}
                        </div>
                      )}
                      <div className="id-card-badge-role">STUDENT</div>
                    </div>

                    {/* Student Info */}
                    <div className="id-card-details">
                      <div className="id-card-name">
                        {student.fullName}
                      </div>
                      
                      <div className="id-card-row">
                        <span className="id-card-label">Adm No:</span>
                        <span className="id-card-val">{student.admissionNo}</span>
                      </div>
                      
                      <div className="id-card-row">
                        <span className="id-card-label">Class:</span>
                        <span className="id-card-val">
                          {student.section?.class?.name} - {student.section?.name}
                        </span>
                      </div>

                      <div className="id-card-row">
                        <span className="id-card-label">Roll No:</span>
                        <span className="id-card-val">{student.rollNumber || "—"}</span>
                      </div>

                      <div className="id-card-row">
                        <span className="id-card-label">DOB:</span>
                        <span className="id-card-val">
                          {student.dob ? new Date(student.dob).toLocaleDateString("en-IN") : "—"}
                        </span>
                      </div>

                      <div className="id-card-row">
                        <span className="id-card-label">Blood Grp:</span>
                        <span className="id-card-val" style={{ color: "#ef4444", fontWeight: 700 }}>
                          {student.bloodGroup || "—"}
                        </span>
                      </div>

                      <div className="id-card-row">
                        <span className="id-card-label">Emergency:</span>
                        <span className="id-card-val">
                          {student.emergencyContactPhone || parent?.phone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="id-card-footer">
                    <div className="id-card-barcode">
                      ||| | |||| | ||| |||| | |||
                      <div style={{ fontSize: "7px", letterSpacing: "1px" }}>{student.admissionNo}</div>
                    </div>
                    <div className="id-card-sign">
                      <div className="id-card-sign-line" />
                      <div>Principal Sign</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Print CSS */}
      <style jsx global>{`
        .id-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 16px;
        }

        .id-card-wrapper {
          display: flex;
          justify-content: center;
        }

        .id-card-container {
          width: 330px;
          height: 215px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: linear-gradient(135deg, #1e2235 0%, #131722 100%);
          color: #f1f5f9;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .id-card-header {
          background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%);
          color: #ffffff;
          padding: 8px 12px;
          text-align: center;
        }

        .id-card-school-name {
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .id-card-school-sub {
          font-size: 0.65rem;
          opacity: 0.9;
        }

        .id-card-body {
          display: flex;
          padding: 10px 12px;
          gap: 12px;
          flex: 1;
        }

        .id-card-photo-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .id-card-photo, .id-card-photo-placeholder {
          width: 72px;
          height: 86px;
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          object-fit: cover;
        }

        .id-card-photo-placeholder {
          background: #2a3148;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: 700;
          color: #94a3b8;
        }

        .id-card-badge-role {
          font-size: 0.6rem;
          font-weight: 700;
          background: #3b82f6;
          color: #fff;
          padding: 1px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .id-card-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .id-card-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #38bdf8;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .id-card-row {
          display: flex;
          font-size: 0.72rem;
          line-height: 1.35;
        }

        .id-card-label {
          width: 68px;
          color: #94a3b8;
          font-weight: 500;
        }

        .id-card-val {
          font-weight: 600;
          color: #f8fafc;
        }

        .id-card-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
          padding: 4px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .id-card-barcode {
          font-family: monospace;
          font-size: 10px;
          letter-spacing: 2px;
          color: #94a3b8;
          line-height: 1;
        }

        .id-card-sign {
          font-size: 0.6rem;
          color: #94a3b8;
          text-align: center;
        }

        .id-card-sign-line {
          width: 50px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.4);
          margin-bottom: 2px;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .id-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12mm !important;
            padding: 10mm !important;
          }

          .id-card-container {
            border: 1px solid #ccc !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }

          .id-card-header {
            background: #1e3a8a !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .id-card-badge-role {
            background: #1e3a8a !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .id-card-name {
            color: #0f172a !important;
          }

          .id-card-label {
            color: #64748b !important;
          }

          .id-card-val {
            color: #0f172a !important;
          }

          .id-card-barcode {
            color: #334155 !important;
          }

          .id-card-footer {
            border-top: 1px solid #e2e8f0 !important;
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
