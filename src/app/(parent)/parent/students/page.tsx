"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  User,
  Calendar,
  MapPin,
  HeartHandshake,
  CheckCircle2,
  Receipt,
  Award,
  UserPlus,
  Clock,
  AlertCircle,
  X,
  School,
} from "lucide-react";

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

type LinkRequest = {
  id: string;
  admissionNo: string;
  relationship: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
  school: { id: string; name: string };
  student?: { fullName: string };
};

export default function ParentStudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    schoolId: "",
    admissionNo: "",
    studentDob: "",
    relationship: "Father",
    notes: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, reqsRes, schoolsRes] = await Promise.all([
        fetch("/api/parent/students"),
        fetch("/api/parent/link-requests"),
        fetch("/api/schools"),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(Array.isArray(data) ? data : []);
      }
      if (reqsRes.ok) {
        const data = await reqsRes.json();
        setLinkRequests(data.requests || []);
      }
      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      }
    } catch (err: unknown) {
      console.error("Error loading parent students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [studentsRes, reqsRes, schoolsRes] = await Promise.all([
          fetch("/api/parent/students"),
          fetch("/api/parent/link-requests"),
          fetch("/api/schools"),
        ]);

        if (!ignore && studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(Array.isArray(data) ? data : []);
        }
        if (!ignore && reqsRes.ok) {
          const data = await reqsRes.json();
          setLinkRequests(data.requests || []);
        }
        if (!ignore && schoolsRes.ok) {
          const schoolsData = await schoolsRes.json();
          setSchools(Array.isArray(schoolsData) ? schoolsData : []);
          if (schoolsData.length > 0) {
            setFormData((prev) => (prev.schoolId ? prev : { ...prev, schoolId: schoolsData[0].id }));
          }
        }
      } catch (err: unknown) {
        console.error("Error loading parent students:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/parent/link-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit student link request");
      }

      setNotification({
        type: "success",
        text: "Student link request submitted successfully. The school administration has been notified.",
      });
      setIsModalOpen(false);
      setFormData({
        schoolId: schools[0]?.id || "",
        admissionNo: "",
        studentDob: "",
        relationship: "Father",
        notes: "",
      });
      await loadData();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
        <div style={{ color: "#64748b", fontSize: "14px" }}>Loading children&apos;s profiles...</div>
      </div>
    );
  }

  const pendingRequests = linkRequests.filter((r) => r.status === "PENDING");

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">My Children</h1>
          <p className="office-subtitle">
            Enrolled student profiles, classroom sections, and quick links to academic records
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <UserPlus size={16} />
          <span>Link Another Child</span>
        </button>
      </div>

      {notification && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: notification.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${notification.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: notification.type === "success" ? "#065f46" : "#b91c1c",
          }}
        >
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ─── Pending Verification Requests Banner ─── */}
      {pendingRequests.length > 0 && (
        <div
          className="office-card"
          style={{
            marginBottom: "24px",
            padding: "16px 20px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fcd34d",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Clock size={16} color="#d97706" />
            <span style={{ fontWeight: 700, fontSize: "13.5px", color: "#92400e" }}>
              Pending School Link Requests ({pendingRequests.length})
            </span>
          </div>
          <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "#78350f" }}>
            The following student connection requests are currently being reviewed by the school office:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingRequests.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: "#fff",
                  border: "1px solid #fef3c7",
                  fontSize: "13px",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    Admission No: {r.admissionNo}
                  </span>
                  {r.student?.fullName && (
                    <span style={{ color: "#475569" }}> ({r.student.fullName})</span>
                  )}
                  <span style={{ color: "#64748b", fontSize: "12px" }}> • {r.school.name}</span>
                </div>
                <span className="office-pill office-pill-blue">Awaiting Approval</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {students.length === 0 && pendingRequests.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <HeartHandshake size={36} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>No Children Linked Yet</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "6px 0 16px 0" }}>
            Link your child&apos;s admission number and school to access report cards, daily attendance, and online fee payments.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <UserPlus size={16} />
            <span>Link Your Child Now</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
          {students.map((s) => (
            <div key={s.id} className="office-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: s.photoUrl ? `url(${s.photoUrl}) center/cover no-repeat` : "#eff6ff",
                    color: "#1e3a8a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "2px solid #bfdbfe",
                    fontWeight: 700,
                    fontSize: "18px",
                  }}
                >
                  {!s.photoUrl && s.fullName.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{s.fullName}</h3>
                    <span className="office-pill office-pill-blue">
                      {s.relationship || "Student"}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                    Admission: <span style={{ fontWeight: 600, color: "#0f172a" }}>{s.admissionNo}</span>
                    {s.rollNumber && <> • Roll: {s.rollNumber}</>}
                  </div>
                  <div style={{ fontSize: "13px", color: "#1e3a8a", fontWeight: 600, marginTop: "2px" }}>
                    {s.section ? `${s.section.class.name} - ${s.section.name}` : "Not Assigned"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                }}
              >
                <div>
                  <div style={{ color: "#64748b" }}>Academic Year</div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{s.academicYear}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b" }}>Class Teacher</div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>
                    {s.section?.classTeacher?.fullName || "Not Assigned"}
                  </div>
                </div>
                {s.dob && (
                  <div>
                    <div style={{ color: "#64748b" }}>Date of Birth</div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                      {new Date(s.dob).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {s.bloodGroup && (
                  <div>
                    <div style={{ color: "#64748b" }}>Blood Group</div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{s.bloodGroup}</div>
                  </div>
                )}
              </div>

              {/* Navigation Shortcuts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "auto" }}>
                <Link
                  href={`/parent/attendance?studentId=${s.id}`}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px" }}
                >
                  <Calendar size={14} />
                  <span>Attendance</span>
                </Link>
                <Link
                  href={`/parent/report-cards?studentId=${s.id}`}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px" }}
                >
                  <Award size={14} />
                  <span>Report Card</span>
                </Link>
                <Link
                  href={`/parent/fees?studentId=${s.id}`}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px" }}
                >
                  <Receipt size={14} />
                  <span>Fee Invoices</span>
                </Link>
                <Link
                  href={`/parent/students/${s.id}`}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px" }}
                >
                  <span>Full Profile</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Link Request Modal ─── */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            className="office-card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "#eff6ff",
                    color: "#1e3a8a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                  Link Student to Parent Portal
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
              Submit your child&apos;s admission details. The school administrative office will verify and authorize access.
            </p>

            <form onSubmit={handleLinkSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Select Enrolled School *
                </label>
                <select
                  required
                  className="form-input"
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                >
                  {schools.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Student Admission Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADM-2026-0042"
                  className="form-input"
                  value={formData.admissionNo}
                  onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Student Date of Birth (for verification)
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.studentDob}
                  onChange={(e) => setFormData({ ...formData, studentDob: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Relationship to Student *
                </label>
                <select
                  className="form-input"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Legal Guardian</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Registered with father phone number"
                  className="form-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
