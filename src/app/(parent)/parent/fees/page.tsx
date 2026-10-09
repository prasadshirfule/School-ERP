"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Receipt, CreditCard, Sparkles, CheckCircle2, Clock, Download, ShieldCheck, X } from "lucide-react";
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
    setLoading(true);
    fetch(`/api/parent/students/${studentId}/invoices`)
      .then((r) => r.json())
      .then((data) => {
        setInvoices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/parent/students")
      .then((r) => r.json())
      .then((data: Student[]) => {
        if (Array.isArray(data)) {
          setStudents(data);
          if (!selectedStudentId && data.length > 0) {
            setSelectedStudentId(data[0].id);
          }
        }
      });
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setLoading(false);
      return;
    }
    fetchInvoices(selectedStudentId);
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

  const handleProcessPayment = async () => {
    if (!payingInvoice || payAmount <= 0) return;
    setIsProcessing(true);

    try {
      // 1. Create Razorpay order
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

      // 2. Simulate Razorpay payment gateway response (or handle live callback)
      const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const mockSignature = `mock_sig_${mockPaymentId}`;

      // 3. Verify Payment and execute atomic invoice update
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

      addToast("success", `Payment of ₹${payAmount.toLocaleString("en-IN")} successful!`);
      setPayingInvoice(null);
      if (selectedStudentId) {
        fetchInvoices(selectedStudentId);
      }
    } catch (err: any) {
      addToast("error", err.message || "Payment transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees & Payment History</h1>
          <p className="page-subtitle">Track outstanding balances, payment terms, and official fee receipts.</p>
        </div>
      </div>

      {students.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={`btn ${selectedStudentId === s.id ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.9rem" }}
            >
              {s.fullName} ({s.section ? `${s.section.class.name}-${s.section.name}` : "Enrolled"})
            </button>
          ))}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-coral">
            <Receipt size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span className="stat-label">Total Outstanding Balance</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-teal">
            <CreditCard size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span className="stat-label">Total Paid to Date</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-sky">
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{invoices.length}</span>
            <span className="stat-label">Total Invoices Issued</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <Sparkles size={18} className="animate-spin" /> Loading fee statements...
        </div>
      ) : invoices.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon-wrap">
              <CheckCircle2 size={26} color="#34d399" />
            </div>
            <div className="empty-state-title">No Fee Invoices Found</div>
            <p className="empty-state-text">
              All fee invoices are up to date or none have been assigned to {selectedStudent?.fullName || "your child"} yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "0" }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice Item</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Actions & Receipts</th>
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
                        <div style={{ fontWeight: 600 }}>{inv.feeStructure.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {inv.feeStructure.frequency} • Session {inv.feeStructure.academicYear}
                        </div>
                      </td>
                      <td>{new Date(inv.dueDate).toLocaleDateString("en-IN")}</td>
                      <td style={{ fontWeight: 600 }}>₹{parseFloat(inv.amountDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td style={{ color: paidForThisInv > 0 ? "#34d399" : "inherit" }}>
                        ₹{paidForThisInv.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isPaid
                              ? "badge-teal"
                              : isOverdue
                              ? "badge-rose"
                              : inv.status === "PARTIALLY_PAID"
                              ? "badge-amber"
                              : "badge-blue"
                          }`}
                        >
                          <span className="badge-dot" />
                          <span>{inv.status.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          {!isPaid && (
                            <button
                              onClick={() => initiatePayment(inv)}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                            >
                              <CreditCard size={12} />
                              <span>Pay ₹{remaining.toLocaleString("en-IN")}</span>
                            </button>
                          )}
                          {inv.payments.map((p) => (
                            <Link
                              key={p.id}
                              href={`/api/receipt?paymentId=${p.id}`}
                              target="_blank"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                              title="Download Receipt"
                            >
                              <Download size={12} />
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
        </div>
      )}

      {/* Online Payment Modal */}
      {payingInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div className="card" style={{ maxWidth: "460px", width: "100%", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={20} color="#6366f1" />
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Secure Fee Payment</h2>
              </div>
              <button
                onClick={() => setPayingInvoice(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "var(--bg-surface-elevated, #181c2a)", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Fee Head</div>
              <div style={{ fontWeight: 600, fontSize: "1rem" }}>{payingInvoice.feeStructure.name}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Student: {selectedStudent?.fullName} ({selectedStudent?.admissionNo})
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="label">Payment Amount (₹)</label>
              <input
                type="number"
                className="input"
                value={payAmount}
                onChange={(e) => setPayAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                min={1}
                max={parseFloat(payingInvoice.amountDue)}
              />
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "20px" }}>
              🔒 256-bit Encrypted Transaction powered by Razorpay. Supports UPI, NetBanking, Debit/Credit Cards.
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPayingInvoice(null)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleProcessPayment}
                disabled={isProcessing || payAmount <= 0}
              >
                {isProcessing ? (
                  <>
                    <Sparkles size={14} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={14} /> Pay ₹{payAmount.toLocaleString("en-IN")}
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
    <Suspense fallback={<div className="loading"><Sparkles size={18} className="animate-spin" /> Loading fees...</div>}>
      <FeesContent />
    </Suspense>
  );
}
