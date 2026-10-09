"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, ArrowRight, Sparkles, User, Calendar, MapPin, Phone, ShieldCheck, HeartHandshake } from "lucide-react";

type StudentData = {
  id: string;
  fullName: string;
  admissionNo: string;
  rollNumber?: string;
  academicYear: string;
  relationship: string;
  gender?: string;
  bloodGroup?: string;
  dob?: string;
  photoUrl?: string;
  currentAddress?: string;
  fatherName?: string;
  motherName?: string;
  emergencyContactPhone?: string;
  section?: {
    name: string;
    class: { name: string };
    classTeacher?: { fullName: string };
  } | null;
};

export default function ParentStudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data) => {
        setStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading children's profiles...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Children</h1>
          <p className="page-subtitle">View your enrolled children, class information, and academic status.</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <HeartHandshake size={26} color="#fb7185" />
            </div>
            <div className="empty-state-title">No children linked to your account</div>
            <p className="empty-state-text">
              Please contact the school administrative office to link your parent account with your child's enrollment.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
          {students.map((s) => (
            <div key={s.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: s.photoUrl ? `url(${s.photoUrl}) center/cover no-repeat` : "#334155",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "2px solid #475569",
                  }}
                >
                  {!s.photoUrl && <GraduationCap size={28} color="#94a3b8" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{s.fullName}</h3>
                    <span className="badge badge-teal">
                      <span className="badge-dot" />
                      <span>{s.relationship}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {s.section ? `${s.section.class.name} — Section ${s.section.name}` : "Unassigned Section"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "2px" }}>
                    Adm: {s.admissionNo} {s.rollNumber && `• Roll: ${s.rollNumber}`}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem", padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>Academic Year</span>
                  <span style={{ fontWeight: 500 }}>{s.academicYear}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>Blood Group</span>
                  <span style={{ fontWeight: 500 }}>{s.bloodGroup || "—"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>Gender</span>
                  <span style={{ fontWeight: 500 }}>{s.gender || "—"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>Date of Birth</span>
                  <span style={{ fontWeight: 500 }}>{s.dob ? new Date(s.dob).toLocaleDateString("en-IN") : "—"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                <Link
                  href={`/parent/attendance?studentId=${s.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, textAlign: "center", justifyContent: "center" }}
                >
                  Attendance
                </Link>
                <Link
                  href={`/parent/fees?studentId=${s.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, textAlign: "center", justifyContent: "center" }}
                >
                  Fees
                </Link>
                <Link
                  href={`/parent/report-cards?studentId=${s.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, textAlign: "center", justifyContent: "center" }}
                >
                  Report Card
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
