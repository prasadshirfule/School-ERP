"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Award, FileText, Download } from "lucide-react";
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
          if (!selectedStudentId && data.length > 0) {
            setSelectedStudentId(data[0].id);
          }
        }
      });
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/students/${selectedStudentId}/report-card`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.student) {
          setReportCardData(data);
        } else {
          setReportCardData(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setReportCardData(null);
        setLoading(false);
      });
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Official Report Cards</h1>
          <p className="page-subtitle">View term-wise marks evaluation, attendance summary, and download official report card PDF.</p>
        </div>
      </div>

      {students.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`btn ${selectedStudentId === s.id ? "btn-primary" : "btn-secondary"}`}
            >
              {s.fullName} ({s.section ? `${s.section.class.name}-${s.section.name}` : "Enrolled"})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">
          <Sparkles size={18} className="animate-spin" /> Loading official report card...
        </div>
      ) : !reportCardData ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <Award size={26} color="#fbbf24" />
            </div>
            <div className="empty-state-title">Report Card Not Available</div>
            <p className="empty-state-text">
              Marks evaluation has not been published yet for {selectedStudent?.fullName || "your child"}.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Summary Banner */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrap stat-icon-coral">
                <Award size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{reportCardData.summary.overallPercentage}%</span>
                <span className="stat-label">Cumulative Score</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap stat-icon-teal">
                <Award size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{reportCardData.summary.overallGrade}</span>
                <span className="stat-label">Final Evaluation Grade</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "16px", overflowX: "auto" }}>
            <ReportCardView data={reportCardData} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentReportCardsPage() {
  return (
    <Suspense fallback={<div className="loading"><Sparkles size={18} className="animate-spin" /> Loading...</div>}>
      <ReportCardsContent />
    </Suspense>
  );
}

