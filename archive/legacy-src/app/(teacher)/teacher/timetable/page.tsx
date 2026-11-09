"use client";

import { useEffect, useState } from "react";
import React from "react";
import { CalendarClock, Sparkles } from "lucide-react";

type Slot = {
  id: string; dayOfWeek: string;
  period: { id: string; periodNumber: number; label: string; startTime: string; endTime: string; isBreak: boolean };
  subject: { id: string; name: string } | null;
  section: { id: string; name: string; class: { id: string; name: string } };
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday" };

export default function TeacherTimetablePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timetable/teacher")
      .then((r) => r.json())
      .then((data) => { setSlots(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading your timetable...</div>;

  // Collect unique periods across all slots
  const periodsMap = new Map<string, Slot["period"]>();
  for (const s of slots) {
    periodsMap.set(s.period.id, s.period);
  }
  const periods = Array.from(periodsMap.values()).sort((a, b) => a.periodNumber - b.periodNumber);

  const getSlot = (day: string, periodId: string) => slots.find((s) => s.dayOfWeek === day && s.period.id === periodId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Teaching Schedule</h1>
          <p className="page-subtitle">Your personal timetable showing assigned sections and subjects across the week</p>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap"><CalendarClock size={26} color="#2dd4bf" /></div>
            <div className="empty-state-title">No timetable assigned yet</div>
            <p className="empty-state-text">Your admin has not assigned any timetable slots to you yet.</p>
          </div>
        </div>
      ) : (
        <div
          className="timetable-grid"
          style={{ gridTemplateColumns: `140px repeat(${DAYS.length}, 1fr)` }}
        >
          <div className="tt-header-cell">Period</div>
          {DAYS.map((d) => <div key={d} className="tt-header-cell">{DAY_LABELS[d]}</div>)}

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
                  <div key={day} className="tt-cell" style={{ cursor: "default" }}>
                    {slot ? (
                      <>
                        <span className="tt-cell-subject">{slot.subject?.name || "—"}</span>
                        <span className="tt-cell-teacher">{slot.section.class.name} — {slot.section.name}</span>
                      </>
                    ) : (
                      <span className="tt-cell-empty">—</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
