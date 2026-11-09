import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Printer,
  Search,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDecimal, formatDate } from "@/lib/utils";

type AccountantRecentPayment = Prisma.PaymentGetPayload<{
  include: {
    invoice: {
      include: {
        student: true;
        feeStructure: true;
      };
    };
  };
}>;

export default async function AccountantDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/login");
  }

  const db = tenantClient(session.user.schoolId);

  const [unpaid, partial, paid, totalPayments, recentPayments] = await Promise.all([
    db.feeInvoice.count({ where: { status: "UNPAID" } }),
    db.feeInvoice.count({ where: { status: "PARTIALLY_PAID" } }),
    db.feeInvoice.count({ where: { status: "PAID" } }),
    db.payment.count(),
    db.payment.findMany({
      take: 6,
      orderBy: { paidAt: "desc" },
      include: {
        invoice: {
          include: {
            student: true,
            feeStructure: true,
          },
        },
      },
    }),
  ]);

  const currentHour = new Date().getHours();
  let greeting = "Good Morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good Afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good Evening";
  }

  const displayName = session.user.name || session.user.email?.split("@")[0] || "Accountant";

  return (
    <div className="office-page-container">
      {/* ─── Office Welcome Hero ─── */}
      <div className="welcome-hero-simple">
        <div>
          <h1 className="welcome-hero-title">
            {greeting}, {displayName}!
          </h1>
          <p className="welcome-hero-sub">
            Fee Collection Desk & Financial Ledger • Track outstanding dues, record fees, and issue receipts
          </p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#ffffff", padding: "6px 14px", borderRadius: "9999px", border: "1px solid #bfdbfe", fontSize: "12.5px", color: "#1e3a8a", fontWeight: 600 }}>
          <Calendar size={13} />
          <span>Academic Session 2026-27</span>
        </div>
      </div>

      {/* ─── 3 Prominent Primary Action Cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <Link
          href="/accountant/payments"
          style={{
            background: "#ffffff",
            border: "2px solid #bfdbfe",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(30,58,138,0.06)",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "10px",
              background: "#1e3a8a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CreditCard size={26} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Collect Student Fee</div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
              Search student, accept cash/UPI, issue instant receipt
            </div>
          </div>
        </Link>

        <Link
          href="/accountant/invoices"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Receipt size={26} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Fee Invoices Roster</div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
              Check student billing status, discounts and due dates
            </div>
          </div>
        </Link>

        <Link
          href="/admin/reports"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Fee Collection Reports</div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
              Download daily fee registers & outstanding dues audits
            </div>
          </div>
        </Link>
      </div>

      {/* ─── 4 Essential Financial Metrics ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
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
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Unpaid Invoices</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dc2626" }}>{unpaid}</div>
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
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Partially Settled</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#d97706" }}>{partial}</div>
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
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Settled in Full</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>{paid}</div>
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
            <CreditCard size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Receipts Issued</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e3a8a" }}>{totalPayments}</div>
          </div>
        </div>
      </div>

      {/* ─── Recent Fee Collection Ledger Table ─── */}
      <div className="office-card">
        <div className="office-card-header">
          <div>
            <h3 className="office-card-title">Recent Fee Collections</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
              Real-time payment audit log across all students
            </p>
          </div>
          <Link
            href="/accountant/payments"
            className="office-btn office-btn-secondary office-btn-sm"
          >
            <span>View All Receipts</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="office-table-wrapper">
          <table className="office-table">
            <thead>
              <tr>
                <th style={{ width: "140px" }}>Receipt #</th>
                <th>Student Name</th>
                <th>Fee Particulars</th>
                <th>Payment Mode</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Amount Collected</th>
                <th style={{ textAlign: "right" }}>Voucher</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px 20px", textAlign: "center", color: "#64748b" }}>
                    No fee payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                (recentPayments as AccountantRecentPayment[]).map((p: AccountantRecentPayment) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "#1e3a8a" }}>
                      {p.receiptNumber}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{p.invoice.student.fullName}</span>
                      <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "6px" }}>
                        ({p.invoice.student.admissionNo})
                      </span>
                    </td>
                    <td style={{ color: "#475569" }}>{p.invoice.feeStructure.name}</td>
                    <td>
                      <span className="office-pill office-pill-blue">
                        {p.method}
                      </span>
                    </td>
                    <td style={{ color: "#64748b", fontSize: "13px" }}>
                      {formatDate(p.paidAt)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>
                      ₹{formatDecimal(p.amount)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <a
                        href={`/api/receipt/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="office-btn office-btn-secondary office-btn-sm"
                      >
                        <Printer size={13} />
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
