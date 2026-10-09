"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Receipt, CreditCard, Sparkles, AlertCircle, CheckCircle2, Clock, Download, ArrowRight } from "lucide-react";
import Link from "next/link";

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

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    fetch(`/api/parent/students/${selectedStudentId}/invoices`)
      .then((r) => r.json())
      .then((data) => {
        setInvoices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
                  <th>Receipts</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const paidForThisInv = inv.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
                  const isPaid = inv.status === "PAID";
                  const isOverdue = inv.status === "OVERDUE";

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
                        {inv.payments.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {inv.payments.map((p) => (
                              <Link
                                key={p.id}
                                href={`/api/receipt?paymentId=${p.id}`}
                                target="_blank"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                              >
                                <Download size={12} />
                                <span>{p.receiptNumber}</span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

