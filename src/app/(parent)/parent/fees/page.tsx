"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Receipt,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface Invoice {
  id: string;
  studentId: string;
  amountDue: string;
  discountAmount: string;
  dueDate: string;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "WAIVED";
  createdAt: string;
  feeStructure: {
    name: string;
    amount: string;
    frequency: string;
    academicYear: string;
  };
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    receiptNumber: string;
    paidAt: string;
  }>;
}

interface Student {
  id: string;
  fullName: string;
  admissionNo: string;
  section?: { name: string; class: { name: string } };
}

function FeesContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";
  const { addToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal state
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchInvoices = (studentId: string) => {
    fetch(`/api/parent/students/${studentId}/invoices`)
      .then((r) => r.json())
      .then((data) => {
        setInvoices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data: Student[]) => {
        if (!ignore && Array.isArray(data)) {
          setStudents(data);
          if (!selectedStudentId && data.length > 0) {
            setSelectedStudentId(data[0].id);
          }
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }
    let ignore = false;
    fetch(`/api/parent/students/${selectedStudentId}/invoices`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) {
          setInvoices(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Financial summary
  const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.amountDue), 0);
  const totalPaid = invoices.reduce(
    (sum, inv) =>
      sum + inv.payments.reduce((pSum, p) => pSum + parseFloat(p.amount), 0),
    0
  );
  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

  const initiatePayment = (inv: Invoice) => {
    const paidForThisInv = inv.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const balance = Math.max(0, parseFloat(inv.amountDue) - paidForThisInv);
    setPayingInvoice(inv);
    setPayAmount(balance);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const win = window as unknown as { Razorpay?: unknown };
      if (typeof window !== "undefined" && win.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProcessPayment = async () => {
    if (!payingInvoice || payAmount <= 0) return;
    setIsProcessing(true);

    try {
      // 1. Create Razorpay order on server
      const orderRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: payingInvoice.id,
          amount: payAmount,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      // Sandbox fallback if server has mock mode
      if (orderData.isMock) {
        const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const mockSignature = `mock_sig_${mockPaymentId}`;

        const verifyRes = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderData.orderId,
            paymentId: mockPaymentId,
            signature: mockSignature,
            invoiceId: payingInvoice.id,
            amount: payAmount,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || "Payment verification failed");
        }

        addToast("info", "Development Mode: Sandbox payment recorded successfully.");
        setPayingInvoice(null);
        if (selectedStudentId) {
          fetchInvoices(selectedStudentId);
        }
        setIsProcessing(false);
        return;
      }

      // 2. Load official Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay payment gateway. Please check your internet connection.");
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "School ERP",
        description: `Fee Payment - ${payingInvoice.feeStructure.name}`,
        order_id: orderData.orderId,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setIsProcessing(true);
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                invoiceId: payingInvoice.id,
                amount: payAmount,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment signature verification failed");
            }

            addToast("success", `Payment of ₹${payAmount.toLocaleString("en-IN")} successful!`);
            setPayingInvoice(null);
            if (selectedStudentId) {
              fetchInvoices(selectedStudentId);
            }
          } catch (verifyErr: unknown) {
            addToast("error", verifyErr instanceof Error ? verifyErr.message : "Payment verification failed");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: selectedStudent?.fullName || "",
        },
        theme: {
          color: "#1e3a8a",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      type RazorpayConstructor = new (opts: unknown) => {
        open: () => void;
        on: (event: string, handler: (res: { error?: { description?: string } }) => void) => void;
      };
      const RazorpayClass = (window as unknown as { Razorpay: RazorpayConstructor }).Razorpay;
      const rzp = new RazorpayClass(options);
      rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
        setIsProcessing(false);
        addToast("error", response.error?.description || "Payment failed");
      });
      rzp.open();
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Payment transaction failed");
      setIsProcessing(false);
    }
  };

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">School Fees & Payment History</h1>
          <p className="office-subtitle">
            View pending tuition fee schedules, make secure online payments, and download official receipts
          </p>
        </div>
      </div>

      {/* Child Switcher Tabs */}
      {students.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`office-btn office-btn-sm ${selectedStudentId === s.id ? "office-btn-primary" : "office-btn-secondary"}`}
            >
              <span>{s.fullName}</span>
              <span style={{ fontSize: "11px", opacity: 0.8 }}>
                ({s.section ? `${s.section.class.name}-${s.section.name}` : "Enrolled"})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Financial Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#fffbeb",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Outstanding Due</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#d97706" }}>
              ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CreditCard size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Paid to Date</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>
              ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Invoices Issued</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a8a" }}>
              {invoices.length}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="office-card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={22} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading fee invoices...</div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="office-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <CheckCircle2 size={36} color="#059669" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>All Fees Cleared</div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
            No pending fee invoices found for {selectedStudent?.fullName || "your child"}.
          </p>
        </div>
      ) : (
        <div className="office-table-wrapper">
          <table className="office-table">
            <thead>
              <tr>
                <th>Invoice Particulars</th>
                <th>Due Date</th>
                <th style={{ textAlign: "right" }}>Total Fee</th>
                <th style={{ textAlign: "right" }}>Paid</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions & Receipts</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const paidForThisInv = inv.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
                const isPaid = inv.status === "PAID";
                const isOverdue = inv.status === "OVERDUE";
                const remaining = Math.max(0, parseFloat(inv.amountDue) - paidForThisInv);

                return (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{inv.feeStructure.name}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {inv.feeStructure.frequency} • Session {inv.feeStructure.academicYear}
                      </div>
                    </td>
                    <td style={{ color: "#475569", fontSize: "13px" }}>
                      {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                      ₹{parseFloat(inv.amountDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: paidForThisInv > 0 ? "#059669" : "#64748b" }}>
                      ₹{paidForThisInv.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {isPaid ? (
                        <span className="office-pill office-pill-green">Paid</span>
                      ) : isOverdue ? (
                        <span className="office-pill office-pill-red">Overdue</span>
                      ) : inv.status === "PARTIALLY_PAID" ? (
                        <span className="office-pill office-pill-amber">Partial</span>
                      ) : (
                        <span className="office-pill office-pill-gray">Unpaid</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {!isPaid && (
                          <button
                            onClick={() => initiatePayment(inv)}
                            className="office-btn office-btn-primary office-btn-sm"
                          >
                            <CreditCard size={13} />
                            <span>Pay ₹{remaining.toLocaleString("en-IN")}</span>
                          </button>
                        )}
                        {inv.payments.map((p) => (
                          <Link
                            key={p.id}
                            href={`/api/receipt?paymentId=${p.id}`}
                            target="_blank"
                            className="office-btn office-btn-secondary office-btn-sm"
                            title="Download Official Payment Receipt"
                          >
                            <Printer size={12} />
                            <span>{p.receiptNumber}</span>
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Online Payment Modal */}
      {payingInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setPayingInvoice(null)}
        >
          <div
            className="office-card"
            style={{ maxWidth: "460px", width: "100%", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="office-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={20} color="#1e3a8a" />
                <h3 className="office-card-title">Secure Fee Payment</h3>
              </div>
              <button
                onClick={() => setPayingInvoice(null)}
                className="office-btn office-btn-secondary office-btn-sm"
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Fee Particulars</div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
                {payingInvoice.feeStructure.name}
              </div>
              <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "2px" }}>
                Student: {selectedStudent?.fullName} ({selectedStudent?.admissionNo})
              </div>
            </div>

            <div className="office-form-group">
              <label className="office-form-label">Amount to Pay Now (₹)</label>
              <input
                type="number"
                className="office-input"
                style={{ width: "100%", fontWeight: 700, fontSize: "16px" }}
                value={payAmount}
                onChange={(e) => setPayAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                min={1}
                max={parseFloat(payingInvoice.amountDue)}
              />
            </div>

            <div style={{ fontSize: "12px", color: "#64748b", margin: "14px 0 20px 0", lineHeight: 1.5 }}>
              🔒 256-bit Encrypted Transaction powered by Razorpay. Supports UPI, NetBanking, and Debit/Credit Cards.
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="office-btn office-btn-secondary"
                onClick={() => setPayingInvoice(null)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="office-btn office-btn-primary"
                onClick={handleProcessPayment}
                disabled={isProcessing || payAmount <= 0}
              >
                {isProcessing ? (
                  <>
                    <Sparkles size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    <span>Pay ₹{payAmount.toLocaleString("en-IN")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentFeesPage() {
  return (
    <Suspense
      fallback={
        <div className="office-page-container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Sparkles size={20} className="animate-spin" color="#1e3a8a" style={{ margin: "0 auto 8px" }} />
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading fees...</div>
        </div>
      }
    >
      <FeesContent />
    </Suspense>
  );
}
