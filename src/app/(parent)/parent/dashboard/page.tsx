"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, GraduationCap, ArrowRight, Sparkles, HeartHandshake } from "lucide-react";

type StudentData = {
  id: string;
  fullName: string;
  admissionNo: string;
  academicYear: string;
  relationship: string;
  section?: { name: string; class: { name: string } } | null;
};

export default function ParentDashboard() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data) => { setStudents(data); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading your children's profiles...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Parent Workspace</h1>
          <p className="page-subtitle">Welcome! View your children's daily attendance records, fee statements, and school updates.</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <HeartHandshake size={26} color="#fb7185" />
            </div>
            <div className="empty-state-title">No children linked to your account</div>
            <p className="empty-state-text">No student profiles are currently linked to this parent email. Please reach out to your school administrative office for linkage.</p>
          </div>
        </div>
      ) : (
        <div className="stats-grid">
          {students.map((s) => (
            <Link key={s.id} href={`/parent/students/${s.id}`} style={{ textDecoration: "none" }}>
              <div className="stat-card" style={{ cursor: "pointer", alignItems: "flex-start", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <div className="stat-icon-wrap stat-icon-coral">
                    <GraduationCap size={22} />
                  </div>
                  <span className="badge badge-teal">
                    <span className="badge-dot" />
                    <span>{s.relationship}</span>
                  </span>
                </div>
                <div className="stat-info">
                  <span className="stat-value" style={{ fontSize: "18px" }}>{s.fullName}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500, marginTop: "2px" }}>
                    {s.section ? `${s.section.class.name} — Section ${s.section.name}` : "Unassigned Class & Section"}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "4px" }}>
                    {s.admissionNo} • Session {s.academicYear}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fb7185", fontSize: "12.5px", fontWeight: 600, marginTop: "4px" }}>
                  <span>View Student Profile & Fees</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
