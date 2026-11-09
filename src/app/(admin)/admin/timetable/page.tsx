"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, Sparkles, X, Save } from "lucide-react";

type Period = { id: string; periodNumber: number; label: string; startTime: string; endTime: string; isBreak: boolean };
type Section = { id: string; name: string; classId: string; class: { id: string; name: string }; academicYear: string };
type Subject = { id: string; name: string };
type Teacher = { id: string; fullName: string };
type Slot = {
  id: string;
  dayOfWeek: string;
  periodId: string;
  period: Period;
  subject: { id: string; name: string } | null;
  teacher: { id: string; fullName: string } | null;
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

export default function AdminTimetablePage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSection, setSelectedSection] = useState("");
  const [academicYear] = useState("2026-27");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState("");
  const [modalPeriodId, setModalPeriodId] = useState("");
  const [modalSubjectId, setModalSubjectId] = useState("");
  const [modalTeacherId, setModalTeacherId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/periods").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
    ]).then(([p, s, sub, t]) => {
      setPeriods(Array.isArray(p) ? p : []);
      const loadedSections = Array.isArray(s) ? s : [];
      setSections(loadedSections);
      if (loadedSections.length > 0 && !selectedSection) {
        setSelectedSection(loadedSections[0].id);
      }
      setSubjects(Array.isArray(sub) ? sub : []);
      setTeachers(
        Array.isArray(t)
          ? t.map((x: { id?: string; teacherId?: string; fullName?: string; name?: string }) => ({
              id: x.id || x.teacherId || "",
              fullName: x.fullName || x.name || "Unknown Teacher",
            }))
          : []
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!selectedSection) {
      return;
    }
    fetch(`/api/timetable?sectionId=${selectedSection}&academicYear=${academicYear}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) {
          setSlots(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSlots([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedSection, academicYear]);

  const getSlot = (day: string, periodId: string) =>
    slots.find((s) => s.dayOfWeek === day && s.periodId === periodId);

  const openModal = (day: string, periodId: string) => {
    const existing = getSlot(day, periodId);
    setModalDay(day);
    setModalPeriodId(periodId);
    setModalSubjectId(existing?.subject?.id || "");
    setModalTeacherId(existing?.teacher?.id || "");
    setModalOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedSection || !modalDay || !modalPeriodId) return;
    setSaving(true);
    const res = await fetch("/api/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: selectedSection,
        dayOfWeek: modalDay,
        periodId: modalPeriodId,
        subjectId: modalSubjectId || null,
        teacherId: modalTeacherId || null,
        academicYear,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSlots((prev) => {
        const filtered = prev.filter((s) => !(s.dayOfWeek === modalDay && s.periodId === modalPeriodId));
        return [...filtered, updated];
      });
    }
    setSaving(false);
    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
        <div style={{ color: "#64748b", fontSize: "14px" }}>Loading timetable schedule...</div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Weekly Class Timetable</h1>
          <p className="office-subtitle">
            Configure weekly subject and teacher schedules for each class section
          </p>
        </div>
      </div>

      {/* ─── Section Picker ─── */}
      <div className="office-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CalendarClock size={20} />
          </div>
          <div>
            <label className="office-form-label" style={{ margin: 0 }}>
              Select Classroom Section
            </label>
            <select
              className="office-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              style={{ minWidth: "300px", marginTop: "4px" }}
            >
              <option value="">-- Choose Section --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class?.name || "?"} — Section {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <CalendarClock size={36} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>No Bell Periods Defined</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Please configure your daily bell periods in School Settings first.
          </p>
        </div>
      ) : selectedSection && (
        <div className="office-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="office-table">
            <thead>
              <tr>
                <th style={{ width: "140px" }}>Period</th>
                {DAYS.map((d) => (
                  <th key={d} style={{ textAlign: "center" }}>
                    {DAY_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id}>
                  <td style={{ background: "#f8fafc", borderRight: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{period.label}</div>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                      {period.startTime} – {period.endTime}
                    </div>
                  </td>
                  {DAYS.map((day) => {
                    if (period.isBreak) {
                      return (
                        <td
                          key={day}
                          style={{
                            textAlign: "center",
                            background: "#f1f5f9",
                            color: "#64748b",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {period.label}
                        </td>
                      );
                    }
                    const slot = getSlot(day, period.id);
                    return (
                      <td
                        key={day}
                        onClick={() => openModal(day, period.id)}
                        style={{
                          textAlign: "center",
                          cursor: "pointer",
                          padding: "10px",
                          background: slot?.subject ? "#eff6ff" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {slot?.subject ? (
                          <div>
                            <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "13px" }}>
                              {slot.subject.name}
                            </div>
                            {slot.teacher && (
                              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                                {slot.teacher.fullName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>+ Assign</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assignment Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="office-card"
            style={{ width: "100%", maxWidth: "420px", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="office-card-header">
              <h3 className="office-card-title">Assign Timetable Period</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="office-btn office-btn-secondary office-btn-sm"
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
              {DAY_LABELS[modalDay]} • {periods.find((p) => p.id === modalPeriodId)?.label}
            </div>

            <div className="office-form-group">
              <label className="office-form-label">Subject</label>
              <select
                className="office-select"
                value={modalSubjectId}
                onChange={(e) => setModalSubjectId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">-- None / Free Period --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="office-form-group">
              <label className="office-form-label">Faculty Teacher</label>
              <select
                className="office-select"
                value={modalTeacherId}
                onChange={(e) => setModalTeacherId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">-- None / Unassigned --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="office-btn office-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={saving}
                className="office-btn office-btn-primary"
              >
                <Save size={14} />
                <span>{saving ? "Saving..." : "Save Assignment"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
