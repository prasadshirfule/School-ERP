"use client";

import { useEffect, useState } from "react";
import {
  School,
  Building,
  UserCheck,
  Mail,
  Phone,
  Globe,
  MapPin,
  Upload,
  Trash2,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Calendar,
  Clock,
  Plus,
} from "lucide-react";

type SchoolSettings = {
  id: string;
  name: string;
  boardType: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  principalName?: string | null;
  affiliationNumber?: string | null;
  establishedYear?: number | null;
  trustName?: string | null;
  term1StartDate?: string | null;
  term1EndDate?: string | null;
  term2StartDate?: string | null;
  term2EndDate?: string | null;
};

export default function SchoolSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [boardType, setBoardType] = useState("CBSE");
  const [trustName, setTrustName] = useState("");
  const [affiliationNumber, setAffiliationNumber] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Term Date Ranges
  const [term1StartDate, setTerm1StartDate] = useState("");
  const [term1EndDate, setTerm1EndDate] = useState("");
  const [term2StartDate, setTerm2StartDate] = useState("");
  const [term2EndDate, setTerm2EndDate] = useState("");

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");

  // Period Schedule State
  const [periods, setPeriods] = useState<Array<{ id: string; periodNumber: number; label: string; startTime: string; endTime: string; isBreak: boolean }>>([]);
  const [newPeriodLabel, setNewPeriodLabel] = useState("");
  const [newPeriodStart, setNewPeriodStart] = useState("09:00");
  const [newPeriodEnd, setNewPeriodEnd] = useState("09:45");
  const [newPeriodIsBreak, setNewPeriodIsBreak] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodMsg, setPeriodMsg] = useState("");

  const fetchPeriods = () => {
    fetch("/api/periods")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPeriods(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/schools/settings")
      .then((r) => r.json())
      .then((data: SchoolSettings) => {
        if (data) {
          setName(data.name || "");
          setBoardType(data.boardType || "CBSE");
          setTrustName(data.trustName || "");
          setAffiliationNumber(data.affiliationNumber || "");
          setEstablishedYear(data.establishedYear ? String(data.establishedYear) : "");
          setPrincipalName(data.principalName || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setWebsite(data.website || "");
          setAddress(data.address || "");
          setLogoUrl(data.logoUrl || "");

          setTerm1StartDate(data.term1StartDate ? data.term1StartDate.slice(0, 10) : "");
          setTerm1EndDate(data.term1EndDate ? data.term1EndDate.slice(0, 10) : "");
          setTerm2StartDate(data.term2StartDate ? data.term2StartDate.slice(0, 10) : "");
          setTerm2EndDate(data.term2EndDate ? data.term2EndDate.slice(0, 10) : "");
        }
        setLoading(false);
      })
      .catch((err) => {
        setMessage("Failed to load school settings: " + err.message);
        setIsError(true);
        setLoading(false);
      });

    fetchPeriods();
  }, []);

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodLabel.trim()) return;
    setSavingPeriod(true);
    setPeriodMsg("");
    try {
      const res = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newPeriodLabel.trim(),
          startTime: newPeriodStart,
          endTime: newPeriodEnd,
          isBreak: newPeriodIsBreak,
        }),
      });
      if (res.ok) {
        setNewPeriodLabel("");
        setNewPeriodIsBreak(false);
        fetchPeriods();
      } else {
        const d = await res.json();
        setPeriodMsg(d.error || "Failed to add period");
      }
    } catch {
      setPeriodMsg("Error creating period");
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("Are you sure? Any timetable assignments for this period will also be removed.")) return;
    await fetch(`/api/periods?id=${id}`, { method: "DELETE" });
    fetchPeriods();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Logo size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setLogoError("Invalid image format. Allowed formats: JPG, PNG, WebP.");
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("logo", file);
    formData.append("type", "logo");

    try {
      const res = await fetch("/api/upload/student-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadingLogo(false);

      if (res.ok) {
        setLogoUrl(data.url);
      } else {
        setLogoError(data.error || "Failed to upload logo");
      }
    } catch (err: any) {
      setUploadingLogo(false);
      setLogoError(err.message || "Failed to upload logo");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!name.trim()) {
      setMessage("School name is required");
      setIsError(true);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/schools/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          boardType: boardType.trim(),
          trustName: trustName.trim() || null,
          affiliationNumber: affiliationNumber.trim() || null,
          establishedYear: establishedYear ? parseInt(establishedYear, 10) : null,
          principalName: principalName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          logoUrl: logoUrl.trim() || null,
          term1StartDate: term1StartDate || null,
          term1EndDate: term1EndDate || null,
          term2StartDate: term2StartDate || null,
          term2EndDate: term2EndDate || null,
        }),
      });

      const data = await res.json();
      setSaving(false);

      if (res.ok) {
        setMessage("School settings updated successfully!");
        setIsError(false);
      } else {
        setMessage(data.error || "Failed to update school settings");
        setIsError(true);
      }
    } catch (err: any) {
      setSaving(false);
      setMessage(err.message || "An unexpected error occurred");
      setIsError(true);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading school profile & settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "850px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* ─── Page Header ─── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">School Settings & Profile</h1>
          <p className="page-subtitle">
            Configure institutional details, branding, affiliation credentials, and academic term attendance dates.
          </p>
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

      <form onSubmit={handleSave}>
        {/* ─── Card 1: School Identity & Crest ─── */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "10px",
            }}
          >
            <School size={18} color="#818cf8" />
            <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>
              Institution Identity & Crest
            </h3>
          </div>

          {/* Logo Upload Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* Logo Preview */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                background: "var(--role-admin-light)",
                border: "2px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
                flexShrink: 0,
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="School Logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
                />
              ) : (
                <Building size={32} />
              )}
            </div>

            {/* Controls */}
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                  School Crest / Logo Emblem
                </span>
                <span className="badge badge-info" style={{ fontSize: "11px", padding: "1px 6px" }}>
                  Optional
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 10px 0" }}>
                Displayed on academic report cards, official fee receipts, and school notices. (JPG, PNG, WebP up to 5MB).
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <label
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: uploadingLogo ? "wait" : "pointer", gap: "6px", display: "inline-flex" }}
                >
                  <Upload size={13} />
                  <span>{uploadingLogo ? "Uploading..." : logoUrl ? "Change Logo" : "Upload School Logo"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    style={{ display: "none" }}
                    disabled={uploadingLogo}
                  />
                </label>

                {logoUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setLogoUrl("")}
                    style={{ color: "var(--danger)", gap: "4px" }}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {logoError && (
                <div style={{ fontSize: "12px", color: "var(--danger)", marginTop: "6px" }}>
                  {logoError}
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label className="form-label">
              Parent Trust / Society Header Banner
              <span className="badge badge-info" style={{ fontSize: "10px", marginLeft: "6px" }}>Optional</span>
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. के. बापूराव पाटील दुधडकर शिक्षण प्रसारक मंडळ, दुधड ता. हिमायतनगर संचलित"
              value={trustName}
              onChange={(e) => setTrustName(e.target.value)}
            />
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px", display: "block" }}>
              Appears at the very top of report cards above the school title. Leave empty to omit.
            </span>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">
                Official School Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Greenfield International School"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Educational Board</label>
              <select
                className="form-select"
                value={boardType}
                onChange={(e) => setBoardType(e.target.value)}
              >
                <option value="CBSE">CBSE (Central Board)</option>
                <option value="ICSE">ICSE / ISC</option>
                <option value="STATE">State Board</option>
                <option value="IB">International Baccalaureate (IB)</option>
                <option value="CAMBRIDGE">Cambridge (IGCSE)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Board Affiliation / Registration #</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. CBSE/AFF/2026/11094"
                value={affiliationNumber}
                onChange={(e) => setAffiliationNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Year of Establishment</label>
              <input
                className="form-input"
                type="number"
                placeholder="e.g. 2008"
                min="1800"
                max={new Date().getFullYear() + 1}
                value={establishedYear}
                onChange={(e) => setEstablishedYear(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ─── Card 2: Academic Terms & Attendance Windows ─── */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "10px",
            }}
          >
            <Calendar size={18} color="#34d399" />
            <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>
              Academic Terms & Attendance Windows
            </h3>
          </div>

          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "16px" }}>
            Specify the date ranges for Term 1 and Term 2. Attendance records recorded between these dates will be aggregated for Working Days and Attendance % on the report card.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Term 1 Box */}
            <div
              style={{
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13.5px", marginBottom: "10px" }}>
                Term 1 Attendance Range
              </div>
              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={term1StartDate}
                  onChange={(e) => setTerm1StartDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={term1EndDate}
                  onChange={(e) => setTerm1EndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Term 2 Box */}
            <div
              style={{
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13.5px", marginBottom: "10px" }}>
                Term 2 Attendance Range
              </div>
              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={term2StartDate}
                  onChange={(e) => setTerm2StartDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={term2EndDate}
                  onChange={(e) => setTerm2EndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Card 3: Leadership & Administration ─── */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "10px",
            }}
          >
            <UserCheck size={18} color="#818cf8" />
            <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>
              Leadership & Administration
            </h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Principal / Head of Institution Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Dr. Sarah Jenkins"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
              />
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Displayed on the report card endorsement signature line.
              </span>
            </div>
          </div>
        </div>

        {/* ─── Card 4: Official Contact Channels ─── */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "10px",
            }}
          >
            <Mail size={18} color="#818cf8" />
            <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>
              Official Contact Channels & Address
            </h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">School Contact Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="e.g. info@greenfieldschool.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Main Office Phone</label>
              <input
                className="form-input"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Official Website URL</label>
              <input
                className="form-input"
                type="url"
                placeholder="e.g. https://greenfieldschool.edu"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Campus Physical Address</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. 124 Knowledge Park, Sector 62, Noida"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ─── Card 5: Daily Period & Bell Schedule Structure ─── */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} color="#818cf8" />
              <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>
                Daily Period &amp; Bell Schedule Structure
              </h3>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {periods.length} Periods Defined
            </span>
          </div>

          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Configure the standard daily period timetable slots for your school (e.g. Period 1, Period 2, Recess, Lunch). These form the rows of the weekly class timetable grid.
          </p>

          {periodMsg && (
            <div className="alert alert-error" style={{ marginBottom: "16px" }}>
              <AlertCircle size={15} />
              <span>{periodMsg}</span>
            </div>
          )}

          {/* Periods Table */}
          {periods.length > 0 ? (
            <div className="table-responsive" style={{ marginBottom: "20px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Period Label</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Type</th>
                    <th style={{ width: "80px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: "var(--text-muted)" }}>P{p.periodNumber}</td>
                      <td style={{ fontWeight: 600 }}>{p.label}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{p.startTime}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{p.endTime}</td>
                      <td>
                        {p.isBreak ? (
                          <span className="badge badge-warning">Break / Recess</span>
                        ) : (
                          <span className="badge badge-teal">Academic Class</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => handleDeletePeriod(p.id)}
                          title="Delete Period"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "16px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", marginBottom: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              No periods defined yet. Add periods below to enable timetable scheduling.
            </div>
          )}

          {/* Add Period Form */}
          <div style={{ padding: "14px", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--text-primary)" }}>
              Add Period / Break Slot
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", alignItems: "flex-end" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "11px" }}>Label *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Period 1 / Lunch"
                  value={newPeriodLabel}
                  onChange={(e) => setNewPeriodLabel(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "11px" }}>Start Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={newPeriodStart}
                  onChange={(e) => setNewPeriodStart(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "11px" }}>End Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={newPeriodEnd}
                  onChange={(e) => setNewPeriodEnd(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "8px" }}>
                <input
                  type="checkbox"
                  id="newPeriodBreak"
                  checked={newPeriodIsBreak}
                  onChange={(e) => setNewPeriodIsBreak(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="newPeriodBreak" style={{ fontSize: "12px", cursor: "pointer", color: "var(--text-secondary)" }}>
                  Is Break / Recess
                </label>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddPeriod}
                disabled={savingPeriod || !newPeriodLabel.trim()}
                style={{ gap: "5px", height: "38px" }}
              >
                <Plus size={14} />
                <span>{savingPeriod ? "Adding..." : "Add Period"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Action Buttons ─── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ gap: "6px", minWidth: "160px" }}
          >
            {saving ? (
              <>
                <Sparkles size={16} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save School Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
