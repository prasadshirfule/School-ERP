"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, AlertCircle, Sparkles, FileText } from "lucide-react";
import { formatDate } from "@/lib/formatDate";

type Invoice = {
  id: string;
  amountDue: string;
  discountAmount: string;
  status: string;
  student: { fullName: string; admissionNo: string };
  feeStructure: { name: string };
  payments: { id: string; amount: string; method: string; receiptNumber: string; paidAt: string }[];
};

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [receiptNumber, setReceiptNumber] = useState("");

  const fetchInvoices = async () => {
    const res = await fetch("/api/invoices");
    setInvoices(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const selectedInvoice = invoices.find((i) => i.id === invoiceId);
  const totalPaid = selectedInvoice
    ? selectedInvoice.payments.reduce((s, p) => s + parseFloat(p.amount), 0)
    : 0;
  const effectiveDue = selectedInvoice
    ? parseFloat(selectedInvoice.amountDue)
    : 0;
  const remaining = effectiveDue - totalPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, amount, method, receiptNumber }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to record payment");
      return;
    }

    setSuccess(`Payment recorded successfully! Receipt: ${receiptNumber}. Invoice status updated to ${data.newInvoiceStatus}.`);
    setAmount("");
    setReceiptNumber("");
    setInvoiceId("");
    fetchInvoices();
  };

  if (loading) return <div className="loading"><Sparkles size={18} className="animate-spin" /> Loading payment records...</div>;

  const unpaidInvoices = invoices.filter((i) => i.status !== "PAID" && i.status !== "WAIVED");
  const allPayments = invoices.flatMap((inv) =>
    inv.payments.map((p) => ({
      ...p,
      studentName: inv.student.fullName,
      feeName: inv.feeStructure.name,
    }))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fee Collection & Receipts</h1>
          <p className="page-subtitle">Record cash, UPI, or card collections, update invoice states, and generate receipts</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header">
          <h3 className="card-title">Collect Payment Transaction</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Target Invoice</label>
            <select className="form-select" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
              <option value="">Select outstanding fee invoice...</option>
              {unpaidInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.student.fullName} — {inv.feeStructure.name} — Due: ₹{inv.amountDue} ({inv.status.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="alert alert-info" style={{ marginBottom: "16px", fontSize: "13px" }}>
              <span>Total Payable: <strong>₹{effectiveDue.toFixed(2)}</strong></span>
              <span>&nbsp;•&nbsp; Already Paid: <strong>₹{totalPaid.toFixed(2)}</strong></span>
              <span>&nbsp;•&nbsp; Outstanding Due: <strong style={{ color: "#fb7185" }}>₹{remaining.toFixed(2)}</strong></span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Payment Amount (₹)</label>
              <input className="form-input" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Collection Channel</label>
              <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Voucher #</label>
              <input className="form-input" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="e.g. REC-2026-001" required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" style={{ marginTop: "4px" }}>
            <CreditCard size={15} />
            <span>Process & Issue Receipt</span>
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transaction & Receipt Ledger ({allPayments.length})</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "150px" }}>Receipt #</th>
                <th>Student</th>
                <th>Fee Structure</th>
                <th className="text-right">Collected Amount</th>
                <th>Method</th>
                <th>Collection Date</th>
                <th style={{ width: "110px" }}>Print Receipt</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon-wrap">
                        <CreditCard size={26} color="#fb7185" />
                      </div>
                      <div className="empty-state-title">No transactions logged yet</div>
                      <p className="empty-state-text">Record payments against open student fee invoices to build the financial ledger.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                allPayments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "12.5px", fontWeight: 600, color: "#818cf8" }}>{p.receiptNumber}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.studentName}</td>
                    <td>{p.feeName}</td>
                    <td className="num-cell">₹{p.amount}</td>
                    <td>
                      <span className="badge badge-info">
                        <span className="badge-dot" />
                        <span>{p.method}</span>
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{formatDate(p.paidAt)}</td>
                    <td>
                      <a href={`/api/receipt/${p.id}`} target="_blank" className="btn btn-sm btn-secondary" rel="noreferrer">
                        <FileText size={13} />
                        <span>Receipt</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
