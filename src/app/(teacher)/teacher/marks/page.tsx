"use client";

import { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Calendar,
  Save,
  RotateCcw,
  Layers,
  Plus,
  X,
  Loader2,
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
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
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
        setSections(Array.isArray(secData) ? secData : []);
        setSubjects(Array.isArray(subData) ? subData : []);
        const loadedSlots = Array.isArray(slotsData) ? slotsData : [];
        setExamSlots(loadedSlots);

        // Pick initial slot
        const t1First = loadedSlots.find((s: ExamSlotOption) => s.term === "TERM1");
        if (t1First) {
          setSelectedSlotCode(t1First.code);
          setDefaultMaxScore(String(t1First.maxScore));
        }

        setLoadingOptions(false);
      })
      .catch((err) => {
        setMessage("Failed to load setup choices: " + err.message);
        setIsError(true);
        setLoadingOptions(false);
      });
  }, []);

  // When Section, Subject, or ExamSlot changes, fetch student marks grid
  useEffect(() => {
    if (!sectionId || !subjectId || !selectedSlotCode) {
      setRows([]);
      setInitialRows([]);
      return;
    }

    setLoadingGrid(true);
    setMessage("");
    setIsError(false);

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
        if (Array.isArray(data)) {
          const currentSlot = examSlots.find((s) => s.code === selectedSlotCode);
          const fallbackMax = currentSlot ? String(currentSlot.maxScore) : defaultMaxScore;

          const formatted: StudentMarkRow[] = data.map((r: any) => ({
            studentId: r.studentId,
            rollNumber: r.rollNumber || "",
            admissionNo: r.admissionNo,
            fullName: r.fullName,
            markId: r.markId || null,
            score: r.score !== null && r.score !== undefined ? String(r.score) : "",
            maxScore:
              r.maxScore !== null && r.maxScore !== undefined
                ? String(r.maxScore)
                : fallbackMax,
            isModified: false,
          }));
          setRows(formatted);
          setInitialRows(formatted);
        } else {
          setRows([]);
          setInitialRows([]);
        }
        setLoadingGrid(false);
      })
      .catch((err) => {
        setMessage(err.message || "Failed to load marks");
        setIsError(true);
        setLoadingGrid(false);
      });
  }, [sectionId, subjectId, selectedSlotCode, examSlots, defaultMaxScore]);

  // Handle Term Change: auto-select first slot of selected term
  const handleTermChange = (term: "TERM1" | "TERM2") => {
    setSelectedTerm(term);
    const firstSlot = examSlots.find((s) => s.term === term);
    if (firstSlot) {
      setSelectedSlotCode(firstSlot.code);
      setDefaultMaxScore(String(firstSlot.maxScore));
    }
  };

  // Handle Slot Change
  const handleSlotChange = (code: string) => {
    setSelectedSlotCode(code);
    const slot = examSlots.find((s) => s.code === code);
    if (slot) {
      setDefaultMaxScore(String(slot.maxScore));
    }
  };

  // Update Score in row
  const handleScoreChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? { ...r, score: val, isModified: true }
          : r
      )
    );
  };

  // Update individual Max Score in row
  const handleMaxScoreChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? { ...r, maxScore: val, isModified: true }
          : r
      )
    );
  };

  // Batch Set Max Score for all students
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

  // Reset unsaved changes
  const resetChanges = () => {
    setRows(initialRows);
    setMessage("");
    setIsError(false);
  };

  // ─── Subject Modal Handlers ───
  const openCreateSubjectModal = () => {
    setSubjectModalMode("create");
    setEditingSubjectId(null);
    setNewSubjectName("");
    setSubjectModalError("");
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (subId: string) => {
    const sub = subjects.find((s) => s.id === subId);
    if (!sub) return;
    setSubjectModalMode("edit");
    setEditingSubjectId(sub.id);
    setNewSubjectName(sub.name);
    setSubjectModalError("");
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setSubjectModalError("Please enter a subject name.");
      return;
    }
    try {
      setSavingSubject(true);
      setSubjectModalError("");

      if (subjectModalMode === "create") {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSubjectName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create subject");
        }
        // Refresh subjects list
        const subRes = await fetch("/api/subjects");
        const subData = await subRes.json();
        if (Array.isArray(subData)) {
          setSubjects(subData);
        }
        setSubjectId(data.id);
        setNewSubjectName("");
        setShowSubjectModal(false);
        setMessage(`Subject "${data.name}" created and assigned successfully.`);
        setIsError(false);
      } else {
        // Edit/Rename Subject
        const res = await fetch("/api/subjects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingSubjectId, name: newSubjectName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update subject");
        }
        // Refresh subjects list
        const subRes = await fetch("/api/subjects");
        const subData = await subRes.json();
        if (Array.isArray(subData)) {
          setSubjects(subData);
        }
        setShowSubjectModal(false);
        setMessage(`Subject renamed to "${data.name}" successfully.`);
        setIsError(false);
      }
    } catch (err: any) {
      setSubjectModalError(err.message || "Failed to save subject");
    } finally {
      setSavingSubject(false);
    }
  };

  // ─── Exam Slot Modal Handlers ───
  const openCreateSlotModal = () => {
    setSlotModalMode("create");
    setEditingSlotId(null);
    setNewSlotCode("");
    setNewSlotName("");
    setNewSlotTerm(selectedTerm);
    setSlotModalError("");
    setShowSlotModal(true);
  };

  const openEditSlotModal = (slot: ExamSlotOption) => {
    setSlotModalMode("edit");
    setEditingSlotId(slot.id);
    setNewSlotCode(slot.code);
    setNewSlotName(slot.name);
    setNewSlotTerm(slot.term);
    setSlotModalError("");
    setShowSlotModal(true);
  };

  const handleSaveExamSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slotModalMode === "create" && !newSlotCode.trim()) {
      setSlotModalError("Please enter a slot code (e.g. UT5, Practical 1).");
      return;
    }
    if (slotModalMode === "edit" && !newSlotName.trim()) {
      setSlotModalError("Please enter a display name for this exam slot.");
      return;
    }
    try {
      setSavingSlot(true);
      setSlotModalError("");
      const curSection = sections.find((s) => s.id === sectionId);
      const academicYear = curSection?.academicYear || "2026-27";

      if (slotModalMode === "create") {
        const res = await fetch("/api/exam-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: newSlotCode.trim(),
            name: newSlotName.trim() || newSlotCode.trim(),
            term: newSlotTerm,
            academicYear,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create exam slot");
        }

        // Refresh slots
        const slotsRes = await fetch(`/api/exam-slots?academicYear=${academicYear}`);
        const slotsData = await slotsRes.json();
        if (Array.isArray(slotsData)) {
          setExamSlots(slotsData);
        }
        setSelectedTerm(newSlotTerm);
        setSelectedSlotCode(data.code);
        setNewSlotCode("");
        setNewSlotName("");
        setShowSlotModal(false);
        setMessage(`Exam assessment slot "${data.name}" created successfully.`);
        setIsError(false);
      } else {
        // Edit/Rename Exam Slot (updates display name and term; code is immutable)
        const res = await fetch("/api/exam-slots", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingSlotId,
            name: newSlotName.trim(),
            term: newSlotTerm,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update exam slot");
        }

        // Refresh slots
        const slotsRes = await fetch(`/api/exam-slots?academicYear=${academicYear}`);
        const slotsData = await slotsRes.json();
        if (Array.isArray(slotsData)) {
          setExamSlots(slotsData);
        }
        setSelectedTerm(data.term);
        setSelectedSlotCode(data.code);
        setShowSlotModal(false);
        setMessage(`Exam assessment slot "${data.name}" updated successfully.`);
        setIsError(false);
      }
    } catch (err: any) {
      setSlotModalError(err.message || "Failed to save exam slot");
    } finally {
      setSavingSlot(false);
    }
  };

  // Save all modified marks
  const handleSave = async () => {
    setMessage("");
    setIsError(false);

    // Validation: score cannot exceed maxScore
    for (const r of rows) {
      if (r.score.trim() !== "") {
        const s = parseFloat(r.score);
        const m = parseFloat(r.maxScore);
        if (isNaN(s) || isNaN(m)) {
          setMessage(`Invalid score or max score entered for ${r.fullName}`);
          setIsError(true);
          return;
        }
        if (s < 0) {
          setMessage(`Score cannot be negative for ${r.fullName}`);
          setIsError(true);
          return;
        }
        if (s > m) {
          setMessage(
            `Score (${s}) cannot exceed maximum score (${m}) for ${r.fullName}`
          );
          setIsError(true);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const recordsToSubmit = rows
        .filter((r) => r.score.trim() !== "" || r.markId !== null)
        .map((r) => ({
          studentId: r.studentId,
          score: r.score.trim() === "" ? 0 : parseFloat(r.score),
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
        `Successfully saved examination marks for ${data.recordsCount || rows.length} student(s).`
      );
      setIsError(false);

      // Reload fresh state to get newly generated Mark IDs
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
    } catch (err: any) {
      setMessage(err.message || "Failed to save marks");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const getGradeBadge = (score: string, maxScore: string) => {
    const s = parseFloat(score);
    const m = parseFloat(maxScore);
    if (isNaN(s) || isNaN(m) || m <= 0) return null;
    const pct = (s / m) * 100;
    if (pct >= 90) return <span className="badge badge-success">A+</span>;
    if (pct >= 80) return <span className="badge badge-teal">A</span>;
    if (pct >= 70) return <span className="badge badge-indigo">B+</span>;
    if (pct >= 60) return <span className="badge badge-info">B</span>;
    if (pct >= 50) return <span className="badge badge-warning">C</span>;
    if (pct >= 35) return <span className="badge badge-warning">D</span>;
    return <span className="badge badge-danger">F</span>;
  };

  const currentTermSlots = examSlots.filter((s) => s.term === selectedTerm);
  const activeSlot = examSlots.find((s) => s.code === selectedSlotCode);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const filledCount = rows.filter((r) => r.score.trim() !== "").length;
  const savedCount = rows.filter((r) => r.markId && !r.isModified).length;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* ─── Page Header ─── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Exams & Marks Entry</h1>
          <p className="page-subtitle">
            Enter, review, and update term test and examination marks for your assigned subjects and sections.
          </p>
        </div>
      </div>

      {/* ─── Filter Selection Card ─── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px" }}>
          <Layers size={18} color="#2dd4bf" />
          <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Assessment Target</h3>
        </div>

        <div className="form-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {/* Section Picker */}
          <div className="form-group">
            <label className="form-label">Class & Section Batch</label>
            <select
              className="form-select"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Choose classroom batch...</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class.name} — Section {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Picker with + Add New Subject and Edit Pencil */}
          <div className="form-group">
            <label className="form-label">Assigned Subject</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <select
                className="form-select"
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
                <option value="">Choose subject...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
                <option value="__add_new_subject__" style={{ fontWeight: 600, color: "var(--color-primary, #2563eb)" }}>
                  + Add new subject...
                </option>
              </select>
              {selectedSubject && (
                <button
                  type="button"
                  onClick={() => openEditSubjectModal(selectedSubject.id)}
                  className="btn btn-secondary"
                  style={{ height: "38px", width: "38px", padding: 0, flexShrink: 0 }}
                  title="Rename selected subject"
                  aria-label="Rename selected subject"
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
            {subjects.length === 0 && !loadingOptions && (
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                No subjects assigned yet. Click "+ Add new subject..." to create one.
              </span>
            )}
          </div>

          {/* Term Selector */}
          <div className="form-group">
            <label className="form-label">Academic Term</label>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={`tab ${selectedTerm === "TERM1" ? "tab-active" : ""}`}
                onClick={() => handleTermChange("TERM1")}
                style={{ flex: 1, padding: "7px 12px", fontSize: "13px" }}
              >
                Term 1
              </button>
              <button
                type="button"
                className={`tab ${selectedTerm === "TERM2" ? "tab-active" : ""}`}
                onClick={() => handleTermChange("TERM2")}
                style={{ flex: 1, padding: "7px 12px", fontSize: "13px" }}
              >
                Term 2
              </button>
            </div>
          </div>

          {/* Exam Slot Selector with Edit Pencil */}
          <div className="form-group">
            <label className="form-label">Exam Assessment Slot</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <select
                className="form-select"
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
                <option value="__add_new_slot__" style={{ fontWeight: 600, color: "var(--color-primary, #2563eb)" }}>
                  + Add new exam slot...
                </option>
              </select>
              {activeSlot && (
                <button
                  type="button"
                  onClick={() => openEditSlotModal(activeSlot)}
                  className="btn btn-secondary"
                  style={{ height: "38px", width: "38px", padding: 0, flexShrink: 0 }}
                  title="Rename/edit selected exam slot"
                  aria-label="Rename selected exam slot"
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Feedback Message ─── */}
      {message && (
        <div
          className={`alert ${isError ? "alert-error" : "alert-success"}`}
          style={{ marginBottom: "20px" }}
        >
          {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
        </div>
      )}

      {/* ─── Loading State ─── */}
      {loadingGrid && (
        <div className="loading" style={{ margin: "40px 0" }}>
          <Sparkles size={20} className="animate-spin" /> Loading students & assessment scores...
        </div>
      )}

      {/* ─── Selection Prompt ─── */}
      {!loadingGrid && (!sectionId || !subjectId || !selectedSlotCode) && (
        <div className="card">
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-state-icon-wrap" style={{ background: "var(--role-teacher-light)", color: "#2dd4bf" }}>
              <BookOpen size={28} />
            </div>
            <div className="empty-state-title">Select Class, Subject & Exam Slot</div>
            <div className="empty-state-text" style={{ maxWidth: "420px" }}>
              Choose a classroom batch, assigned subject, and exam slot from the dropdowns above to enter and review student marks.
            </div>
          </div>
        </div>
      )}

      {/* ─── Marks Grid Card ─── */}
      {!loadingGrid && sectionId && subjectId && selectedSlotCode && (
        <div className="card">
          {/* Header Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              paddingBottom: "12px",
              borderBottom: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {activeSlot?.name || selectedSlotCode} Assessment
                </span>
                <span className="badge badge-teal">{selectedTerm === "TERM1" ? "Term 1" : "Term 2"}</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {filledCount} of {rows.length} students evaluated ({savedCount} saved in database)
              </div>
            </div>

            {/* Quick Bulk Max Score Tool */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="number"
                step="any"
                min="1"
                className="form-input"
                style={{
                  height: "30px",
                  width: "60px",
                  padding: "4px 8px",
                  fontSize: "12.5px",
                  textAlign: "center",
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
                placeholder="Max"
                value={defaultMaxScore}
                onChange={(e) => setDefaultMaxScore(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSetAllMax(defaultMaxScore);
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSetAllMax(defaultMaxScore)}
                disabled={!defaultMaxScore.trim()}
              >
                Set for All
              </button>
            </div>
          </div>

          {/* Marks Spreadsheet Table */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "80px", textAlign: "center" }}>Roll</th>
                  <th style={{ width: "120px" }}>Adm. No</th>
                  <th>Student Name</th>
                  <th style={{ width: "140px", textAlign: "center" }}>
                    Score <span style={{ fontSize: "10.5px", fontWeight: 400, color: "var(--text-muted)" }}>(Points)</span>
                  </th>
                  <th style={{ width: "120px", textAlign: "center" }}>
                    Out of <span style={{ fontSize: "10.5px", fontWeight: 400, color: "var(--text-muted)" }}>(Max)</span>
                  </th>
                  <th style={{ width: "80px", textAlign: "center" }}>Grade</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                      No active students found in this section.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const gradeBadge = getGradeBadge(row.score, row.maxScore);
                    return (
                      <tr
                        key={row.studentId}
                        style={{
                          background: row.isModified
                            ? "var(--role-teacher-light)"
                            : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Roll Number */}
                        <td style={{ textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>
                          {row.rollNumber || `—`}
                        </td>

                        {/* Admission No */}
                        <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {row.admissionNo}
                        </td>

                        {/* Full Name */}
                        <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {row.fullName}
                        </td>

                        {/* Score Input */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={row.maxScore || "100"}
                            className="form-input"
                            style={{
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: "14px",
                              padding: "6px 8px",
                              width: "90px",
                              margin: "0 auto",
                              borderColor: row.isModified ? "#2dd4bf" : "var(--border-subtle)",
                            }}
                            placeholder="—"
                            value={row.score}
                            onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                          />
                        </td>

                        {/* Max Score Input */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="number"
                            step="any"
                            min="1"
                            className="form-input"
                            style={{
                              textAlign: "center",
                              fontSize: "13px",
                              padding: "6px 8px",
                              width: "75px",
                              margin: "0 auto",
                              color: "var(--text-muted)",
                            }}
                            value={row.maxScore}
                            onChange={(e) => handleMaxScoreChange(row.studentId, e.target.value)}
                          />
                        </td>

                        {/* Real-time Grade */}
                        <td style={{ textAlign: "center" }}>
                          {gradeBadge || (
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>

                        {/* Saved/Modified Indicator */}
                        <td style={{ textAlign: "center" }}>
                          {row.isModified ? (
                            <span className="badge badge-warning" style={{ fontSize: "10.5px" }}>
                              Unsaved
                            </span>
                          ) : row.markId ? (
                            <span className="badge badge-success" style={{ fontSize: "10.5px" }}>
                              Saved
                            </span>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Save Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
              {rows.some((r) => r.isModified) ? (
                <span style={{ color: "#fbbf24", fontWeight: 500 }}>
                  ⚠️ You have unsaved mark edits on this page.
                </span>
              ) : (
                <span>All marks currently up to date.</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetChanges}
                disabled={saving || !rows.some((r) => r.isModified)}
              >
                <RotateCcw size={16} /> Discard Changes
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || rows.length === 0}
                style={{ gap: "6px" }}
              >
                {saving ? (
                  <>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Saving...</span>
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

      {/* ─── Subject Modal (Create & Rename) ─── */}
      {showSubjectModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => {
            setShowSubjectModal(false);
            setSubjectModalError("");
            setNewSubjectName("");
          }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BookOpen size={18} color="#2dd4bf" />
                <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>
                  {subjectModalMode === "edit" ? "Rename Subject" : "Add New Subject"}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowSubjectModal(false);
                  setSubjectModalError("");
                  setNewSubjectName("");
                }}
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {subjectModalError && (
              <div className="alert alert-error" style={{ marginBottom: "14px" }}>
                <AlertCircle size={16} />
                <span>{subjectModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubject}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Subject Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Computer Science, Social Studies, Hindi"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  autoFocus
                  required
                />
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  {subjectModalMode === "edit"
                    ? "Renaming this subject updates it school-wide across all classes and reports."
                    : "This subject will be available school-wide and automatically assigned to you."}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowSubjectModal(false);
                    setSubjectModalError("");
                    setNewSubjectName("");
                  }}
                  disabled={savingSubject}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingSubject || !newSubjectName.trim()}
                  style={{ gap: "6px" }}
                >
                  {savingSubject ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{subjectModalMode === "edit" ? "Saving..." : "Creating..."}</span>
                    </>
                  ) : (
                    <>
                      {subjectModalMode === "edit" ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                      <span>{subjectModalMode === "edit" ? "Save Changes" : "Create Subject"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Exam Slot Modal (Create & Edit) ─── */}
      {showSlotModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => {
            setShowSlotModal(false);
            setSlotModalError("");
            setNewSlotCode("");
            setNewSlotName("");
          }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={18} color="#2dd4bf" />
                <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>
                  {slotModalMode === "edit" ? "Edit Exam Assessment Slot" : "Add New Exam Assessment Slot"}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowSlotModal(false);
                  setSlotModalError("");
                  setNewSlotCode("");
                  setNewSlotName("");
                }}
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {slotModalError && (
              <div className="alert alert-error" style={{ marginBottom: "14px" }}>
                <AlertCircle size={16} />
                <span>{slotModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExamSlot}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">Academic Term</label>
                <div className="tabs" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className={`tab ${newSlotTerm === "TERM1" ? "tab-active" : ""}`}
                    onClick={() => setNewSlotTerm("TERM1")}
                    style={{ flex: 1, padding: "7px 12px", fontSize: "13px" }}
                  >
                    Term 1
                  </button>
                  <button
                    type="button"
                    className={`tab ${newSlotTerm === "TERM2" ? "tab-active" : ""}`}
                    onClick={() => setNewSlotTerm("TERM2")}
                    style={{ flex: 1, padding: "7px 12px", fontSize: "13px" }}
                  >
                    Term 2
                  </button>
                </div>
              </div>

              {slotModalMode === "create" ? (
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label">Slot Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. UT5, PRACTICAL1, MIDTERM"
                    value={newSlotCode}
                    onChange={(e) => setNewSlotCode(e.target.value)}
                    autoFocus
                    required
                  />
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    A unique identifier code used in database records and report cards (fixed after creation).
                  </span>
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label">Slot Identifier Code (Fixed)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSlotCode}
                    disabled
                    style={{ background: "var(--bg-surface)", color: "var(--text-muted)", cursor: "not-allowed", opacity: 0.8 }}
                  />
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    Internal identifier code used in historical marks records (immutable).
                  </span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Display Name {slotModalMode === "edit" ? "" : "(Optional)"}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Unit Test 5, Practical Exam 1"
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  autoFocus={slotModalMode === "edit"}
                  required={slotModalMode === "edit"}
                />
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Human-readable label shown to teachers and on student report cards.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowSlotModal(false);
                    setSlotModalError("");
                    setNewSlotCode("");
                    setNewSlotName("");
                  }}
                  disabled={savingSlot}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingSlot || (slotModalMode === "create" ? !newSlotCode.trim() : !newSlotName.trim())}
                  style={{ gap: "6px" }}
                >
                  {savingSlot ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{slotModalMode === "edit" ? "Saving..." : "Creating..."}</span>
                    </>
                  ) : (
                    <>
                      {slotModalMode === "edit" ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                      <span>{slotModalMode === "edit" ? "Save Changes" : "Create Exam Slot"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
