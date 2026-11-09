"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  pricePerStudentMonth: number;
  pricePerStudentYear: number;
  minStudents: number;
  maxStudents: number | null;
  features: string[];
}

interface SubscriptionData {
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "EXPIRED" | "CANCELLED";
  isReadOnly: boolean;
  daysRemaining: number;
  activeStudents: number;
  maxStudents: number | null;
  subscription: {
    id: string;
    billingCycle: "MONTHLY" | "ANNUAL";
    trialStartsAt: string;
    trialEndsAt: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  plan: Plan | null;
  school: {
    id: string;
    name: string;
    status: string;
  };
}

export default function AdminSubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSubscriptionInfo = useCallback(async () => {
    try {
      setLoading(true);
      const [subRes, plansRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/plans"),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setData(subData);
        if (subData.plan?.id) {
          setSelectedPlanId(subData.plan.id);
        }
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
        if (!selectedPlanId && plansData.plans?.length > 0) {
          setSelectedPlanId(plansData.plans[0].id);
        }
      }
    } catch (err: unknown) {
      console.error("Error loading subscription:", err);
      setMessage({ type: "error", text: "Failed to load subscription details" });
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      try {
        const [subRes, plansRes] = await Promise.all([
          fetch("/api/subscription"),
          fetch("/api/plans"),
        ]);

        if (!ignore && subRes.ok) {
          const subData = await subRes.json();
          setData(subData);
          if (subData.plan?.id) {
            setSelectedPlanId(subData.plan.id);
          }
        }

        if (!ignore && plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData.plans || []);
          if (!selectedPlanId && plansData.plans?.length > 0) {
            setSelectedPlanId(plansData.plans[0].id);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Error loading subscription:", err);
          setMessage({ type: "error", text: "Failed to load subscription details" });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    // Dynamically load Razorpay SDK
    if (!document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      ignore = true;
    };
  }, [selectedPlanId]);

  const handleCheckout = async (targetPlanId: string) => {
    try {
      setUpgrading(true);
      setMessage(null);

      // 1. Create order on backend
      const orderRes = await fetch("/api/subscription/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: targetPlanId,
          billingCycle,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create subscription order");
      }

      const orderData = await orderRes.json();

      // If simulated or test mock mode
      if (orderData.isMock || !window.Razorpay) {
        // Execute instant verification in test environment
        const verifyRes = await fetch("/api/subscription/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderData.orderId,
            paymentId: `pay_mock_${Date.now()}`,
            signature: `mock_sig_pay_mock_${Date.now()}`,
            planId: targetPlanId,
            billingCycle,
          }),
        });

        if (verifyRes.ok) {
          setMessage({
            type: "success",
            text: "Payment successfully verified! Your subscription is now active.",
          });
          await fetchSubscriptionInfo();
          setUpgrading(false);
          return;
        }
      }

      // 2. Open standard Razorpay Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency,
        name: "School ERP Cloud",
        description: `${orderData.plan.name} Plan (${billingCycle})`,
        order_id: orderData.orderId,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyRes = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planId: targetPlanId,
                billingCycle,
              }),
            });

            if (verifyRes.ok) {
              setMessage({
                type: "success",
                text: "Subscription activated successfully!",
              });
              await fetchSubscriptionInfo();
            } else {
              const err = await verifyRes.json();
              setMessage({ type: "error", text: err.error || "Verification failed" });
            }
          } catch {
            setMessage({ type: "error", text: "Error verifying payment signature" });
          } finally {
            setUpgrading(false);
          }
        },
        prefill: {
          name: data?.school?.name || "School Administrator",
        },
        theme: {
          color: "#1e3a8a",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
        setMessage({
          type: "error",
          text: `Payment failed: ${response.error?.description || "Transaction cancelled"}`,
        });
        setUpgrading(false);
      });
      rzp.open();
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to start checkout";
      setMessage({ type: "error", text: errMsg });
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Sparkles size={24} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 12px" }} />
        <div style={{ color: "#64748b", fontSize: "14px" }}>Loading subscription status...</div>
      </div>
    );
  }

  const isTrial = data?.status === "TRIALING";
  const isExpired = data?.status === "EXPIRED" || data?.isReadOnly;
  const isActive = data?.status === "ACTIVE";

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                backgroundColor: isActive ? "#059669" : isTrial ? "#d97706" : "#dc2626",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                letterSpacing: "0.5px",
              }}
            >
              {data?.status || "TRIAL"}
            </span>
            <h1 className="office-title">School Subscription & SaaS Plans</h1>
          </div>
          <p className="office-subtitle">
            Manage your institution&apos;s cloud license, student quotas, 30-day trial status, and annual billing
          </p>
        </div>

        <button
          onClick={fetchSubscriptionInfo}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: message.type === "success" ? "#065f46" : "#b91c1c",
          }}
        >
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Expiry / Status Alert Banner ─── */}
      {isExpired ? (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #f87171",
            borderRadius: "10px",
            padding: "18px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: "#991b1b" }}>
              Subscription Expired — Read-Only Mode Active
            </h3>
            <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#7f1d1d" }}>
              Your school&apos;s 30-day trial or billing period has ended. In accordance with safety policies, your data
              remains 100% intact and viewable, but creating new records or updates is restricted until renewed.
            </p>
            <button
              onClick={() => handleCheckout(selectedPlanId || plans[0]?.id)}
              disabled={upgrading}
              className="btn btn-primary"
              style={{ fontSize: "13px", padding: "8px 16px" }}
            >
              {upgrading ? "Processing..." : "Renew Subscription Now"}
            </button>
          </div>
        </div>
      ) : isTrial ? (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "10px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Clock size={20} color="#d97706" />
            <div>
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: "14px" }}>
                30-Day Free Platform Trial Active
              </div>
              <div style={{ color: "#b45309", fontSize: "12.5px" }}>
                {data?.daysRemaining} days remaining in your trial period. Upgrade anytime to ensure uninterrupted access.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleCheckout(selectedPlanId || plans[1]?.id || plans[0]?.id)}
            disabled={upgrading}
            className="btn btn-primary"
            style={{ fontSize: "12.5px", padding: "6px 14px", backgroundColor: "#d97706", borderColor: "#b45309" }}
          >
            {upgrading ? "Connecting..." : "Upgrade to Full Plan"}
          </button>
        </div>
      ) : null}

      {/* ─── Metrics Grid ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div className="office-card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Current Plan
            </span>
            <ShieldCheck size={18} color="#1e3a8a" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
            {data?.plan?.name || "Professional"}
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
            {isActive ? "Active Commercial License" : isTrial ? "Full-Feature Trial License" : "Expired"}
          </div>
        </div>

        <div className="office-card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Student Enrollment
            </span>
            <Users size={18} color="#059669" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
            {data?.activeStudents}
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 400 }}>
              {" "}
              / {data?.maxStudents ? `${data.maxStudents} max` : "Unlimited"}
            </span>
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
            Currently enrolled active students
          </div>
        </div>

        <div className="office-card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Time Remaining
            </span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
            {data?.daysRemaining}{" "}
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 400 }}>days</span>
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
            Until next renewal cycle
          </div>
        </div>
      </div>

      {/* ─── Plan Selector Section ─── */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>
          Select or Renew Your Institution&apos;s Plan
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0" }}>
          Transparent student-based pricing. Switch between monthly or annual billing to save 20%.
        </p>

        {/* Monthly / Annual Toggle */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px",
            backgroundColor: "#f1f5f9",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={() => setBillingCycle("MONTHLY")}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: billingCycle === "MONTHLY" ? "#fff" : "transparent",
              color: billingCycle === "MONTHLY" ? "#0f172a" : "#64748b",
              boxShadow: billingCycle === "MONTHLY" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("ANNUAL")}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: billingCycle === "ANNUAL" ? "#fff" : "transparent",
              color: billingCycle === "ANNUAL" ? "#0f172a" : "#64748b",
              boxShadow: billingCycle === "ANNUAL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Annual Billing</span>
            <span
              style={{
                backgroundColor: "#dcfce7",
                color: "#15803d",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* ─── Pricing Cards Grid ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        {plans.map((p) => {
          const isSelected = selectedPlanId === p.id;
          const isCurrent = data?.plan?.id === p.id;
          const price =
            billingCycle === "ANNUAL"
              ? Number(p.pricePerStudentYear)
              : Number(p.pricePerStudentMonth);

          return (
            <div
              key={p.id}
              className="office-card"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                border: isSelected ? "2px solid #1e3a8a" : "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: isSelected ? "0 8px 24px rgba(30, 58, 138, 0.08)" : "none",
              }}
            >
              {p.code === "PROFESSIONAL" && (
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    right: "20px",
                    backgroundColor: "#1e3a8a",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "12px",
                    letterSpacing: "0.5px",
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                  {p.name}
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", minHeight: "36px" }}>
                  {p.description}
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a" }}>₹{price}</span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    / student / {billingCycle === "ANNUAL" ? "year" : "month"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  Min {p.minStudents} students • {p.maxStudents ? `Up to ${p.maxStudents} students` : "Unlimited students"}
                </div>
              </div>

              <div style={{ flex: 1, marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#475569",
                    marginBottom: "12px",
                  }}
                >
                  Included Features:
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {p.features.map((feat, idx) => (
                    <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#334155" }}>
                      <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedPlanId(p.id);
                  handleCheckout(p.id);
                }}
                disabled={upgrading}
                className={p.code === "PROFESSIONAL" ? "btn btn-primary" : "btn btn-secondary"}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {upgrading && selectedPlanId === p.id ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    <span>Processing Order...</span>
                  </>
                ) : isCurrent && isActive ? (
                  <>
                    <span>Current Active Plan (Renew)</span>
                    <ArrowRight size={15} />
                  </>
                ) : (
                  <>
                    <span>Choose {p.name}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── Security & Compliance Note ─── */}
      <div
        className="office-card"
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <ShieldCheck size={24} color="#1e3a8a" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: "13px", color: "#475569" }}>
          <strong>Enterprise Grade Security & Compliance:</strong> All payments are processed through Razorpay with
          256-bit SSL encryption. We adhere to the Indian Digital Personal Data Protection (DPDP) Act. All historical
          academic student records are stored with high-durability PostgreSQL backups.
        </div>
      </div>
    </div>
  );
}
