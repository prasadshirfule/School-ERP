"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, Sparkles, Plus, X, Save } from "lucide-react";

type Period = { id: string; periodNumber: number; label: string; startTime: string; endTime: string; isBreak: boolean };
type Section = { id: string; name: string; classId: string; class: { id: string; name: string }; academicYear: string };
type Subject = { id: string; name: string };
type Teacher = { id: string; fullName: string };
type Slot = {
  id: string; dayOfWeek: string; periodId: string;
  period: Period; subject: { id: string; name: string } | null;
  teacher: { id: string; fullName: string } | null;
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday" };

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
      setSections(Array.isArray(s) ? s : []);
      setSubjects(Array.isArray(sub) ? sub : []);
      setTeachers(Array.isArray(t) ? t.map((x: any) => ({ id: x.id || x.teacherId, fullName: x.fullName || x.name })) : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedSection) { setSlots([]); return; }
    fetch(`/api/timetable?sectionId=${selectedSection}&academicYear=${academicYear}`)
      .then((r) => r.json())
      .then((data) => setSlots(Array.isArray(data) ? data : []));
  }, [selectedSection, academicYear]);

  const getSlot = (day: string, periodId: string) => slots.find((s) => s.dayOfWeek === day && s.periodId === periodId);

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

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading timetable data...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable Management</h1>
          <p className="page-subtitle">Assign subjects and teachers to each section&apos;s weekly schedule</p>
        </div>
      </div>

      {/* Section Picker */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <CalendarClock size={18} color="#818cf8" />
          <label className="form-label" style={{ margin: 0 }}>Select Section:</label>
          <select
            className="form-select"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            style={{ width: "280px" }}
          >
            <option value="">— Choose a section —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class?.name || "?"} — Section {s.name} ({s.academicYear})
              </option>
            ))}
          </select>
        </div>
      </div>

      {periods.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap"><CalendarClock size={26} color="#818cf8" /></div>
            <div className="empty-state-title">No periods defined</div>
            <p className="empty-state-text">Go to School Settings to define your daily period structure first.</p>
          </div>
        </div>
      )}

      {selectedSection && periods.length > 0 && (
        <div
          className="timetable-grid"
          style={{ gridTemplateColumns: `140px repeat(${DAYS.length}, 1fr)` }}
        >
          {/* Header Row */}
          <div className="tt-header-cell">Period</div>
          {DAYS.map((d) => (
            <div key={d} className="tt-header-cell">{DAY_LABELS[d]}</div>
          ))}

          {/* Period Rows */}
          {periods.map((period) => (
            <React.Fragment key={period.id}>
              <div className="tt-period-label">
                <span>{period.label}</span>
                <span className="tt-period-time">{period.startTime} – {period.endTime}</span>
              </div>
              {DAYS.map((day) => {
                if (period.isBreak) {
                  return <div key={day} className="tt-break-cell">{period.label}</div>;
                }
                const slot = getSlot(day, period.id);
                return (
                  <div
                    key={day}
                    className="tt-cell"
                    onClick={() => openModal(day, period.id)}
                  >
                    {slot?.subject ? (
                      <>
                        <span className="tt-cell-subject">{slot.subject.name}</span>
                        {slot.teacher && <span className="tt-cell-teacher">{slot.teacher.fullName}</span>}
                      </>
                    ) : (
                      <span className="tt-cell-empty">+ Assign</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 className="card-title" style={{ margin: 0 }}>Assign Slot</h3>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "16px" }}>
              {DAY_LABELS[modalDay]} — {periods.find((p) => p.id === modalPeriodId)?.label}
            </p>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-select" value={modalSubjectId} onChange={(e) => setModalSubjectId(e.target.value)}>
                <option value="">— None —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Teacher</label>
              <select className="form-select" value={modalTeacherId} onChange={(e) => setModalTeacherId(e.target.value)}>
                <option value="">— None —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAssign} disabled={saving} style={{ gap: "6px" }}>
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
