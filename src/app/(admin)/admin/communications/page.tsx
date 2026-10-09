"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Sparkles, Phone, Users, ShieldAlert, CheckCircle2, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ClassItem {
  id: string;
  name: string;
  sections: Array<{ id: string; name: string }>;
}

const TEMPLATES = [
  {
    id: "absentee",
    name: "Daily Absentee Alert",
    audience: "ABSENTEES_TODAY",
    channel: "WHATSAPP",
    text: "Dear {parent_name}, this is to inform you that your child {student_name} is marked ABSENT today ({date}) at {school_name}. Please contact the school office if this is an error.",
  },
  {
    id: "fee_due",
    name: "Fee Due Reminder",
    audience: "FEE_DEFAULTERS",
    channel: "WHATSAPP",
    text: "Dear {parent_name}, fee invoice for {student_name} of amount {due_amount} is due by {due_date}. Please clear the outstanding balance promptly. Regards, {school_name}.",
  },
  {
    id: "ptm_invite",
    name: "Parent-Teacher Meeting (PTM)",
    audience: "CLASS_SECTION",
    channel: "WHATSAPP",
    text: "Dear Parent of {student_name}, you are cordially invited to the Parent-Teacher Meeting on Saturday at 9:00 AM at {school_name}. Your presence is requested.",
  },
  {
    id: "holiday_notice",
    name: "Emergency Holiday Notice",
    audience: "ALL_PARENTS",
    channel: "SMS",
    text: "School will remain closed tomorrow on account of public weather advisory. Online homework is available on the School ERP portal. - {school_name}",
  },
];

export default function CommunicationsPage() {
  const { addToast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [audience, setAudience] = useState<string>("ABSENTEES_TODAY");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [messageTemplate, setMessageTemplate] = useState<string>(TEMPLATES[0].text);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClasses(data);
          if (data.length > 0) setSelectedClassId(data[0].id);
        }
      });
  }, []);

  const handleSelectTemplate = (t: (typeof TEMPLATES)[0]) => {
    setMessageTemplate(t.text);
    setChannel(t.channel as any);
    setAudience(t.audience);
  };

  const insertVariable = (varName: string) => {
    setMessageTemplate((prev) => `${prev} {${varName}}`);
  };

  const handleSendBroadcast = async () => {
    if (!messageTemplate.trim()) {
      addToast("error", "Message template cannot be empty");
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          audience,
          classId: audience === "CLASS_SECTION" ? selectedClassId : undefined,
          sectionId: audience === "CLASS_SECTION" && selectedSectionId ? selectedSectionId : undefined,
          template: messageTemplate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Broadcast dispatch failed");
      }

      addToast("success", data.message || "Notifications dispatched successfully!");
      setLastResult(data.result);
    } catch (err: any) {
      addToast("error", err.message || "Failed to dispatch notifications");
    } finally {
      setIsSending(false);
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);

  // Live preview mockup calculation
  const previewText = messageTemplate
    .replace(/{student_name}/g, "Aarav Sharma")
    .replace(/{parent_name}/g, "Mr. Rajesh Sharma")
    .replace(/{school_name}/g, "Delhi Public Academy")
    .replace(/{date}/g, new Date().toLocaleDateString("en-IN"))
    .replace(/{due_amount}/g, "₹18,500")
    .replace(/{due_date}/g, "15-Apr-2026");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Broadcast & Communications Hub</h1>
          <p className="page-subtitle">Send automated SMS and official WhatsApp alerts to parents, teachers, and defaulters.</p>
        </div>
      </div>

      {/* Quick Template Selector */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "12px", color: "var(--text-muted)" }}>
          QUICK TEMPLATES
        </h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            >
              <Copy size={13} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        {/* Form Controls */}
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Channel Selection */}
            <div>
              <label className="label">Delivery Channel</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setChannel("WHATSAPP")}
                  className={`btn ${channel === "WHATSAPP" ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    flex: 1,
                    backgroundColor: channel === "WHATSAPP" ? "#10b981" : undefined,
                    borderColor: channel === "WHATSAPP" ? "#10b981" : undefined,
                  }}
                >
                  <MessageSquare size={16} />
                  <span>WhatsApp Cloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("SMS")}
                  className={`btn ${channel === "SMS" ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    flex: 1,
                    backgroundColor: channel === "SMS" ? "#3b82f6" : undefined,
                    borderColor: channel === "SMS" ? "#3b82f6" : undefined,
                  }}
                >
                  <Phone size={16} />
                  <span>SMS Gateway</span>
                </button>
              </div>
            </div>

            {/* Audience Selection */}
            <div>
              <label className="label">Target Audience Cohort</label>
              <select
                className="input"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="ABSENTEES_TODAY">🚨 Today's Absentees (Attendance Cross-Reference)</option>
                <option value="FEE_DEFAULTERS">💰 Fee Defaulters (Overdue / Unpaid Invoices)</option>
                <option value="CLASS_SECTION">🏫 Specific Class & Section</option>
                <option value="ALL_PARENTS">📢 All Enrolled Students & Parents</option>
              </select>
            </div>

            {audience === "CLASS_SECTION" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="label">Class</label>
                  <select
                    className="input"
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedSectionId("");
                    }}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Section</label>
                  <select
                    className="input"
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                  >
                    <option value="">All Sections</option>
                    {currentClass?.sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Template text area */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label className="label" style={{ margin: 0 }}>Message Template</label>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {messageTemplate.length} characters
                </span>
              </div>
              <textarea
                className="input"
                rows={5}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Type your broadcast message..."
                style={{ fontFamily: "inherit", resize: "vertical" }}
              />
            </div>

            {/* Variable Tag Inserters */}
            <div>
              <label className="label" style={{ fontSize: "0.78rem" }}>Insert Dynamic Placeholders:</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  "student_name",
                  "parent_name",
                  "school_name",
                  "date",
                  "due_amount",
                  "due_date",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                  >
                    +{`{${tag}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Send Button */}
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={handleSendBroadcast}
                className="btn btn-primary"
                disabled={isSending}
                style={{ width: "100%", justifyContent: "center", padding: "12px" }}
              >
                {isSending ? (
                  <>
                    <Sparkles size={18} className="animate-spin" /> Dispatching Broadcast...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Send Broadcast ({channel})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div>
          <div className="card" style={{ position: "sticky", top: "24px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>
              📱 Live Message Preview
            </h3>

            <div
              style={{
                background: channel === "WHATSAPP" ? "#064e3b" : "#1e293b",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
                marginBottom: "16px",
              }}
            >
              {previewText}
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div>• Recipients will receive individualized rendered text.</div>
              <div>• Real-time delivery callbacks logged to audit stream.</div>
              <div>• Channel selected: <strong>{channel}</strong></div>
            </div>

            {/* Dispatch Results Box */}
            {lastResult && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontWeight: 600, fontSize: "0.9rem" }}>
                  <CheckCircle2 size={16} /> Broadcast Summary
                </div>
                <div style={{ fontSize: "0.8rem", marginTop: "6px", color: "var(--text-muted)" }}>
                  Total Queued: <strong>{lastResult.total}</strong> | Successful: <strong>{lastResult.successful}</strong> | Failed: <strong>{lastResult.failed}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
