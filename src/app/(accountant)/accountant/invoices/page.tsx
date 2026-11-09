"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Receipt, Sparkles, Search, CreditCard, CheckCircle2, Clock } from "lucide-react";
import { formatDate } from "@/lib/formatDate";

type Invoice = {
  id: string;
  amountDue: string;
  discountAmount: string;
  dueDate: string;
  status: string;
  student: { fullName: string; admissionNo: string };
  feeStructure: { name: string; amount: string };
  payments: { id: string; amount: string; method: string; receiptNumber: string; paidAt: string }[];
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadInvoices() {
      const url = filter ? `/api/invoices?status=${filter}` : "/api/invoices";
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setInvoices(data);
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadInvoices();
    return () => {
      ignore = true;
    };
  }, [filter]);

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter(
      (inv) =>
        inv.student.fullName.toLowerCase().includes(q) ||
        inv.student.admissionNo.toLowerCase().includes(q) ||
        inv.feeStructure.name.toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  // Financial calculations
  const totalInvoiced = useMemo(
    () => invoices.reduce((sum, inv) => sum + parseFloat(inv.amountDue || "0"), 0),
    [invoices]
  );
  const totalCollected = useMemo(
    () =>
      invoices.reduce(
        (sum, inv) => sum + inv.payments.reduce((pSum, p) => pSum + parseFloat(p.amount || "0"), 0),
        0
      ),
    [invoices]
  );
  const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

  if (loading) {
    return (
      <div className="office-page-container" style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "15px" }}>
          <Sparkles size={20} className="animate-spin" color="#1e3a8a" />
          <span>Loading student fee invoices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="office-page-container">
      {/* ─── Header ─── */}
      <div className="office-header">
        <div>
          <h1 className="office-title">Student Fee Invoices</h1>
          <p className="office-subtitle">
            Review student billing schedules, payment progress, and track outstanding balances
          </p>
        </div>
        <div className="office-actions-bar">
          <Link href="/accountant/payments" className="office-btn office-btn-primary">
            <CreditCard size={16} />
            <span>Collect Fee Payment</span>
          </Link>
        </div>
      </div>

      {/* ─── Financial Highlights ─── */}
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
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Invoiced</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
              ₹{totalInvoiced.toLocaleString()}
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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Collected</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>
              ₹{totalCollected.toLocaleString()}
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
              background: "#fffbeb",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Outstanding Balance</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#d97706" }}>
              ₹{totalOutstanding.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Status Filter Bar ─── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: 1 }}>
          <div className="office-search-wrapper" style={{ flex: 1, minWidth: "240px", maxWidth: "380px" }}>
            <Search size={16} className="office-search-icon" />
            <input
              type="text"
              placeholder="Search student or fee category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="office-input office-search-input"
              style={{ width: "100%" }}
            />
          </div>

          <select
            className="office-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ minWidth: "180px" }}
          >
            <option value="">All Invoice Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>

        <div style={{ fontSize: "13px", color: "#64748b" }}>
          Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} invoices
        </div>
      </div>

      {/* ─── Invoices Table ─── */}
      <div className="office-table-wrapper">
        <table className="office-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Fee Category</th>
              <th style={{ textAlign: "right" }}>Net Payable</th>
              <th style={{ textAlign: "right" }}>Discount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Paid So Far</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
                  <Receipt size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>No fee invoices found</div>
                  <p style={{ fontSize: "13px", margin: "4px 0 0" }}>
                    Student invoices are automatically generated when registering new admissions.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const paid = inv.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                const isPaid = inv.status === "PAID";
                const isPartial = inv.status === "PARTIALLY_PAID";
                const isOverdue = inv.status === "OVERDUE";

                return (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{inv.student.fullName}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>
                        {inv.student.admissionNo}
                      </div>
                    </td>
                    <td style={{ color: "#334155" }}>{inv.feeStructure.name}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                      ₹{parseFloat(inv.amountDue).toLocaleString()}
                    </td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>
                      {inv.discountAmount !== "0.00" ? `₹${inv.discountAmount}` : "—"}
                    </td>
                    <td style={{ color: "#475569", fontSize: "13px" }}>{formatDate(inv.dueDate)}</td>
                    <td>
                      {isPaid ? (
                        <span className="office-pill office-pill-green">Paid</span>
                      ) : isPartial ? (
                        <span className="office-pill office-pill-amber">Partial</span>
                      ) : isOverdue ? (
                        <span className="office-pill office-pill-red">Overdue</span>
                      ) : (
                        <span className="office-pill office-pill-gray">Unpaid</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: paid > 0 ? "#059669" : "#94a3b8" }}>
                      {paid > 0 ? `₹${paid.toLocaleString()}` : "₹0"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!isPaid && (
                        <Link
                          href="/accountant/payments"
                          className="office-btn office-btn-secondary office-btn-sm"
                        >
                          <CreditCard size={13} />
                          <span>Collect</span>
                        </Link>
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
  );
}
