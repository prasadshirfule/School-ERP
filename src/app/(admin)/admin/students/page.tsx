"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  UserPlus,
  Sparkles,
  CheckCircle2,
  UserX,
  Clock,
  Eye,
} from "lucide-react";
import { formatDate } from "@/lib/formatDate";

type StudentData = {
  id: string;
  admissionNo: string;
  fullName: string;
  dob: string;
  academicYear: string;
  gender?: string | null;
  sectionId?: string | null;
  photoUrl?: string | null;
  section?: { id: string; name: string; class: { name: string } } | null;
};

type SectionOption = {
  id: string;
  name: string;
  class: { name: string };
};

type StudentStats = {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  notMarkedToday: number;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [stats, setStats] = useState<StudentStats>({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    notMarkedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState("");
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  const fetchStudents = async () => {
    const url = filterSection ? `/api/students?sectionId=${filterSection}` : "/api/students";
    const res = await fetch(url);
    if (res.ok) {
      setStudents(await res.json());
    }
    setLoading(false);
  };

  const fetchSections = async () => {
    const res = await fetch("/api/sections");
    if (res.ok) {
      setSections(await res.json());
    }
  };

  const fetchStats = async () => {
    try {
      const url = filterSection
        ? `/api/students/stats?sectionId=${encodeURIComponent(filterSection)}`
        : "/api/students/stats";
      const res = await fetch(url);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Failed to load student stats", err);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, [filterSection]);

  const handleSectionChange = async (studentId: string, newSectionId: string) => {
    setUpdatingStudentId(studentId);
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sectionId: newSectionId === "unassigned" ? null : newSectionId,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, section: updated.section, sectionId: updated.sectionId } : s))
        );
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to update student section", err);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading students...
      </div>
    );
  }

  const unassignedCount = students.filter((s) => !s.section).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Admissions</h1>
          <p className="page-subtitle">Manage student enrollment, class allocations, and admission numbers</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            className="form-select"
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            style={{ width: "220px" }}
          >
            <option value="">All sections roster</option>
            <option value="unassigned">⚠️ Unassigned Students ({unassignedCount})</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class.name} - Section {s.name}
              </option>
            ))}
          </select>
          <Link href="/admin/students/new" className="btn btn-primary">
            <UserPlus size={16} />
            <span>Enroll Student</span>
          </Link>
        </div>
      </div>

      {/* ─── Student & Today's Attendance Stats Cards ─── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-indigo">
            <GraduationCap size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Students</span>
            <span className="stat-value">{stats.totalStudents}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Present Today</span>
            <span className="stat-value" style={{ color: "#34d399" }}>
              {stats.presentToday}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-rose">
            <UserX size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Absent Today</span>
            <span className="stat-value" style={{ color: "#f43f5e" }}>
              {stats.absentToday}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-amber">
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Not Marked Yet</span>
            <span className="stat-value" style={{ color: "#fbbf24" }}>
              {stats.notMarkedToday}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Students Roster Table ─── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: "130px", whiteSpace: "nowrap" }}>Adm. Number</th>
              <th>Student Name</th>
              <th style={{ width: "210px" }}>Class & Section</th>
              <th style={{ width: "120px", whiteSpace: "nowrap" }}>Date of Birth</th>
              <th style={{ width: "120px", whiteSpace: "nowrap" }}>Session</th>
              <th style={{ width: "90px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon-wrap">
                      <GraduationCap size={26} color="#818cf8" />
                    </div>
                    <div className="empty-state-title">No students found</div>
                    <p className="empty-state-text">
                      {filterSection === "unassigned"
                        ? "All students are assigned to a class section!"
                        : "Ready to add your first student? Enroll students to manage your school roster."}
                    </p>
                    <Link
                      href="/admin/students/new"
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: "10px" }}
                    >
                      <UserPlus size={14} />
                      <span>Enroll Student</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const isUpdating = updatingStudentId === s.id;
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "12.5px", fontWeight: 600, color: "#818cf8", whiteSpace: "nowrap" }}>
                      {s.admissionNo}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt={s.fullName}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "1px solid var(--border-color)",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: "var(--role-admin-light)",
                              color: "#818cf8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {s.fullName.charAt(0)}
                          </div>
                        )}
                        <span>{s.fullName}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <select
                          className="form-select"
                          value={s.section?.id || "unassigned"}
                          onChange={(e) => handleSectionChange(s.id, e.target.value)}
                          disabled={isUpdating}
                          style={{
                            height: "32px",
                            fontSize: "12.5px",
                            padding: "4px 8px",
                            borderColor: s.section ? "var(--border-color)" : "var(--role-accountant-border)",
                            background: s.section ? "var(--bg-input)" : "var(--role-accountant-light)",
                            color: s.section ? "var(--text-primary)" : "#fbbf24",
                            fontWeight: s.section ? 500 : 600,
                            maxWidth: "195px",
                          }}
                        >
                          <option value="unassigned">⚠️ Unassigned</option>
                          {sections.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.class.name} — Section {sec.name}
                            </option>
                          ))}
                        </select>
                        {isUpdating && <Sparkles size={14} className="animate-spin" color="#818cf8" />}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {formatDate(s.dob)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="badge badge-info" style={{ whiteSpace: "nowrap" }}>
                        <span className="badge-dot" />
                        <span>{s.academicYear}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="btn btn-sm btn-secondary"
                        style={{ height: "30px", fontSize: "12px", padding: "0 10px", gap: "5px" }}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
