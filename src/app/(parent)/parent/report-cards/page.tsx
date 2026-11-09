"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Award } from "lucide-react";
import ReportCardView, { ReportCardPayload } from "@/components/ReportCardView";

interface Student {
  id: string;
  fullName: string;
  admissionNo: string;
  section?: { name: string; class: { name: string } };
}

function ReportCardsContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [reportCardData, setReportCardData] = useState<ReportCardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data: Student[]) => {
        if (Array.isArray(data)) {
          setStudents(data);
          if (data.length > 0) {
            setSelectedStudentId((prev) => prev || data[0].id);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }
    let ignore = false;
    fetch(`/api/students/${selectedStudentId}/report-card`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) {
          if (data && data.student) {
            setReportCardData(data);
          } else {
            setReportCardData(null);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setReportCardData(null);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Official Student Report Cards</h1>
          <p className="office-subtitle">
            View term examination evaluations, subject-wise scores, and download printable report cards
          </p>
        </div>
      </div>

      {students.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`office-btn office-btn-sm ${selectedStudentId === s.id ? "office-btn-primary" : "office-btn-secondary"}`}
            >
              <span>{s.fullName}</span>
              <span style={{ fontSize: "11px", opacity: 0.8 }}>
                ({s.section ? `${s.section.class.name}-${s.section.name}` : "Enrolled"})
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="office-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading official report card...</div>
        </div>
      ) : !reportCardData ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <Award size={36} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Report Card Not Available</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
            Term examination marks have not been published yet for {selectedStudent?.fullName || "your child"}.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Summary Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "8px",
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Award size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Cumulative Score</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a8a" }}>
                  {reportCardData.summary?.overallPercentage ?? 0}%
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "8px",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Award size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Final Grade</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>
                  {reportCardData.summary?.overallGrade ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="office-card" style={{ padding: "20px", overflowX: "auto" }}>
            <ReportCardView data={reportCardData} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentReportCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={20} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading report cards...</div>
        </div>
      }
    >
      <ReportCardsContent />
    </Suspense>
  );
}
