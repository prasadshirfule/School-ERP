"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import PublicFooter from "@/components/public-footer";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
            Contact &amp; Support
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
            Our team is here to help your institution get the most out of School ERP Cloud.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          {/* Contact Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Mail size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>Email Support</div>
                <div style={{ color: "#64748b", fontSize: "13.5px" }}>support@schoolerp.cloud</div>
                <div style={{ color: "#94a3b8", fontSize: "12.5px", marginTop: "2px" }}>Typical response within 4 hours</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Phone size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>Phone</div>
                <div style={{ color: "#64748b", fontSize: "13.5px" }}>+91-80-XXXX-XXXX</div>
                <div style={{ color: "#94a3b8", fontSize: "12.5px", marginTop: "2px" }}>Professional &amp; Enterprise plan priority line</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>Business Hours</div>
                <div style={{ color: "#64748b", fontSize: "13.5px" }}>Monday – Saturday, 9:00 AM – 6:00 PM IST</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>Head Office</div>
                <div style={{ color: "#64748b", fontSize: "13.5px" }}>Bengaluru, Karnataka, India</div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <CheckCircle2 size={40} color="#059669" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                  Message Sent Successfully!
                </h3>
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                  Our support team will respond within 4 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  Send Us a Message
                </h3>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                    Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="form-input"
                    style={{ resize: "vertical" }}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <Send size={16} />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
