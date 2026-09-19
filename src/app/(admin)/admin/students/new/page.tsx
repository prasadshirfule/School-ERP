"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  MapPin,
  Users,
  BookOpen,
  HeartPulse,
  Receipt,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

export default function NewStudentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Student Photo (Optional)
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Student Details
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [category, setCategory] = useState("");

  // Address
  const [currentAddress, setCurrentAddress] = useState("");
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [permanentAddress, setPermanentAddress] = useState("");

  // Parent & Guardian Details
  const [fatherName, setFatherName] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");

  const [motherName, setMotherName] = useState("");
  const [motherOccupation, setMotherOccupation] = useState("");
  const [motherPhone, setMotherPhone] = useState("");

  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Previous School
  const [previousSchoolName, setPreviousSchoolName] = useState("");
  const [previousClass, setPreviousClass] = useState("");
  const [transferCertificateNumber, setTransferCertificateNumber] = useState("");

  // Emergency & Medical
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");

  // Fee Details (Optional)
  const [totalFees, setTotalFees] = useState("");
  const [amountPaidNow, setAmountPaidNow] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Computed Remaining Fees
  const totalFeesNum = Math.max(0, parseFloat(totalFees) || 0);
  const amountPaidNum = Math.max(0, parseFloat(amountPaidNow) || 0);
  const remainingFeesNum = Math.max(0, totalFeesNum - amountPaidNum);

  // Sync permanent address when "same as current" is checked
  const handleSameAddressChange = (checked: boolean) => {
    setSameAsCurrent(checked);
    if (checked) {
      setPermanentAddress(currentAddress);
    }
  };

  const handleCurrentAddressChange = (value: string) => {
    setCurrentAddress(value);
    if (sameAsCurrent) {
      setPermanentAddress(value);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError("Invalid image format. Allowed formats: JPG, PNG, WebP.");
      return;
    }

    setPhotoUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("/api/upload/student-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setPhotoUploading(false);

      if (res.ok) {
        setPhotoUrl(data.url);
      } else {
        setPhotoError(data.error || "Failed to upload photo");
      }
    } catch (err: any) {
      setPhotoUploading(false);
      setPhotoError(err.message || "Failed to upload photo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!dob) {
      setError("Date of birth is required");
      return;
    }

    if (totalFees && Number(totalFees) < 0) {
      setError("Total fees cannot be negative");
      return;
    }
    if (amountPaidNow && Number(amountPaidNow) < 0) {
      setError("Amount paid now cannot be negative");
      return;
    }
    if (totalFees && amountPaidNow && Number(amountPaidNow) > Number(totalFees)) {
      setError("Amount paid now cannot exceed total fees");
      return;
    }

    if (totalFeesNum > 0 && remainingFeesNum > 0 && !dueDate) {
      setError("Please select a due date for the remaining fees balance");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim().toUpperCase(),
          rollNumber: rollNumber?.trim() || undefined,
          dob,
          photoUrl: photoUrl || undefined,
          gender: gender || undefined,
          bloodGroup: bloodGroup || undefined,
          aadharNumber: aadharNumber.trim() || undefined,
          category: category || undefined,
          currentAddress: currentAddress.trim() || undefined,
          permanentAddress: (sameAsCurrent ? currentAddress : permanentAddress).trim() || undefined,
          previousSchoolName: previousSchoolName.trim() || undefined,
          previousClass: previousClass.trim() || undefined,
          transferCertificateNumber: transferCertificateNumber.trim() || undefined,
          fatherName: fatherName.trim() || undefined,
          fatherOccupation: fatherOccupation.trim() || undefined,
          fatherPhone: fatherPhone.trim() || undefined,
          motherName: motherName.trim() || undefined,
          motherOccupation: motherOccupation.trim() || undefined,
          motherPhone: motherPhone.trim() || undefined,
          guardianName: guardianName.trim() || undefined,
          guardianRelation: guardianRelation.trim() || undefined,
          guardianPhone: guardianPhone.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          medicalConditions: medicalConditions.trim() || undefined,
          totalFees: totalFees.trim() ? totalFees.trim() : undefined,
          amountPaidNow: amountPaidNow.trim() ? amountPaidNow.trim() : undefined,
          dueDate: remainingFeesNum > 0 && dueDate ? dueDate : undefined,
          paymentMethod: Number(amountPaidNow) > 0 ? paymentMethod : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to complete student admission");
        setSubmitting(false);
        return;
      }

      router.push("/admin/students");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Header & Back Button */}
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/admin/students"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "12px",
            transition: "color 0.15s ease",
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Students Roster</span>
        </Link>
        <div className="page-header" style={{ marginBottom: "8px" }}>
          <div>
            <h1 className="page-title">New Student Admission</h1>
            <p className="page-subtitle">
              Enter student demographic profile and admission fee details (class section can be assigned now or later)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "24px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section 1: Student Details */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--role-admin-light)",
                  color: "#818cf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Student Details</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Basic identity and demographic information</p>
              </div>
            </div>
          </div>

          {/* Student Photo Upload Field (Optional) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              padding: "16px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--border-color)",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* Avatar Preview */}
            <div
              style={{
                width: "74px",
                height: "74px",
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
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Student Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Camera size={28} />
              )}
            </div>

            {/* Controls & Description */}
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Student Passport Photo
                </span>
                <span className="badge badge-info" style={{ fontSize: "11px", padding: "1px 6px" }}>
                  Optional
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 10px 0" }}>
                Upload a clear frontal portrait photo. Supported formats: JPG, PNG, WebP (Max 5MB).
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <label
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: photoUploading ? "wait" : "pointer", gap: "6px", display: "inline-flex" }}
                >
                  <Upload size={13} />
                  <span>{photoUploading ? "Uploading..." : photoUrl ? "Change Photo" : "Choose Image File"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                    disabled={photoUploading}
                  />
                </label>

                {photoUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPhotoUrl("")}
                    style={{ color: "var(--danger)", gap: "4px" }}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {photoError && (
                <div style={{ fontSize: "12px", color: "var(--danger)", marginTop: "6px" }}>
                  {photoError}
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Full Name <span style={{ color: "var(--danger)" }}>*</span>
                <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "6px" }}>
                  (Auto-converts to uppercase)
                </span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. AARAV SHARMA"
                value={fullName}
                onChange={(e) => setFullName(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Roll Number
                <span className="badge badge-info" style={{ fontSize: "10px", marginLeft: "6px" }}>Optional</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. 53, 01, A-12"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Date of Birth <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                className="form-input"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select className="form-select" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                <option value="">Select Blood Group...</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select Category...</option>
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Aadhaar Number</span>
                <span className="badge badge-warning" style={{ fontSize: "10px", padding: "1px 6px" }}>
                  <ShieldAlert size={10} style={{ marginRight: "3px" }} /> Sensitive PII
                </span>
              </label>
              <input
                className="form-input"
                type="text"
                maxLength={16}
                placeholder="12-digit Aadhaar Card Number"
                value={aadharNumber}
                onChange={(e) => setAadharNumber(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "12px 16px",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px dashed var(--role-admin-border)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Sparkles size={18} color="#818cf8" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Auto-Generated Admission Number: </span>
              The system will sequentially allocate the admission number (e.g.{" "}
              <code style={{ color: "#818cf8", fontWeight: 600, fontFamily: "monospace" }}>AY-2026-0001</code>) upon enrollment.
            </div>
          </div>
        </div>

        {/* Section 2: Fee Details */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--role-accountant-light)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Receipt size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Admission Fee & Payment</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Setup initial fee invoice, compute remaining balance, and set due date</p>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Admission Fees (₹)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 25000 (leave empty if none)"
                value={totalFees}
                onChange={(e) => setTotalFees(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Paid Now (₹)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0 if unpaid"
                value={amountPaidNow}
                onChange={(e) => setAmountPaidNow(e.target.value)}
              />
            </div>
            {amountPaidNum > 0 && (
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>
            )}
          </div>

          {totalFeesNum > 0 && (
            <div className="form-row" style={{ marginTop: "6px" }}>
              {/* Read-only Remaining Fees Display */}
              <div className="form-group">
                <label className="form-label" style={{ color: "var(--text-secondary)" }}>
                  Remaining Fees (Auto-Calculated)
                </label>
                <div
                  style={{
                    height: "38px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 14px",
                    background: "var(--bg-surface-hover)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: remainingFeesNum > 0 ? "#fbbf24" : "#34d399",
                    fontWeight: 700,
                    fontSize: "14px",
                    letterSpacing: "0.01em",
                    userSelect: "none",
                  }}
                >
                  ₹{remainingFeesNum.toFixed(2)}
                  {remainingFeesNum === 0 && (
                    <span style={{ fontSize: "11.5px", fontWeight: 500, marginLeft: "8px", color: "var(--text-muted)" }}>
                      (Paid in Full)
                    </span>
                  )}
                </div>
              </div>

              {/* Due Date for Remaining Fees - only required/shown if remaining > 0 */}
              {remainingFeesNum > 0 ? (
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Due Date for Remaining Fees</span>
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" style={{ color: "var(--text-muted)" }}>
                    Due Date for Remaining Fees
                  </label>
                  <div
                    style={{
                      height: "38px",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 14px",
                      background: "var(--bg-surface)",
                      border: "1px dashed var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-muted)",
                      fontSize: "12.5px",
                    }}
                  >
                    No outstanding balance · N/A
                  </div>
                </div>
              )}
            </div>
          )}

          {totalFeesNum > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px 16px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Invoice Status: </span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {remainingFeesNum === 0 ? (
                    <span className="badge badge-success">PAID IN FULL</span>
                  ) : amountPaidNum > 0 ? (
                    <span className="badge badge-warning">PARTIALLY PAID</span>
                  ) : (
                    <span className="badge badge-danger">UNPAID (DUE)</span>
                  )}
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Balance Due:{" "}
                <span style={{ fontWeight: 700, color: remainingFeesNum > 0 ? "#fbbf24" : "var(--text-primary)" }}>
                  ₹{remainingFeesNum.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Address Information */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--role-teacher-light)",
                  color: "#2dd4bf",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Address Information</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Current residence and permanent contact address</p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Current Residential Address</label>
            <textarea
              className="form-textarea"
              placeholder="House/flat no, street, locality, city, state, pincode"
              value={currentAddress}
              onChange={(e) => handleCurrentAddressChange(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-primary)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={sameAsCurrent}
                onChange={(e) => handleSameAddressChange(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#6366f1", cursor: "pointer" }}
              />
              <span>Permanent address is same as current address</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Permanent Address</label>
            <textarea
              className="form-textarea"
              placeholder="House/flat no, street, locality, city, state, pincode"
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              disabled={sameAsCurrent}
              rows={3}
              style={{ opacity: sameAsCurrent ? 0.7 : 1 }}
            />
          </div>
        </div>

        {/* Section 4: Parent & Guardian Details */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--role-parent-light)",
                  color: "#fb7185",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Parent & Guardian Details</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Informational contacts (separate from Parent Portal login accounts)</p>
              </div>
            </div>
          </div>

          {/* Father's Info */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" }}>
              Father's Details
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Father's Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Father's full name"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Engineer, Business"
                  value={fatherOccupation}
                  onChange={(e) => setFatherOccupation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mother's Info */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" }}>
              Mother's Details
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mother's Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Mother's full name"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Doctor, Homemaker"
                  value={motherOccupation}
                  onChange={(e) => setMotherOccupation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Guardian's Info */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" }}>
              Guardian Details <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)" }}>(Optional / if applicable)</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Guardian's Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Guardian's name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Relationship</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Uncle, Grandparent"
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Previous School */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--role-teacher-light)",
                  color: "#2dd4bf",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Previous School Record</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Prior academic history and Transfer Certificate details</p>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Previous School Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Name of previous institute/school attended"
                value={previousSchoolName}
                onChange={(e) => setPreviousSchoolName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Previous Class / Grade</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Class 4"
                value={previousClass}
                onChange={(e) => setPreviousClass(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Transfer Certificate (TC) Number</label>
              <input
                className="form-input"
                type="text"
                placeholder="TC registration reference number"
                value={transferCertificateNumber}
                onChange={(e) => setTransferCertificateNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 6: Emergency & Medical */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--danger-light)",
                  color: "#f43f5e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HeartPulse size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Emergency & Medical Details</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Emergency contacts and health/allergy notifications</p>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Emergency Contact Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Name of emergency contact person"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact Phone</label>
              <input
                className="form-input"
                type="tel"
                placeholder="Emergency phone number"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Medical Conditions / Allergies / Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Specify any chronic conditions, allergies, regular medication or special physical requirements..."
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "10px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <Link href="/admin/students" className="btn btn-secondary">
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ minWidth: "180px" }}>
            {submitting ? (
              <>
                <Sparkles size={16} className="animate-spin" />
                <span>Enrolling Student...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Complete Admission</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
