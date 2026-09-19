"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  Receipt,
  User,
  MapPin,
  Users,
  BookOpen,
  HeartPulse,
  AlertCircle,
  FileText,
  Sparkles,
  ShieldAlert,
  Phone,
  Pencil,
  Save,
  RotateCcw,
  CheckCircle2,
  Upload,
  Trash2,
  Camera,
  CreditCard,
  X,
  Award,
} from "lucide-react";
import ReportCardView from "@/components/ReportCardView";
import CertificateView from "@/components/CertificateView";

interface StudentDetail {
  id: string;
  admissionNo: string;
  rollNumber: string | null;
  fullName: string;
  dob: string;
  gender: string | null;
  bloodGroup: string | null;
  aadharNumber: string | null;
  category: string | null;
  photoUrl: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  previousSchoolName: string | null;
  previousClass: string | null;
  transferCertificateNumber: string | null;
  fatherName: string | null;
  fatherOccupation: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherOccupation: string | null;
  motherPhone: string | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalConditions: string | null;
  isActive: boolean;
  academicYear: string;
  classDesignation: string | null;
  section: {
    id: string;
    name: string;
    class: {
      id: string;
      name: string;
    };
  } | null;
  parents: Array<{
    relationship: string;
    parent: {
      id: string;
      fullName: string;
      user: {
        email: string;
      };
    };
  }>;
  invoices: Array<{
    id: string;
    amountDue: string;
    discountAmount: string;
    dueDate: string;
    status: string;
    feeStructure: {
      name: string;
      academicYear: string;
      amount: string;
    };
    payments: Array<{
      id: string;
      amount: string;
      paymentDate: string;
      method: string;
      receiptNumber: string;
    }>;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    status: string;
  }>;
}

