"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  RotateCcw,
  X,
  Pencil,
} from "lucide-react";

type SectionOption = {
  id: string;
  name: string;
  class: { name: string };
  academicYear: string;
};

type SubjectOption = {
  id: string;
  name: string;
};

type ExamSlotOption = {
  id: string;
  term: "TERM1" | "TERM2";
  code: string;
  name: string;
  maxScore: number | string;
  order: number;
};

type StudentMarkRow = {
  studentId: string;
  rollNumber?: string;
  admissionNo: string;
  fullName: string;
  markId: string | null;
  score: string;
  maxScore: string;
  isModified: boolean;
};

export default function TeacherMarksPage() {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [examSlots, setExamSlots] = useState<ExamSlotOption[]>([]);

  // Filter selections
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<"TERM1" | "TERM2">("TERM1");
  const [selectedSlotCode, setSelectedSlotCode] = useState<string>("");
  const [defaultMaxScore, setDefaultMaxScore] = useState<string>("30");

  // Grid Data
  const [rows, setRows] = useState<StudentMarkRow[]>([]);
  const [initialRows, setInitialRows] = useState<StudentMarkRow[]>([]);

  // Loading & Action feedback
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Subject Modal State (Create & Edit/Rename)
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<"create" | "edit">("create");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectModalError, setSubjectModalError] = useState("");

  // Exam Slot Modal State (Create & Edit/Rename)
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotModalMode, setSlotModalMode] = useState<"create" | "edit">("create");
  const [newSlotCode, setNewSlotCode] = useState("");
  const [newSlotName, setNewSlotName] = useState("");
  const [newSlotTerm, setNewSlotTerm] = useState<"TERM1" | "TERM2">("TERM1");
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotModalError, setSlotModalError] = useState("");

  // Load sections, subjects, and exam slots on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/exam-slots").then((r) => r.json()),
    ])
      .then(([secData, subData, slotsData]) => {
        const loadedSections = Array.isArray(secData) ? secData : [];
        const loadedSubjects = Array.isArray(subData) ? subData : [];
        const loadedSlots = Array.isArray(slotsData) ? slotsData : [];

        setSections(loadedSections);
        setSubjects(loadedSubjects);
        setExamSlots(loadedSlots);

        if (loadedSections.length > 0) setSectionId(loadedSections[0].id);
        if (loadedSubjects.length > 0) setSubjectId(loadedSubjects[0].id);

        const t1First = loadedSlots.find((s: ExamSlotOption) => s.term === "TERM1");
        if (t1First) {
          setSelectedSlotCode(t1First.code);
          setDefaultMaxScore(String(t1First.maxScore));
        }

        setLoadingOptions(false);
      })
      .catch((err) => {
        setMessage("Failed to load options: " + err.message);
        setIsError(true);
        setLoadingOptions(false);
      });
  }, []);

  // When Section, Subject, or ExamSlot changes, fetch student marks grid
  useEffect(() => {
    if (!sectionId || !subjectId || !selectedSlotCode) {
      return;
    }

    let ignore = false;
    fetch(
      `/api/marks?sectionId=${sectionId}&subjectId=${subjectId}&examName=${encodeURIComponent(
        selectedSlotCode
      )}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load marks grid");
        return res.json();
      })
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          const currentSlot = examSlots.find((s) => s.code === selectedSlotCode);
          const fallbackMax = currentSlot ? String(currentSlot.maxScore) : defaultMaxScore;

          const formatted: StudentMarkRow[] = (data as Array<Record<string, unknown>>).map((r) => ({
            studentId: String(r.studentId),
            rollNumber: r.rollNumber ? String(r.rollNumber) : "",
            admissionNo: String(r.admissionNo),
            fullName: String(r.fullName),
            markId: r.markId ? String(r.markId) : null,
            score: r.score !== null && r.score !== undefined ? String(r.score) : "",
            maxScore:
              r.maxScore !== null && r.maxScore !== undefined
                ? String(r.maxScore)
                : fallbackMax,
            isModified: false,
          }));
          setRows(formatted);
          setInitialRows(formatted);
          setLoadingGrid(false);
        } else if (!ignore) {
          setRows([]);
          setInitialRows([]);
          setLoadingGrid(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setMessage(err.message || "Failed to load marks");
          setIsError(true);
          setLoadingGrid(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [sectionId, subjectId, selectedSlotCode, examSlots, defaultMaxScore]);

  // Handle Term Change
  const handleTermChange = (term: "TERM1" | "TERM2") => {
    setSelectedTerm(term);
    const firstSlot = examSlots.find((s) => s.term === term);
    if (firstSlot) {
      setSelectedSlotCode(firstSlot.code);
      setDefaultMaxScore(String(firstSlot.maxScore));
    }
  };

  const handleSlotChange = (code: string) => {
    setSelectedSlotCode(code);
    const slot = examSlots.find((s) => s.code === code);
    if (slot) {
      setDefaultMaxScore(String(slot.maxScore));
    }
  };

  const handleScoreChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, score: val, isModified: true } : r
      )
    );
  };

  const handleMaxScoreChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, maxScore: val, isModified: true } : r
      )
    );
  };

  const handleSetAllMax = (val: string) => {
    setDefaultMaxScore(val);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        maxScore: val,
        isModified: true,
      }))
    );
  };

  const resetChanges = () => {
    setRows(initialRows);
    setMessage("");
    setIsError(false);
  };

  // Subject Modal Handlers
  const openCreateSubjectModal = () => {
    setSubjectModalMode("create");
    setEditingSubjectId(null);
    setNewSubjectName("");
    setSubjectModalError("");
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (id: string) => {
    const sub = subjects.find((s) => s.id === id);
    if (!sub) return;
    setSubjectModalMode("edit");
    setEditingSubjectId(id);
    setNewSubjectName(sub.name);
    setSubjectModalError("");
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    setSavingSubject(true);
    setSubjectModalError("");

    try {
      const url = "/api/subjects";
      const method = subjectModalMode === "edit" ? "PUT" : "POST";
      const body =
        subjectModalMode === "edit"
          ? { id: editingSubjectId, name: newSubjectName.trim() }
          : { name: newSubjectName.trim() };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save subject");
      }

      if (subjectModalMode === "create") {
        setSubjects((prev) => [...prev, data]);
        setSubjectId(data.id);
      } else {
        setSubjects((prev) =>
          prev.map((s) => (s.id === editingSubjectId ? { ...s, name: data.name } : s))
        );
      }

      setShowSubjectModal(false);
      setNewSubjectName("");
    } catch (err: unknown) {
      setSubjectModalError(err instanceof Error ? err.message : "Failed to save subject");
    } finally {
      setSavingSubject(false);
    }
  };

  // Exam Slot Modal Handlers
  const openCreateSlotModal = () => {
    setSlotModalMode("create");
    setNewSlotCode("");
    setNewSlotName("");
    setNewSlotTerm(selectedTerm);
    setSlotModalError("");
    setShowSlotModal(true);
  };

  const openEditSlotModal = (slot: ExamSlotOption) => {
    setSlotModalMode("edit");
    setNewSlotCode(slot.code);
    setNewSlotName(slot.name);
    setNewSlotTerm(slot.term);
    setSlotModalError("");
    setShowSlotModal(true);
  };

  const handleSaveExamSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotCode.trim()) return;

    setSavingSlot(true);
    setSlotModalError("");

    try {
      const res = await fetch("/api/exam-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newSlotCode.trim().toUpperCase(),
          name: newSlotName.trim() || newSlotCode.trim().toUpperCase(),
          term: newSlotTerm,
          maxScore: 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save exam slot");
      }

      setExamSlots((prev) => {
        const existingIdx = prev.findIndex((s) => s.code === data.code);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = data;
          return updated;
        }
        return [...prev, data];
      });

      setSelectedSlotCode(data.code);
      setShowSlotModal(false);
    } catch (err: unknown) {
      setSlotModalError(err instanceof Error ? err.message : "Failed to save exam slot");
    } finally {
      setSavingSlot(false);
    }
  };

  // Submit Marks
  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const recordsToSubmit = rows
        .filter((r) => r.score.trim() !== "")
        .map((r) => ({
          studentId: r.studentId,
          score: parseFloat(r.score) || 0,
          maxScore: parseFloat(r.maxScore) || 30,
        }));

      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          subjectId,
          examName: selectedSlotCode,
          records: recordsToSubmit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save marks");
      }

      setMessage(
        `Successfully saved examination marks for ${data.recordsCount || recordsToSubmit.length} student(s).`
      );
      setIsError(false);

      // Reload fresh state
      const reloadRes = await fetch(
        `/api/marks?sectionId=${sectionId}&subjectId=${subjectId}&examName=${encodeURIComponent(
          selectedSlotCode
        )}`
      );
      const reloadedData = await reloadRes.json();
      if (Array.isArray(reloadedData)) {
        const slot = examSlots.find((s) => s.code === selectedSlotCode);
        const slotMax = slot ? String(slot.maxScore) : defaultMaxScore;

        const formatted = reloadedData.map((r: StudentMarkRow) => ({
          ...r,
          score: r.score !== null && r.score !== undefined ? String(r.score) : "",
          maxScore:
            r.maxScore !== null && r.maxScore !== undefined
              ? String(r.maxScore)
              : slotMax,
          isModified: false,
        }));
        setRows(formatted);
        setInitialRows(formatted);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save marks";
      setMessage(msg);
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const getGradePill = (score: string, maxScore: string) => {
    const s = parseFloat(score);
    const m = parseFloat(maxScore);
    if (isNaN(s) || isNaN(m) || m <= 0) return null;
    const pct = (s / m) * 100;
    if (pct >= 90) return <span className="office-pill office-pill-green">A+ ({pct.toFixed(0)}%)</span>;
    if (pct >= 80) return <span className="office-pill office-pill-green">A ({pct.toFixed(0)}%)</span>;
    if (pct >= 70) return <span className="office-pill office-pill-blue">B+ ({pct.toFixed(0)}%)</span>;
    if (pct >= 60) return <span className="office-pill office-pill-blue">B ({pct.toFixed(0)}%)</span>;
    if (pct >= 50) return <span className="office-pill office-pill-amber">C ({pct.toFixed(0)}%)</span>;
    if (pct >= 35) return <span className="office-pill office-pill-amber">D ({pct.toFixed(0)}%)</span>;
    return <span className="office-pill office-pill-red">F ({pct.toFixed(0)}%)</span>;
  };

  const currentTermSlots = examSlots.filter((s) => s.term === selectedTerm);
  const activeSlot = examSlots.find((s) => s.code === selectedSlotCode);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const filledCount = rows.filter((r) => r.score.trim() !== "").length;
  const savedCount = rows.filter((r) => r.markId && !r.isModified).length;

  return (
    <div className="office-page-container">
      {/* ─── Page Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Examinations & Marks Entry</h1>
          <p className="office-subtitle">
            Record student assessment marks, configure exam slots, and automatically generate grades
          </p>
        </div>
      </div>

      {/* ─── Assessment Selection Box ─── */}
      <div className="office-card" style={{ marginBottom: "20px" }}>
        <div className="office-form-grid-2">
          {/* Section Picker */}
          <div className="office-form-group">
            <label className="office-form-label">Class & Section</label>
            <select
              className="office-select"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={loadingOptions}
              style={{ width: "100%" }}
            >
              <option value="">-- Choose Classroom --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class.name} — Section {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Picker with Add/Edit */}
          <div className="office-form-group">
            <label className="office-form-label">Subject</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                className="office-select"
                style={{ flex: 1 }}
                value={subjectId}
                onChange={(e) => {
                  if (e.target.value === "__add_new_subject__") {
                    openCreateSubjectModal();
                  } else {
                    setSubjectId(e.target.value);
                  }
                }}
                disabled={loadingOptions}
              >
                <option value="">-- Choose Subject --</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
                <option value="__add_new_subject__" style={{ fontWeight: 600, color: "#1e3a8a" }}>
                  + Add new subject...
                </option>
              </select>
              {selectedSubject && (
                <button
                  type="button"
                  onClick={() => openEditSubjectModal(selectedSubject.id)}
                  className="office-btn office-btn-secondary office-btn-sm"
                  title="Rename selected subject"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="office-form-grid-2" style={{ marginTop: "10px" }}>
          {/* Term Switcher */}
          <div className="office-form-group">
            <label className="office-form-label">Academic Term</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => handleTermChange("TERM1")}
                className={`office-btn office-btn-sm ${selectedTerm === "TERM1" ? "office-btn-primary" : "office-btn-secondary"}`}
                style={{ flex: 1, height: "38px" }}
              >
                Term 1 (First Half)
              </button>
              <button
                type="button"
                onClick={() => handleTermChange("TERM2")}
                className={`office-btn office-btn-sm ${selectedTerm === "TERM2" ? "office-btn-primary" : "office-btn-secondary"}`}
                style={{ flex: 1, height: "38px" }}
              >
                Term 2 (Final Half)
              </button>
            </div>
          </div>

          {/* Exam Slot Selector */}
          <div className="office-form-group">
            <label className="office-form-label">Exam Assessment Slot</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                className="office-select"
                style={{ flex: 1 }}
                value={selectedSlotCode}
                onChange={(e) => {
                  if (e.target.value === "__add_new_slot__") {
                    openCreateSlotModal();
                  } else {
                    handleSlotChange(e.target.value);
                  }
                }}
                disabled={loadingOptions}
              >
                {currentTermSlots.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
                <option value="__add_new_slot__" style={{ fontWeight: 600, color: "#1e3a8a" }}>
                  + Add new exam test...
                </option>
              </select>
              {activeSlot && (
                <button
                  type="button"
                  onClick={() => openEditSlotModal(activeSlot)}
                  className="office-btn office-btn-secondary office-btn-sm"
                  title="Rename exam slot"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Feedback Message ─── */}
      {message && (
        <div
          style={{
            background: isError ? "#fef2f2" : "#ecfdf5",
            border: `1px solid ${isError ? "#fecaca" : "#a7f3d0"}`,
            color: isError ? "#991b1b" : "#065f46",
            borderRadius: "8px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
        </div>
      )}

      {/* ─── Loading State ─── */}
      {loadingGrid && (
        <div className="office-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading students and assessment marks...</div>
        </div>
      )}

      {/* ─── Marks Table Card ─── */}
      {!loadingGrid && sectionId && subjectId && selectedSlotCode && (
        <div className="office-card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Header Action Bar */}
          <div
            style={{
              padding: "16px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  {activeSlot?.name || selectedSlotCode}
                </span>
                <span className="office-pill office-pill-blue">
                  {selectedTerm === "TERM1" ? "Term 1" : "Term 2"}
                </span>
              </div>
              <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                {filledCount} of {rows.length} students evaluated ({savedCount} recorded in database)
              </div>
            </div>

            {/* Quick Bulk Max Score Tool */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>Max Marks:</span>
              <input
                type="number"
                min="1"
                className="office-input"
                style={{
                  height: "34px",
                  width: "70px",
                  padding: "4px 8px",
                  fontSize: "13px",
                  textAlign: "center",
                }}
                value={defaultMaxScore}
                onChange={(e) => setDefaultMaxScore(e.target.value)}
              />
              <button
                type="button"
                className="office-btn office-btn-secondary office-btn-sm"
                onClick={() => handleSetAllMax(defaultMaxScore)}
              >
                Apply to All
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="office-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table className="office-table">
              <thead>
                <tr>
                  <th style={{ width: "80px", textAlign: "center" }}>Roll</th>
                  <th style={{ width: "120px" }}>Adm. No.</th>
                  <th>Student Name</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Score (Points)</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Out of (Max)</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Grade</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      No active students found in this class section.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const gradePill = getGradePill(row.score, row.maxScore);
                    return (
                      <tr
                        key={row.studentId}
                        style={{
                          background: row.isModified ? "#f0fdf4" : undefined,
                        }}
                      >
                        <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                          {row.rollNumber || "—"}
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#1e3a8a", fontWeight: 600 }}>
                          {row.admissionNo}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{row.fullName}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="number"
                            min="0"
                            max={row.maxScore || "100"}
                            className="office-input"
                            style={{
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: "14px",
                              width: "90px",
                              margin: "0 auto",
                              height: "36px",
                              borderColor: row.isModified ? "#059669" : "#cbd5e1",
                            }}
                            placeholder="—"
                            value={row.score}
                            onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="number"
                            min="1"
                            className="office-input"
                            style={{
                              textAlign: "center",
                              fontSize: "13px",
                              width: "75px",
                              margin: "0 auto",
                              height: "36px",
                              color: "#64748b",
                            }}
                            value={row.maxScore}
                            onChange={(e) => handleMaxScoreChange(row.studentId, e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {gradePill || <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {row.isModified ? (
                            <span className="office-pill office-pill-amber">Unsaved</span>
                          ) : row.markId ? (
                            <span className="office-pill office-pill-green">Saved</span>
                          ) : (
                            <span className="office-pill office-pill-gray">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Save Action Bar */}
          <div
            style={{
              padding: "18px 24px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              {rows.some((r) => r.isModified) ? (
                <span style={{ color: "#d97706", fontWeight: 600 }}>
                  ⚠️ Unsaved edits on this page. Click Save All Marks to record.
                </span>
              ) : (
                <span>All marks are currently saved.</span>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={resetChanges}
                disabled={saving || !rows.some((r) => r.isModified)}
                className="office-btn office-btn-secondary"
              >
                <RotateCcw size={14} />
                <span>Discard Changes</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || rows.length === 0}
                className="office-btn office-btn-primary"
                style={{ minWidth: "180px" }}
              >
                {saving ? (
                  <>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Saving Marks...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save All Marks</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Subject Modal ─── */}
      {showSubjectModal && (
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
          onClick={() => setShowSubjectModal(false)}
        >
          <div
            className="office-card"
            style={{ width: "100%", maxWidth: "440px", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="office-card-header">
              <h3 className="office-card-title">
                {subjectModalMode === "edit" ? "Rename Subject" : "Create New Subject"}
              </h3>
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="office-btn office-btn-secondary office-btn-sm"
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {subjectModalError && (
              <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
                {subjectModalError}
              </div>
            )}

            <form onSubmit={handleSaveSubject}>
              <div className="office-form-group">
                <label className="office-form-label">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Science, Mathematics, Hindi"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="office-btn office-btn-secondary"
                  disabled={savingSubject}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject || !newSubjectName.trim()}
                  className="office-btn office-btn-primary"
                >
                  {savingSubject ? "Saving..." : subjectModalMode === "edit" ? "Save Name" : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Exam Slot Modal ─── */}
      {showSlotModal && (
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
          onClick={() => setShowSlotModal(false)}
        >
          <div
            className="office-card"
            style={{ width: "100%", maxWidth: "460px", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="office-card-header">
              <h3 className="office-card-title">
                {slotModalMode === "edit" ? "Edit Exam Test Slot" : "Add Exam Test Slot"}
              </h3>
              <button
                type="button"
                onClick={() => setShowSlotModal(false)}
                className="office-btn office-btn-secondary office-btn-sm"
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {slotModalError && (
              <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
                {slotModalError}
              </div>
            )}

            <form onSubmit={handleSaveExamSlot}>
              <div className="office-form-group">
                <label className="office-form-label">Academic Term</label>
                <select
                  className="office-select"
                  value={newSlotTerm}
                  onChange={(e) => setNewSlotTerm(e.target.value as "TERM1" | "TERM2")}
                  style={{ width: "100%" }}
                >
                  <option value="TERM1">Term 1</option>
                  <option value="TERM2">Term 2</option>
                </select>
              </div>

              <div className="office-form-group">
                <label className="office-form-label">Slot Code (e.g. UT3, PRACTICAL)</label>
                <input
                  type="text"
                  placeholder="e.g. UT3"
                  value={newSlotCode}
                  onChange={(e) => setNewSlotCode(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                  disabled={slotModalMode === "edit"}
                  required
                />
              </div>

              <div className="office-form-group">
                <label className="office-form-label">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Unit Test 3"
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  className="office-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="office-btn office-btn-secondary"
                  disabled={savingSlot}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot || !newSlotCode.trim()}
                  className="office-btn office-btn-primary"
                >
                  {savingSlot ? "Saving..." : slotModalMode === "edit" ? "Save Slot" : "Create Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
