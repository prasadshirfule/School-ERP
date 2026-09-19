"use client";

import { useEffect, useState } from "react";
import { Receipt, Sparkles } from "lucide-react";
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

const STATUS_BADGE: Record<string, string> = {
  UNPAID: "badge-danger",
  PARTIALLY_PAID: "badge-warning",
  PAID: "badge-success",
  OVERDUE: "badge-danger",
  WAIVED: "badge-info",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchData = async () => {
    const url = filter ? `/api/invoices?status=${filter}` : "/api/invoices";
    const res = await fetch(url);
    if (res.ok) {
      setInvoices(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  if (loading) {
    return (
      <div className="loading">
        <Sparkles size={18} className="animate-spin" /> Loading fee invoices...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Fee Invoices</h1>
          <p className="page-subtitle">
            Review student admission fee schedules, payment progress, and outstanding dues
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: "180px" }}
          >
            <option value="">All invoice statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Fee Category</th>
              <th className="text-right">Net Payable</th>
              <th className="text-right">Discount</th>
              <th style={{ whiteSpace: "nowrap" }}>Due Date</th>
              <th style={{ whiteSpace: "nowrap" }}>Payment Status</th>
              <th className="text-right">Settled Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon-wrap">
                      <Receipt size={26} color="#fbbf24" />
                    </div>
                    <div className="empty-state-title">No fee invoices found</div>
                    <p className="empty-state-text">
                      Student fee invoices are generated automatically during student admission enrollment.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {inv.student.fullName}{" "}
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      ({inv.student.admissionNo})
                    </span>
                  </td>
                  <td>{inv.feeStructure.name}</td>
                  <td className="num-cell">₹{inv.amountDue}</td>
                  <td className="num-cell" style={{ color: "var(--text-muted)" }}>
                    {inv.discountAmount !== "0.00" ? `₹${inv.discountAmount}` : "—"}
                  </td>
                  <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(inv.dueDate)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className={`badge ${STATUS_BADGE[inv.status] || "badge-info"}`} style={{ whiteSpace: "nowrap" }}>
                      <span className="badge-dot" />
                      <span>{inv.status.replace("_", " ")}</span>
                    </span>
                  </td>
                  <td className="num-cell">
                    {inv.payments.length === 0 ? (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>Pending</span>
                    ) : (
                      <span style={{ color: "#34d399" }}>
                        ₹{inv.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
