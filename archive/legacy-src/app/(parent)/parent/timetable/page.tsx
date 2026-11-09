"use client";

import { useEffect, useState } from "react";
import React from "react";
import { CalendarClock, Sparkles } from "lucide-react";

type Period = { id: string; periodNumber: number; label: string; startTime: string; endTime: string; isBreak: boolean };
type Slot = {
  id: string; dayOfWeek: string; periodId: string;
  period: Period;
  subject: { id: string; name: string } | null;
  teacher: { id: string; fullName: string } | null;
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat" };

export default function ParentTimetablePage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionId, setSectionId] = useState("");
  const [childName, setChildName] = useState("");

  useEffect(() => {
    // First, get parent's children to find the section
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((students: any[]) => {
        if (students.length > 0 && students[0].section?.id) {
          setSectionId(students[0].section.id);
          setChildName(students[0].fullName);
        }
        return fetch("/api/periods").then((r) => r.json());
      })
      .then((p) => {
        setPeriods(Array.isArray(p) ? p : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    fetch(`/api/timetable?sectionId=${sectionId}&academicYear=2026-27`)
      .then((r) => r.json())
      .then((data) => setSlots(Array.isArray(data) ? data : []));
  }, [sectionId]);

  const getSlot = (day: string, periodId: string) => slots.find((s) => s.dayOfWeek === day && s.periodId === periodId);

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading timetable...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Weekly Timetable</h1>
          <p className="page-subtitle">
            {childName ? `${childName}'s class schedule` : "Your child's weekly class schedule"}
          </p>
        </div>
      </div>

      {!sectionId ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap"><CalendarClock size={26} color="#fb7185" /></div>
            <div className="empty-state-title">No section assigned</div>
            <p className="empty-state-text">Your child is not currently assigned to a section with a timetable.</p>
          </div>
        </div>
      ) : periods.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap"><CalendarClock size={26} color="#fb7185" /></div>
            <div className="empty-state-title">No periods configured</div>
            <p className="empty-state-text">The school has not set up a period structure yet.</p>
          </div>
        </div>
      ) : (
        <div
          className="timetable-grid"
          style={{ gridTemplateColumns: `130px repeat(${DAYS.length}, 1fr)` }}
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
                    {slot?.subject ? (
                      <>
                        <span className="tt-cell-subject">{slot.subject.name}</span>
                        {slot.teacher && <span className="tt-cell-teacher">{slot.teacher.fullName}</span>}
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
