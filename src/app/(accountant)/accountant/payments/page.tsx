"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  Search,
  Receipt,
} from "lucide-react";
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
  const [lastPaymentReceiptId, setLastPaymentReceiptId] = useState<string | null>(null);

  // Search & Form
  const [studentSearch, setStudentSearch] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [receiptNumber, setReceiptNumber] = useState(
    () => `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [submitting, setSubmitting] = useState(false);

  // Ledger search
  const [ledgerSearch, setLedgerSearch] = useState("");

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        setInvoices(await res.json());
      }
    } catch (err) {
      console.error("Failed to load invoices", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/invoices");
        if (res.ok && !ignore) {
          setInvoices(await res.json());
        }
      } catch (err) {
        console.error("Failed to load invoices", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const unpaidInvoices = useMemo(() => {
    return invoices.filter((i) => i.status !== "PAID" && i.status !== "WAIVED");
  }, [invoices]);

  // Filter invoices by student search
  const filteredUnpaidInvoices = useMemo(() => {
    if (!studentSearch.trim()) return unpaidInvoices;
    const q = studentSearch.toLowerCase().trim();
    return unpaidInvoices.filter(
      (inv) =>
        inv.student.fullName.toLowerCase().includes(q) ||
        inv.student.admissionNo.toLowerCase().includes(q) ||
        inv.feeStructure.name.toLowerCase().includes(q)
    );
  }, [unpaidInvoices, studentSearch]);

  const selectedInvoice = invoices.find((i) => i.id === invoiceId);
  const totalPaid = selectedInvoice
    ? selectedInvoice.payments.reduce((s, p) => s + parseFloat(p.amount), 0)
    : 0;
  const effectiveDue = selectedInvoice ? parseFloat(selectedInvoice.amountDue) : 0;
  const remaining = Math.max(0, effectiveDue - totalPaid);

  const handleSelectInvoice = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      const paid = inv.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
      const rem = Math.max(0, parseFloat(inv.amountDue) - paid);
      setAmount(rem > 0 ? rem.toString() : "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, amount, method, receiptNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to record payment");
        setSubmitting(false);
        return;
      }

      setSuccess(`Payment of ₹${parseFloat(amount).toLocaleString()} recorded successfully for ${selectedInvoice?.student.fullName}!`);
      if (data.payment?.id) {
        setLastPaymentReceiptId(data.payment.id);
      }
      setAmount("");
      setInvoiceId("");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setReceiptNumber(`REC-${new Date().getFullYear()}-${randomSuffix}`);
      fetchInvoices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const allPayments = useMemo(() => {
    return invoices.flatMap((inv) =>
      inv.payments.map((p) => ({
        ...p,
        studentName: inv.student.fullName,
        admissionNo: inv.student.admissionNo,
        feeName: inv.feeStructure.name,
      }))
    );
  }, [invoices]);

  const filteredPayments = useMemo(() => {
    if (!ledgerSearch.trim()) return allPayments;
    const q = ledgerSearch.toLowerCase().trim();
    return allPayments.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q) ||
        p.feeName.toLowerCase().includes(q)
    );
  }, [allPayments, ledgerSearch]);

  if (loading) {
    return (
      <div className="office-page-container" style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "15px" }}>
          <Sparkles size={20} className="animate-spin" color="#1e3a8a" />
          <span>Loading fee records and payments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Page Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Fee Collection & Receipts Desk</h1>
          <p className="office-subtitle">
            Search student fee dues, accept cash or digital payments, and print official fee vouchers
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "8px",
            padding: "12px 16px",
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

      {success && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: 600 }}>
            <CheckCircle2 size={20} color="#059669" />
            <span>{success}</span>
          </div>
          {lastPaymentReceiptId && (
            <a
              href={`/api/receipt/${lastPaymentReceiptId}`}
              target="_blank"
              rel="noreferrer"
              className="office-btn office-btn-success office-btn-sm"
              style={{ textDecoration: "none" }}
            >
              <Printer size={14} />
              <span>Print Payment Receipt Now</span>
            </a>
          )}
        </div>
      )}

      {/* ─── Payment Collection Box ─── */}
      <div className="office-card" style={{ border: "2px solid #bfdbfe", background: "#ffffff" }}>
        <div className="office-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#eff6ff",
                color: "#1e3a8a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="office-card-title">Collect Student Fee</h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                Step 1: Search student &rarr; Step 2: Select invoice &rarr; Step 3: Record payment
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Search Student / Invoice */}
          <div style={{ marginBottom: "18px" }}>
            <label className="office-form-label">
              Find Student / Pending Fee Invoice
            </label>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div className="office-search-wrapper" style={{ flex: 1, minWidth: "260px" }}>
                <Search size={16} className="office-search-icon" />
                <input
                  type="text"
                  placeholder="Type student name or admission number to filter..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="office-input office-search-input"
                  style={{ width: "100%" }}
                />
              </div>

              <select
                className="office-select"
                value={invoiceId}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                style={{ flex: 2, minWidth: "280px" }}
                required
              >
                <option value="">-- Choose outstanding invoice ({filteredUnpaidInvoices.length} available) --</option>
                {filteredUnpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.student.fullName} ({inv.student.admissionNo}) — {inv.feeStructure.name} — Due: ₹{inv.amountDue}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Invoice Details Pill */}
          {selectedInvoice && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  {selectedInvoice.student.fullName}{" "}
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                    ({selectedInvoice.student.admissionNo})
                  </span>
                </div>
                <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "2px" }}>
                  Fee Head: <strong>{selectedInvoice.feeStructure.name}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Total Payable</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>₹{effectiveDue.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Already Paid</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#059669" }}>₹{totalPaid.toLocaleString()}</div>
                </div>
                <div
                  style={{
                    background: "#fffbeb",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: "1px solid #fde68a",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#92400e", textTransform: "uppercase", fontWeight: 600 }}>
                    Balance Due
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#b45309" }}>
                    ₹{remaining.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Inputs */}
          <div className="office-form-grid-3">
            <div className="office-form-group">
              <label className="office-form-label">
                Amount Being Paid Now (₹) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="office-input"
                style={{ width: "100%", fontWeight: 700, fontSize: "15px" }}
                required
              />
            </div>

            <div className="office-form-group">
              <label className="office-form-label">
                Payment Channel <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                className="office-select"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="CASH">Cash Counter</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div className="office-form-group">
              <label className="office-form-label">
                Receipt Voucher Number <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. REC-2026-001"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="office-input"
                style={{ width: "100%", fontFamily: "monospace" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              type="submit"
              disabled={submitting || !invoiceId}
              className="office-btn office-btn-primary"
              style={{ minWidth: "220px", height: "44px" }}
            >
              {submitting ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  <span>Recording Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm Payment & Issue Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Payment Transactions & Receipts Ledger ─── */}
      <div className="office-card">
        <div className="office-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Receipt size={18} color="#1e3a8a" />
            <h3 className="office-card-title">Recent Fee Receipts Ledger ({allPayments.length})</h3>
          </div>
          <div className="office-search-wrapper" style={{ minWidth: "240px" }}>
            <Search size={15} className="office-search-icon" />
            <input
              type="text"
              placeholder="Search receipt # or student..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="office-input office-search-input"
              style={{ height: "34px", fontSize: "12.5px" }}
            />
          </div>
        </div>

        <div className="office-table-wrapper">
          <table className="office-table">
            <thead>
              <tr>
                <th style={{ width: "150px" }}>Receipt #</th>
                <th>Student Name</th>
                <th>Fee Head</th>
                <th style={{ textAlign: "right" }}>Amount Collected</th>
                <th>Payment Mode</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px 20px", textAlign: "center", color: "#64748b" }}>
                    No receipt transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "#1e3a8a" }}>
                      {p.receiptNumber}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{p.studentName}</span>
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "6px" }}>
                        ({p.admissionNo})
                      </span>
                    </td>
                    <td style={{ color: "#475569" }}>{p.feeName}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>
                      ₹{parseFloat(p.amount).toLocaleString()}
                    </td>
                    <td>
                      <span className="office-pill office-pill-blue">
                        {p.method}
                      </span>
                    </td>
                    <td style={{ color: "#64748b", fontSize: "13px" }}>
                      {formatDate(p.paidAt)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <a
                        href={`/api/receipt/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="office-btn office-btn-secondary office-btn-sm"
                      >
                        <Printer size={13} />
                        <span>Print</span>
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
