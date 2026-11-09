"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  UserPlus,
  Sparkles,
  CheckCircle2,
  UserX,
  Clock,
  Eye,
  Search,
  Users,
  Archive,
  ArchiveRestore,
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
  isActive?: boolean;
  archivedAt?: string | null;
  archivedReason?: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<"active" | "archived" | "all">("active");
  const [archiveModalStudent, setArchiveModalStudent] = useState<StudentData | null>(null);
  const [archiveReason, setArchiveReason] = useState("GRADUATED");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudents = async () => {
    const params = new URLSearchParams();
    if (filterSection) params.set("sectionId", filterSection);
    params.set("status", statusTab);
    const res = await fetch(`/api/students?${params.toString()}`);
    if (res.ok) {
      setStudents(await res.json());
    }
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
    let ignore = false;
    fetch("/api/sections")
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setSections(data);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const params = new URLSearchParams();
        if (filterSection) params.set("sectionId", filterSection);
        params.set("status", statusTab);
        const statsUrl = filterSection
          ? `/api/students/stats?sectionId=${encodeURIComponent(filterSection)}`
          : "/api/students/stats";

        const [studRes, statsRes] = await Promise.all([
          fetch(`/api/students?${params.toString()}`),
          fetch(statsUrl),
        ]);

        if (!ignore && studRes.ok) {
          const studData = await studRes.json();
          setStudents(studData);
        }
        if (!ignore && statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Failed to load student data/stats", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [filterSection, statusTab]);

  const handleArchive = async () => {
    if (!archiveModalStudent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${archiveModalStudent.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: archiveReason }),
      });
      if (res.ok) {
        setArchiveModalStudent(null);
        await fetchStudents();
        await fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to archive student");
      }
    } catch (err) {
      console.error(err);
      alert("Error archiving student");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (student: StudentData) => {
    if (!confirm(`Are you sure you want to restore student "${student.fullName}" to active status?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${student.id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchStudents();
        await fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to restore student");
      }
    } catch (err) {
      console.error(err);
      alert("Error restoring student");
    } finally {
      setActionLoading(false);
    }
  };

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

  // Live client-side search filtering
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        (s.section && `${s.section.class.name} ${s.section.name}`.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const unassignedCount = students.filter((s) => !s.section).length;

  if (loading) {
    return (
      <div className="office-page-container" style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "15px" }}>
          <Sparkles size={20} className="animate-spin" color="#1e3a8a" />
          <span>Loading student directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Office Page Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Student Directory</h1>
          <p className="office-subtitle">
            Search student records, manage class assignments, and track daily attendance
          </p>
        </div>
        <div className="office-actions-bar">
          <Link href="/admin/students/new" className="office-btn office-btn-primary">
            <UserPlus size={16} />
            <span>New Admission</span>
          </Link>
        </div>
      </div>

      {/* ─── Essential Metric Highlights ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
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
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Students</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{stats.totalStudents}</div>
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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Present Today</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>{stats.presentToday}</div>
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
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserX size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Absent Today</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dc2626" }}>{stats.absentToday}</div>
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
              background: "#fffbeb",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Not Marked Yet</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#d97706" }}>{stats.notMarkedToday}</div>
          </div>
        </div>
      </div>

      {/* ─── Status Tabs ─── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={() => setStatusTab("active")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            backgroundColor: statusTab === "active" ? "#1e3a8a" : "#f1f5f9",
            color: statusTab === "active" ? "#ffffff" : "#475569",
          }}
        >
          Active Students
        </button>
        <button
          onClick={() => setStatusTab("archived")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            backgroundColor: statusTab === "archived" ? "#1e3a8a" : "#f1f5f9",
            color: statusTab === "archived" ? "#ffffff" : "#475569",
          }}
        >
          Archived & Alumni
        </button>
        <button
          onClick={() => setStatusTab("all")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "13px",
            border: "none",
            cursor: "pointer",
            backgroundColor: statusTab === "all" ? "#1e3a8a" : "#f1f5f9",
            color: statusTab === "all" ? "#ffffff" : "#475569",
          }}
        >
          All Records
        </button>
      </div>

      {/* ─── Search & Class Filter Bar ─── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: 1 }}>
          {/* Text Search Input */}
          <div className="office-search-wrapper" style={{ flex: 1, minWidth: "240px", maxWidth: "380px" }}>
            <Search size={16} className="office-search-icon" />
            <input
              type="text"
              placeholder="Search by student name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="office-input office-search-input"
              style={{ width: "100%" }}
            />
          </div>

          {/* Section Filter */}
          <select
            className="office-select"
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            style={{ minWidth: "220px" }}
          >
            <option value="">All Class Sections</option>
            <option value="unassigned">⚠️ Unassigned Students ({unassignedCount})</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class.name} — Section {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: "13px", color: "#64748b" }}>
          Showing <strong>{filteredStudents.length}</strong> of {students.length} students
        </div>
      </div>

      {/* ─── Students Roster Table ─── */}
      <div className="office-table-wrapper">
        <table className="office-table">
          <thead>
            <tr>
              <th style={{ width: "130px" }}>Adm. No.</th>
              <th>Student Name</th>
              <th style={{ width: "220px" }}>Class & Section</th>
              <th style={{ width: "120px" }}>Date of Birth</th>
              <th style={{ width: "140px" }}>Status</th>
              <th style={{ width: "180px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ maxWidth: "360px", margin: "0 auto" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "#eff6ff",
                        color: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                      }}
                    >
                      <Users size={24} />
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                      {searchQuery ? "No matching students found" : "No students in this list"}
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                      {searchQuery
                        ? `No student matching "${searchQuery}". Check the spelling or try searching by admission number.`
                        : filterSection === "unassigned"
                        ? "Great news! Every enrolled student has been assigned to a class section."
                        : "Ready to enroll new students into the school system?"}
                    </p>
                    <Link href="/admin/students/new" className="office-btn office-btn-primary office-btn-sm">
                      <UserPlus size={14} />
                      <span>New Admission</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => {
                const isUpdating = updatingStudentId === s.id;
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: "#1e3a8a" }}>
                      {s.admissionNo}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt={s.fullName}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "1px solid #e2e8f0",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#eff6ff",
                              color: "#1e3a8a",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "13px",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {s.fullName.charAt(0)}
                          </div>
                        )}
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{s.fullName}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <select
                          className="office-select"
                          value={s.section?.id || "unassigned"}
                          onChange={(e) => handleSectionChange(s.id, e.target.value)}
                          disabled={isUpdating}
                          style={{
                            height: "34px",
                            fontSize: "12.5px",
                            padding: "4px 8px",
                            borderColor: s.section ? "#cbd5e1" : "#f59e0b",
                            background: s.section ? "#ffffff" : "#fffbeb",
                            color: s.section ? "#0f172a" : "#b45309",
                            fontWeight: s.section ? 500 : 600,
                            maxWidth: "210px",
                          }}
                        >
                          <option value="unassigned">⚠️ Unassigned</option>
                          {sections.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.class.name} — Section {sec.name}
                            </option>
                          ))}
                        </select>
                        {isUpdating && <Sparkles size={14} className="animate-spin" color="#1e3a8a" />}
                      </div>
                    </td>
                    <td style={{ color: "#475569", fontSize: "13px" }}>
                      {formatDate(s.dob)}
                    </td>
                    <td>
                      {s.isActive === false ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                          }}
                          title={`Archived: ${s.archivedReason || "N/A"}`}
                        >
                          <Archive size={11} />
                          Archived ({s.archivedReason || "Alumni"})
                        </span>
                      ) : (
                        <span className="office-pill office-pill-blue">
                          Active ({s.academicYear})
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="office-btn office-btn-secondary office-btn-sm"
                        >
                          <Eye size={13} />
                          <span>Profile</span>
                        </Link>
                        {s.isActive === false ? (
                          <button
                            onClick={() => handleRestore(s)}
                            disabled={actionLoading}
                            className="office-btn office-btn-secondary office-btn-sm"
                            style={{ color: "#059669", borderColor: "#a7f3d0", cursor: "pointer" }}
                            title="Restore student to active"
                          >
                            <ArchiveRestore size={13} />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setArchiveModalStudent(s)}
                            disabled={actionLoading}
                            className="office-btn office-btn-secondary office-btn-sm"
                            style={{ color: "#dc2626", borderColor: "#fecaca", cursor: "pointer" }}
                            title="Archive student"
                          >
                            <Archive size={13} />
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Archive Modal */}
      {archiveModalStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "450px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
              Archive Student Record
            </h3>
            <p style={{ fontSize: "14px", color: "#475569", marginBottom: "16px" }}>
              Archiving <strong>{archiveModalStudent.fullName}</strong> ({archiveModalStudent.admissionNo}) will remove them from active class rosters and billing while preserving their academic history, certificates, and grades.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Reason for Archiving:
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                }}
              >
                <option value="GRADUATED">Graduated / Alumni</option>
                <option value="TRANSFERRED">Transferred to Another School</option>
                <option value="WITHDRAWN">Withdrawn by Parent / Guardian</option>
                <option value="OTHER">Other / Administrative</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setArchiveModalStudent(null)}
                disabled={actionLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={actionLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {actionLoading ? "Archiving..." : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