const STATUS_BADGE: Record<string, string> = {
  PAID: "badge-success",
  PARTIALLY_PAID: "badge-warning",
  UNPAID: "badge-danger",
  OVERDUE: "badge-danger",
  PRESENT: "badge-success",
  ABSENT: "badge-danger",
  LATE: "badge-warning",
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Report Card Modal State
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [loadingReportCard, setLoadingReportCard] = useState(false);

  // Certificate Modal State
  const [showCertModal, setShowCertModal] = useState(false);
  const [certType, setCertType] = useState<"BONAFIDE" | "TC" | "CHARACTER">("BONAFIDE");
  const [certPurpose, setCertPurpose] = useState("Higher Education Admission / Official Records");
  const [certReason, setCertReason] = useState("Parent Job Transfer / Relocation");
  const [certLastDate, setCertLastDate] = useState(new Date().toISOString().slice(0, 10));
  const [certConduct, setCertConduct] = useState("Good");
  const [certTcNumber, setCertTcNumber] = useState("");
  const [certIssueDate, setCertIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [certData, setCertData] = useState<any>(null);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certError, setCertError] = useState("");

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Edit Form Fields
  const [editFullName, setEditFullName] = useState("");
  const [editRollNumber, setEditRollNumber] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editAadharNumber, setEditAadharNumber] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const [editCurrentAddress, setEditCurrentAddress] = useState("");
  const [editSameAsCurrent, setEditSameAsCurrent] = useState(false);
  const [editPermanentAddress, setEditPermanentAddress] = useState("");

  const [editFatherName, setEditFatherName] = useState("");
  const [editFatherOccupation, setEditFatherOccupation] = useState("");
  const [editFatherPhone, setEditFatherPhone] = useState("");

  const [editMotherName, setEditMotherName] = useState("");
  const [editMotherOccupation, setEditMotherOccupation] = useState("");
  const [editMotherPhone, setEditMotherPhone] = useState("");

  const [editGuardianName, setEditGuardianName] = useState("");
  const [editGuardianRelation, setEditGuardianRelation] = useState("");
  const [editGuardianPhone, setEditGuardianPhone] = useState("");

  const [editPreviousSchoolName, setEditPreviousSchoolName] = useState("");
  const [editPreviousClass, setEditPreviousClass] = useState("");
  const [editTransferCertificateNumber, setEditTransferCertificateNumber] = useState("");

  const [editEmergencyContactName, setEditEmergencyContactName] = useState("");
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState("");
  const [editMedicalConditions, setEditMedicalConditions] = useState("");
  const [editClassDesignation, setEditClassDesignation] = useState("");

  // Payment Modal States (Admin & Accountant Record Payment Power)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [targetInvoice, setTargetInvoice] = useState<StudentDetail["invoices"][0] | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState("");

  const fetchStudentProfile = () => {
    if (!id) return;
    fetch(`/api/students/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Student profile not found");
        }
        return res.json();
      })
      .then((data: StudentDetail) => {
        setStudent(data);
        populateEditForm(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const populateEditForm = (data: StudentDetail) => {
    setEditFullName(data.fullName || "");
    setEditRollNumber(data.rollNumber || "");
    setEditDob(data.dob ? data.dob.split("T")[0] : "");
    setEditGender(data.gender || "");
    setEditBloodGroup(data.bloodGroup || "");
    setEditAadharNumber(data.aadharNumber || "");
    setEditCategory(data.category || "");
    setEditPhotoUrl(data.photoUrl || "");

    setEditCurrentAddress(data.currentAddress || "");
    setEditPermanentAddress(data.permanentAddress || "");
    setEditSameAsCurrent(!!data.currentAddress && data.currentAddress === data.permanentAddress);

    setEditFatherName(data.fatherName || "");
    setEditFatherOccupation(data.fatherOccupation || "");
    setEditFatherPhone(data.fatherPhone || "");

    setEditMotherName(data.motherName || "");
    setEditMotherOccupation(data.motherOccupation || "");
    setEditMotherPhone(data.motherPhone || "");

    setEditGuardianName(data.guardianName || "");
    setEditGuardianRelation(data.guardianRelation || "");
    setEditGuardianPhone(data.guardianPhone || "");

    setEditPreviousSchoolName(data.previousSchoolName || "");
    setEditPreviousClass(data.previousClass || "");
    setEditTransferCertificateNumber(data.transferCertificateNumber || "");

    setEditEmergencyContactName(data.emergencyContactName || "");
    setEditEmergencyContactPhone(data.emergencyContactPhone || "");
    setEditMedicalConditions(data.medicalConditions || "");
    setEditClassDesignation(data.classDesignation || "");
  };

  useEffect(() => {
    fetchStudentProfile();
  }, [id]);

  useEffect(() => {
    if (!id || !showReportCardModal) return;
    setLoadingReportCard(true);
    fetch(`/api/students/${id}/report-card`)
      .then((r) => r.json())
      .then((data) => {
        setReportCardData(data);
        setLoadingReportCard(false);
      })
      .catch(() => {
        setLoadingReportCard(false);
      });
  }, [id, showReportCardModal]);

  const openCertModal = () => {
    setCertData(null);
    setCertError("");
    const yr = new Date().getFullYear();
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    setCertTcNumber(`TC-${yr}-${rand}`);
    setShowCertModal(true);
  };

  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setGeneratingCert(true);
    setCertError("");
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          type: certType,
          fields: {
            purpose: certPurpose,
            reasonForLeaving: certReason,
            lastAttendanceDate: certLastDate,
            conductRemark: certConduct,
            tcNumber: certTcNumber,
            issueDate: certIssueDate,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate certificate");
      }
      setCertData(data);
    } catch (err: any) {
      setCertError(err.message || "Failed to generate certificate");
    } finally {
      setGeneratingCert(false);
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload photo");
      }
      setEditPhotoUrl(data.photoUrl);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to upload photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setEditError("Full Legal Name is required.");
      return;
    }
    if (!editDob) {
      setEditError("Date of birth is required.");
      return;
    }
    try {
      setSavingEdit(true);
      setEditError("");
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName.trim().toUpperCase(),
          rollNumber: editRollNumber.trim() || null,
          dob: editDob,
          gender: editGender || null,
          bloodGroup: editBloodGroup || null,
          aadharNumber: editAadharNumber.trim() || null,
          category: editCategory || null,
          photoUrl: editPhotoUrl || null,
          currentAddress: editCurrentAddress.trim() || null,
          permanentAddress: (editSameAsCurrent ? editCurrentAddress : editPermanentAddress).trim() || null,
          fatherName: editFatherName.trim() || null,
          fatherOccupation: editFatherOccupation.trim() || null,
          fatherPhone: editFatherPhone.trim() || null,
          motherName: editMotherName.trim() || null,
          motherOccupation: editMotherOccupation.trim() || null,
          motherPhone: editMotherPhone.trim() || null,
          guardianName: editGuardianName.trim() || null,
          guardianRelation: editGuardianRelation.trim() || null,
          guardianPhone: editGuardianPhone.trim() || null,
          previousSchoolName: editPreviousSchoolName.trim() || null,
          previousClass: editPreviousClass.trim() || null,
          transferCertificateNumber: editTransferCertificateNumber.trim() || null,
          emergencyContactName: editEmergencyContactName.trim() || null,
          emergencyContactPhone: editEmergencyContactPhone.trim() || null,
          medicalConditions: editMedicalConditions.trim() || null,
          classDesignation: editClassDesignation.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update student profile");
      }

      setStudent(data);
      populateEditForm(data);
      setIsEditing(false);
      setActionSuccess("Student enrollment and demographic details updated successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setEditError(err.message || "Failed to update student profile");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Payment Modal
  const openRecordPaymentModal = (inv: StudentDetail["invoices"][0]) => {
    setTargetInvoice(inv);
    const paid = inv.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const due = parseFloat(inv.amountDue);
    const remaining = Math.max(0, due - paid);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentMethod("CASH");
    // Generate suggested receipt number
    const currentYear = new Date().getFullYear();
    const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
    setPaymentReceiptNumber(`REC-${currentYear}-${randomSuffix}`);
    setPaymentError("");
    setShowPaymentModal(true);
  };

  // Record Payment (Admin & Accountant)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvoice || !paymentAmount || !paymentReceiptNumber) {
      setPaymentError("Please fill in payment amount and receipt number.");
      return;
    }
    try {
      setRecordingPayment(true);
      setPaymentError("");
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInvoice.id,
          amount: paymentAmount,
          method: paymentMethod,
          receiptNumber: paymentReceiptNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment");
      }
      setShowPaymentModal(false);
      setTargetInvoice(null);
      setActionSuccess(`Payment recorded successfully (Receipt #${paymentReceiptNumber}).`);
      setTimeout(() => setActionSuccess(""), 4000);
      fetchStudentProfile();
    } catch (err: any) {
      setPaymentError(err.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not specified";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "Invalid Date"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading student profile...
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ maxWidth: "800px", margin: "40px auto", textAlign: "center" }}>
        <div className="alert alert-error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error || "Student not found"}</span>
        </div>
        <Link href="/admin/students" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Students List</span>
        </Link>
      </div>
    );
  }

  // Attendance metrics
  const totalAttendance = student.attendance.length;
  const presentDays = student.attendance.filter((a) => a.status === "PRESENT").length;
  const absentDays = student.attendance.filter((a) => a.status === "ABSENT").length;
  const lateDays = student.attendance.filter((a) => a.status === "LATE").length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;

  // Fee totals
  const totalInvoiced = student.invoices.reduce((sum, inv) => sum + parseFloat(inv.amountDue), 0);
  const totalPaid = student.invoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((pSum, p) => pSum + parseFloat(p.amount), 0),
    0
  );
  const balanceOutstanding = Math.max(0, totalInvoiced - totalPaid);

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* ─── Breadcrumb & Header ─── */}
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

        {actionSuccess && (
          <div className="alert alert-success" style={{ marginBottom: "16px" }}>
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
        )}

        <div className="page-header" style={{ alignItems: "flex-start", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Student Photo Avatar */}
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "var(--radius-md)",
                  objectFit: "cover",
                  border: "2px solid var(--border-color)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--role-admin-light)",
                  color: "#818cf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  fontWeight: 700,
                  border: "2px solid var(--role-admin-border)",
                  flexShrink: 0,
                }}
              >
                {student.fullName.charAt(0)}
              </div>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <h1 className="page-title" style={{ margin: 0 }}>
                  {student.fullName}
                </h1>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#818cf8",
                    background: "var(--role-admin-light)",
                    border: "1px solid var(--role-admin-border)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                  title="Admission Number (Permanent & Immutable)"
                >
                  {student.admissionNo}
                </span>
                {student.isActive ? (
                  <span className="badge badge-success">Active Student</span>
                ) : (
                  <span className="badge badge-danger">Withdrawn</span>
                )}
                {student.classDesignation && (
                  <span className="badge badge-teal" title="Section Leadership Role">
                    ★ {student.classDesignation}
                  </span>
                )}
              </div>
              <p className="page-subtitle" style={{ marginTop: "4px" }}>
                Academic Session: {student.academicYear} • Enrolled in:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {student.section
                    ? `${student.section.class.name} — Section ${student.section.name}`
                    : "Unassigned Section"}
                </strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {!isEditing ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(true)}
                  style={{ gap: "7px" }}
                >
                  <Pencil size={15} />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReportCardModal(true)}
                  style={{ gap: "7px" }}
                >
                  <FileText size={15} />
                  <span>View Report Card</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openCertModal}
                  style={{ gap: "7px" }}
                >
                  <Award size={15} />
                  <span>Generate Certificate</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  if (student) populateEditForm(student);
                  setEditError("");
                }}
                style={{ gap: "7px" }}
              >
                <RotateCcw size={15} />
                <span>Cancel Editing</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── LIVE EDIT MODE FORM ─── */}
      {isEditing ? (
        <form onSubmit={handleSaveStudentEdit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {editError && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{editError}</span>
            </div>
          )}

          {/* Section 1: Personal & Demographic Info */}
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
                  <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Student Details & Demographics</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                    Update student legal name, photo, and identity records. Admission Number ({student.admissionNo}) is permanent.
                  </p>
                </div>
              </div>
            </div>

            {/* Photo Upload */}
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
                {editPhotoUrl ? (
                  <img
                    src={editPhotoUrl}
                    alt="Student Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Camera size={28} />
                )}
              </div>

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
                    <span>{photoUploading ? "Uploading..." : editPhotoUrl ? "Change Photo" : "Choose Image File"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                      disabled={photoUploading}
                    />
                  </label>

                  {editPhotoUrl && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditPhotoUrl("")}
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
                  Full Legal Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. AARAV SHARMA"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value.toUpperCase())}
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
                  value={editRollNumber}
                  onChange={(e) => setEditRollNumber(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Class Designation / Leadership
                  <span className="badge badge-info" style={{ fontSize: "10px", marginLeft: "6px" }}>Optional</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Class Monitor, Sports Captain, Prefect"
                  value={editClassDesignation}
                  onChange={(e) => setEditClassDesignation(e.target.value)}
                  list="designation-suggestions"
                />
                <datalist id="designation-suggestions">
                  <option value="Class Monitor" />
                  <option value="Assistant Monitor" />
                  <option value="Sports Captain" />
                  <option value="House Captain" />
                  <option value="Discipline Prefect" />
                  <option value="Cultural Secretary" />
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Date of Birth <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={editGender} onChange={(e) => setEditGender(e.target.value)}>
                  <option value="">Select Gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" value={editBloodGroup} onChange={(e) => setEditBloodGroup(e.target.value)}>
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
                <select className="form-select" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                  <option value="">Select Category...</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Aadhaar Number</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="12-digit UIDAI number"
                  maxLength={12}
                  value={editAadharNumber}
                  onChange={(e) => setEditAadharNumber(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address Details */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "var(--role-student-light)",
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
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Current residence and permanent home address</p>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label">Current Residential Address</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="House / Flat No., Street, Locality, City, State, PIN"
                value={editCurrentAddress}
                onChange={(e) => setEditCurrentAddress(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={editSameAsCurrent}
                  onChange={(e) => setEditSameAsCurrent(e.target.checked)}
                  style={{ accentColor: "var(--primary-color)", width: "16px", height: "16px", cursor: "pointer" }}
                />
                Permanent address is same as current residence
              </label>
            </div>

            {!editSameAsCurrent && (
              <div className="form-group">
                <label className="form-label">Permanent Address</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Permanent village / hometown address"
                  value={editPermanentAddress}
                  onChange={(e) => setEditPermanentAddress(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Section 3: Parent & Guardian Information */}
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
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Father, Mother, and optional Guardian details</p>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Father&apos;s Information
            </div>
            <div className="form-row" style={{ marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Father&apos;s Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. RAJESH SHARMA"
                  value={editFatherName}
                  onChange={(e) => setEditFatherName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Father&apos;s Occupation</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Business / Engineer"
                  value={editFatherOccupation}
                  onChange={(e) => setEditFatherOccupation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Father&apos;s Phone</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={editFatherPhone}
                  onChange={(e) => setEditFatherPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Mother&apos;s Information
            </div>
            <div className="form-row" style={{ marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Mother&apos;s Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. SUNITA SHARMA"
                  value={editMotherName}
                  onChange={(e) => setEditMotherName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mother&apos;s Occupation</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Doctor / Homemaker"
                  value={editMotherOccupation}
                  onChange={(e) => setEditMotherOccupation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mother&apos;s Phone</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={editMotherPhone}
                  onChange={(e) => setEditMotherPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Guardian&apos;s Information (Optional)
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Guardian&apos;s Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. VIKRAM SHARMA"
                  value={editGuardianName}
                  onChange={(e) => setEditGuardianName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Relationship to Student</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Uncle / Grandfather"
                  value={editGuardianRelation}
                  onChange={(e) => setEditGuardianRelation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Guardian&apos;s Phone</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={editGuardianPhone}
                  onChange={(e) => setEditGuardianPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Previous School & Medical Info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            <div className="card">
              <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "var(--role-student-light)",
                      color: "#2dd4bf",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Prior Academic Record</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Previous school and transfer certificate</p>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">Previous School Attended</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. St. Xavier High School"
                  value={editPreviousSchoolName}
                  onChange={(e) => setEditPreviousSchoolName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">Last Class Passed / Attended</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Class 9 (CBSE)"
                  value={editPreviousClass}
                  onChange={(e) => setEditPreviousClass(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transfer Certificate (TC) Number</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. TC/2025/0892"
                  value={editTransferCertificateNumber}
                  onChange={(e) => setEditTransferCertificateNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px", marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(244, 63, 94, 0.12)",
                      color: "#f43f5e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <HeartPulse size={18} />
                  </div>
                  <div>
                    <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Emergency & Medical</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Emergency contact and known health conditions</p>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">Emergency Contact Person</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Rajesh Sharma (Father)"
                  value={editEmergencyContactName}
                  onChange={(e) => setEditEmergencyContactName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">Emergency Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="10-digit emergency number"
                  value={editEmergencyContactPhone}
                  onChange={(e) => setEditEmergencyContactPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Medical Conditions / Allergies / Notes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Asthma, Penicillin allergy, wears spectacles"
                  value={editMedicalConditions}
                  onChange={(e) => setEditMedicalConditions(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
              To reassign class section, use the <strong>Assign Class</strong> picker on the{" "}
              <Link href="/admin/students" style={{ color: "var(--text-primary)", textDecoration: "underline" }}>
                Students Roster
              </Link>
              .
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  if (student) populateEditForm(student);
                  setEditError("");
                }}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingEdit} style={{ gap: "7px" }}>
                {savingEdit ? (
                  <>
                    <Sparkles size={15} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Save Student Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* ─── READ-ONLY PROFILE VIEW ─── */
        <>
          {/* Top Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: "24px" }}>
            <div className="stat-card">
              <div className="stat-icon-wrap stat-icon-teal">
                <GraduationCap size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Assigned Class</span>
                <span className="stat-value" style={{ fontSize: "18px" }}>
                  {student.section ? `${student.section.class.name} (${student.section.name})` : "Unassigned"}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap stat-icon-indigo">
                <Calendar size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Attendance Rate</span>
                <span className="stat-value" style={{ fontSize: "22px", color: attendanceRate >= 75 ? "#34d399" : "#fbbf24" }}>
                  {totalAttendance > 0 ? `${attendanceRate}%` : "N/A"}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap stat-icon-amber">
                <Receipt size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Fee Outstanding</span>
                <span
                  className="stat-value"
                  style={{ fontSize: "22px", color: balanceOutstanding > 0 ? "#fbbf24" : "#34d399" }}
                >
                  ₹{balanceOutstanding.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Section 1: Personal & Demographic Info */}
            <div className="card">
              <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={18} color="#818cf8" />
                  <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Personal & Demographic Details</h3>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Full Legal Name
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "2px" }}>
                    {student.fullName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Date of Birth
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", marginTop: "2px" }}>
                    {formatDate(student.dob)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Gender
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)", marginTop: "2px" }}>
                    {student.gender || "Not specified"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Blood Group
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)", marginTop: "2px" }}>
                    {student.bloodGroup ? (
                      <span className="badge badge-info">{student.bloodGroup}</span>
                    ) : (
                      "Not specified"
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Category
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)", marginTop: "2px" }}>
                    {student.category || "General"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Aadhaar Number
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {student.aadharNumber ? (
                      <>
                        <span style={{ fontFamily: "monospace" }}>{student.aadharNumber}</span>
                        <span className="badge badge-warning" style={{ fontSize: "10px", padding: "1px 5px" }}>
                          <ShieldAlert size={10} style={{ marginRight: "3px" }} /> PII
                        </span>
                      </>
                    ) : (
                      "Not recorded"
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Addresses */}
            <div className="card">
              <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={18} color="#2dd4bf" />
                  <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Address Information</h3>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
                    CURRENT RESIDENCE
                  </div>
                  <div style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {student.currentAddress || "No current address recorded"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>
                    PERMANENT ADDRESS
                  </div>
                  <div style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {student.permanentAddress || "No permanent address recorded"}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Parent & Guardian Details */}
            <div className="card">
              <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={18} color="#fb7185" />
                  <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Parent & Guardian Contacts</h3>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
                {/* Father */}
                <div style={{ padding: "12px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                    FATHER
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {student.fatherName || "—"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {student.fatherOccupation ? `Occupation: ${student.fatherOccupation}` : "Occupation not specified"}
                  </div>
                  {student.fatherPhone && (
                    <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Phone size={12} />
                      <span>{student.fatherPhone}</span>
                    </div>
                  )}
                </div>

                {/* Mother */}
                <div style={{ padding: "12px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                    MOTHER
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {student.motherName || "—"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {student.motherOccupation ? `Occupation: ${student.motherOccupation}` : "Occupation not specified"}
                  </div>
                  {student.motherPhone && (
                    <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Phone size={12} />
                      <span>{student.motherPhone}</span>
                    </div>
                  )}
                </div>

                {/* Guardian */}
                {(student.guardianName || student.guardianPhone) && (
                  <div style={{ padding: "12px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                      GUARDIAN
                    </div>
                    <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {student.guardianName || "—"}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Relation: {student.guardianRelation || "Guardian"}
                    </div>
                    {student.guardianPhone && (
                      <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <Phone size={12} />
                        <span>{student.guardianPhone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Linked portal users if any */}
              {student.parents.length > 0 && (
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px" }}>
                    LINKED PARENT PORTAL ACCOUNTS
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {student.parents.map((p) => (
                      <div key={p.parent.id} className="badge badge-teal" style={{ padding: "6px 12px", fontSize: "12px" }}>
                        <span>{p.parent.fullName}</span>
                        <span style={{ opacity: 0.7 }}>({p.relationship})</span>
                        <span>• {p.parent.user.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Previous School & Medical */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {/* Previous School */}
              <div className="card">
                <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <BookOpen size={18} color="#2dd4bf" />
                    <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Prior Academic Record</h3>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Previous School: </span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {student.previousSchoolName || "No previous school recorded"}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Last Class Attended: </span>
                    <div style={{ color: "var(--text-secondary)" }}>{student.previousClass || "—"}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Transfer Certificate (TC) No: </span>
                    <div style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                      {student.transferCertificateNumber || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency & Medical */}
              <div className="card">
                <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <HeartPulse size={18} color="#f43f5e" />
                    <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Emergency & Medical</h3>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Emergency Contact: </span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {student.emergencyContactName || "Not specified"}
                    </div>
                    {student.emergencyContactPhone && (
                      <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                        <Phone size={12} />
                        <span>{student.emergencyContactPhone}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Medical Conditions & Allergies: </span>
                    <div style={{ color: "var(--text-secondary)", lineHeight: 1.4, marginTop: "2px" }}>
                      {student.medicalConditions || "No chronic conditions or allergies noted"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Fee Invoices & Payment Ledger (Admin & Accountant Record Payment Power) */}
            <div className="card">
              <div
                className="card-header"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "12px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Receipt size={18} color="#fbbf24" />
                  <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Fee Statement & Invoices</h3>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fee Description</th>
                      <th>Due Date</th>
                      <th>Amount Due</th>
                      <th>Discount</th>
                      <th>Status</th>
                      <th>Payments Made</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state" style={{ padding: "24px" }}>
                            <Receipt size={24} color="#fbbf24" />
                            <div className="empty-state-title" style={{ fontSize: "14px" }}>No fee invoices issued</div>
                            <p className="empty-state-text">No invoices were generated during student admission.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      student.invoices.map((inv) => {
                        const paid = inv.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
                        const isPayable = inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID" || inv.status === "OVERDUE";
                        return (
                          <tr key={inv.id}>
                            <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.feeStructure.name}</td>
                            <td style={{ color: "var(--text-muted)" }}>{formatDate(inv.dueDate)}</td>
                            <td className="num-cell">₹{inv.amountDue}</td>
                            <td className="num-cell" style={{ color: "var(--text-muted)" }}>
                              {inv.discountAmount !== "0.00" ? `₹${inv.discountAmount}` : "—"}
                            </td>
                            <td>
                              <span className={`badge ${STATUS_BADGE[inv.status] || "badge-info"}`}>
                                <span className="badge-dot" />
                                <span>{inv.status.replace("_", " ")}</span>
                              </span>
                            </td>
                            <td>
                              {inv.payments.length === 0 ? (
                                <span style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>Unpaid</span>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ color: "#34d399", fontWeight: 600 }}>₹{paid.toFixed(2)}</span>
                                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {inv.payments.map((p) => (
                                      <a
                                        key={p.id}
                                        href={`/api/receipt/${p.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ fontSize: "11px", color: "#818cf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px" }}
                                        title="Download / View Receipt"
                                      >
                                        <FileText size={10} />
                                        <span>Receipt #{p.receiptNumber}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {isPayable ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openRecordPaymentModal(inv)}
                                  style={{ gap: "5px", fontSize: "12px" }}
                                >
                                  <CreditCard size={13} />
                                  <span>Record Payment</span>
                                </button>
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: "11px" }}>
                                  Settled
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
            </div>

            {/* Section 6: Attendance History (Last 30 Days) */}
            <div className="card">
              <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={18} color="#818cf8" />
                  <h3 className="card-title" style={{ margin: 0, fontSize: "15px" }}>Recent Attendance History (Last 30 Records)</h3>
                </div>
                {totalAttendance > 0 && (
                  <div style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
                    <span className="badge badge-success">{presentDays} Present</span>
                    <span className="badge badge-danger">{absentDays} Absent</span>
                    {lateDays > 0 && <span className="badge badge-warning">{lateDays} Late</span>}
                  </div>
                )}
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.attendance.length === 0 ? (
                      <tr>
                        <td colSpan={2}>
                          <div className="empty-state" style={{ padding: "24px" }}>
                            <Calendar size={24} color="#818cf8" />
                            <div className="empty-state-title" style={{ fontSize: "14px" }}>No attendance logs yet</div>
                            <p className="empty-state-text">Attendance logs will appear as class teachers take attendance.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      student.attendance.map((a) => (
                        <tr key={a.id}>
                          <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                            {formatDate(a.date)}
                          </td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[a.status] || "badge-info"}`}>
                              <span className="badge-dot" />
                              <span>{a.status.replace("_", " ")}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── LIVE REPORT CARD MODAL ─── */}
      {showReportCardModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowReportCardModal(false)}
        >
          <div
            style={{
              maxWidth: "850px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              borderRadius: "8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {loadingReportCard ? (
              <div className="card" style={{ padding: "40px", textAlign: "center" }}>
                <div className="loading">
                  <Sparkles size={18} className="animate-spin" /> Generating official report card...
                </div>
              </div>
            ) : reportCardData ? (
              <ReportCardView
                data={reportCardData}
                onClose={() => setShowReportCardModal(false)}
                showCloseButton={true}
              />
            ) : (
              <div className="card" style={{ padding: "40px", textAlign: "center" }}>
                <div className="empty-state-title">Unable to generate report card</div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "12px" }}
                  onClick={() => setShowReportCardModal(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CERTIFICATE GENERATION & PREVIEW MODAL ─── */}
      {showCertModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowCertModal(false)}
        >
          <div
            style={{
              maxWidth: certData ? "850px" : "540px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              borderRadius: "8px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {certData ? (
              <CertificateView
                data={certData}
                onClose={() => {
                  setCertData(null);
                  setShowCertModal(false);
                }}
              />
            ) : (
              <div className="card" style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Award size={18} color="#818cf8" />
                    <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>Generate Certificate</h3>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowCertModal(false)}
                    style={{ padding: "4px" }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                  Select the certificate type and fill the required details for <strong>{student.fullName}</strong>.
                </p>

                {certError && (
                  <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                    <AlertCircle size={15} />
                    <span>{certError}</span>
                  </div>
                )}

                <form onSubmit={handleGenerateCertificate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="form-group">
                    <label className="form-label">Certificate Type *</label>
                    <select
                      className="form-select"
                      value={certType}
                      onChange={(e) => setCertType(e.target.value as any)}
                    >
                      <option value="BONAFIDE">Bonafide Certificate</option>
                      <option value="TC">Transfer Certificate (TC - Persisted in TC Register)</option>
                      <option value="CHARACTER">Character Certificate</option>
                    </select>
                  </div>

                  {certType === "BONAFIDE" && (
                    <div className="form-group">
                      <label className="form-label">Purpose of Certificate</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Passport Application / Bank Account / Higher Studies"
                        value={certPurpose}
                        onChange={(e) => setCertPurpose(e.target.value)}
                      />
                    </div>
                  )}

                  {certType === "TC" && (
                    <>
                      <div className="form-group">
                        <label className="form-label">TC Certificate Number *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={certTcNumber}
                          onChange={(e) => setCertTcNumber(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Reason for Leaving School *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Relocation to another city / Course Completion"
                          value={certReason}
                          onChange={(e) => setCertReason(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Last Attendance Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={certLastDate}
                            onChange={(e) => setCertLastDate(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Conduct &amp; Behavior</label>
                          <select
                            className="form-select"
                            value={certConduct}
                            onChange={(e) => setCertConduct(e.target.value)}
                          >
                            <option value="Exemplary">Exemplary</option>
                            <option value="Good">Good</option>
                            <option value="Satisfactory">Satisfactory</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {certType === "CHARACTER" && (
                    <div className="form-group">
                      <label className="form-label">General Conduct Remark</label>
                      <select
                        className="form-select"
                        value={certConduct}
                        onChange={(e) => setCertConduct(e.target.value)}
                      >
                        <option value="Exemplary">Exemplary</option>
                        <option value="Good">Good</option>
                        <option value="Satisfactory">Satisfactory</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Date of Issue</label>
                    <input
                      type="date"
                      className="form-input"
                      value={certIssueDate}
                      onChange={(e) => setCertIssueDate(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCertModal(false)}
                      disabled={generatingCert}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={generatingCert}
                      style={{ gap: "6px" }}
                    >
                      {generatingCert ? (
                        <>
                          <Sparkles size={14} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Award size={14} />
                          <span>Generate &amp; Preview</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── RECORD PAYMENT MODAL (Admin & Accountant) ─── */}
      {showPaymentModal && targetInvoice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: "480px", width: "100%", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CreditCard size={18} color="#34d399" />
                <h3 className="card-title" style={{ margin: 0, fontSize: "16px" }}>Record Fee Payment</h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPaymentModal(false)}
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: "12px",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              <div><strong>Fee Item:</strong> {targetInvoice.feeStructure.name}</div>
              <div style={{ marginTop: "4px", color: "var(--text-muted)" }}>
                Total Invoiced: ₹{targetInvoice.amountDue} | Due: {formatDate(targetInvoice.dueDate)}
              </div>
            </div>

            {paymentError && (
              <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                <AlertCircle size={16} />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">
                  Payment Amount (₹) <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online / UPI / NetBanking</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Receipt Number <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={paymentReceiptNumber}
                  onChange={(e) => setPaymentReceiptNumber(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={recordingPayment}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={recordingPayment} style={{ gap: "6px" }}>
                  {recordingPayment ? <Sparkles size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  <span>{recordingPayment ? "Recording..." : "Record Payment & Generate Receipt"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
