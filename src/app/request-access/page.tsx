"use client";

import { useState } from "react";
import Link from "next/link";
import { School, Building, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface RequestAccessSuccess {
  message?: string;
  verificationToken?: string;
}

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({
    schoolName: "",
    boardType: "CBSE",
    officialEmail: "",
    phone: "",
    principalName: "",
    affiliationNo: "",
    address: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
    documentUrl: "",
    documentName: "",
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<RequestAccessSuccess | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/schools/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration request");
      }

      setSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", padding: "32px 16px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              backgroundColor: "var(--brand-primary)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <School size={24} />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
            Register Your School
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
            Submit your institution details for platform owner approval and secure multi-tenant activation.
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13.5px",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
              Registration Request Submitted
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              {success.message}
            </p>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Admin Email:</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
                {formData.adminEmail}
              </div>
              <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Verification Token:</div>
              <code
                style={{
                  display: "block",
                  padding: "8px 12px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                {success.verificationToken}
              </code>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link
                href={`/verify-email?type=school&email=${encodeURIComponent(formData.adminEmail)}&token=${encodeURIComponent(success.verificationToken || "")}`}
                className="btn btn-primary"
                style={{ padding: "10px 20px", textDecoration: "none" }}
              >
                Verify Email Now →
              </Link>
              <Link
                href="/login"
                className="btn btn-secondary"
                style={{ padding: "10px 20px", textDecoration: "none" }}
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "28px",
            }}
          >
            {/* Section 1: Institution Details */}
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--brand-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  margin: "0 0 16px 0",
                  paddingBottom: "8px",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <Building size={18} />
                <span>School Institution Information</span>
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    School Official Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cambridge Public School"
                    className="form-input"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Affiliation Board *
                  </label>
                  <select
                    className="form-input"
                    value={formData.boardType}
                    onChange={(e) => setFormData({ ...formData, boardType: e.target.value })}
                  >
                    <option value="CBSE">CBSE (Central Board)</option>
                    <option value="ICSE">ICSE / ISC</option>
                    <option value="STATE">State Board</option>
                    <option value="CAMBRIDGE">Cambridge / IB</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Affiliation / Registration No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE/AFF/2026/9941"
                    className="form-input"
                    value={formData.affiliationNo}
                    onChange={(e) => setFormData({ ...formData, affiliationNo: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Official School Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="info@school.edu.in"
                    className="form-input"
                    value={formData.officialEmail}
                    onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Official Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Principal / Head of Institution *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name of Principal or Director"
                    className="form-input"
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Campus Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street, City, State, PIN"
                    className="form-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Verification Document (PDF or Image, max 10MB)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="form-input"
                      style={{ padding: "6px" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setUploadingDoc(true);
                          const uploadData = new FormData();
                          uploadData.append("document", file);
                          const res = await fetch("/api/upload/registration-document", {
                            method: "POST",
                            body: uploadData,
                          });
                          const json = await res.json();
                          if (!res.ok) throw new Error(json.error || "Upload failed");
                          setFormData((prev) => ({
                            ...prev,
                            documentUrl: json.url,
                            documentName: json.filename,
                          }));
                        } catch (err: unknown) {
                          alert(err instanceof Error ? err.message : "Failed to upload document");
                        } finally {
                          setUploadingDoc(false);
                        }
                      }}
                    />
                    {uploadingDoc && <span style={{ fontSize: "12px", color: "var(--brand-primary)" }}>Uploading...</span>}
                    {formData.documentName && (
                      <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>
                        ✓ {formData.documentName}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "3px", display: "block" }}>
                    Upload Affiliation Certificate, Society Registration, or official school letterhead.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: School Administrator Account */}
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--brand-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  margin: "0 0 16px 0",
                  paddingBottom: "8px",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <ShieldCheck size={18} />
                <span>Primary School Administrator Account</span>
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className="form-input"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Administrator Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@school.edu.in"
                    className="form-input"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98111 22334"
                    className="form-input"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                    Create Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="form-input"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  />
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                    This password will be activated once platform Super Admin approves your registration.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                height: "44px",
                fontSize: "14.5px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {loading ? "Submitting Request..." : "Submit Registration Request"}
              <ArrowRight size={16} />
            </button>

            <div style={{ marginTop: "16px", textAlign: "center", fontSize: "13px" }}>
              Already registered?{" "}
              <Link href="/login" style={{ color: "var(--brand-primary)", fontWeight: 500, textDecoration: "none" }}>
                Sign in to your school
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
