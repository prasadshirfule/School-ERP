import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/utils";
import { tenantClient } from "@/lib/tenant";
import { formatDate } from "@/lib/formatDate";

/**
 * PDF Receipt Generator
 * 
 * @react-pdf/renderer is installed on-demand in this feature.
 * Returns a simple HTML receipt as a downloadable page for now.
 * When @react-pdf/renderer is installed, this will generate a proper PDF.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const db = tenantClient(session.user.schoolId);

  const payment = await db.payment.findFirst({
    where: { id },
    include: {
      invoice: {
        include: {
          student: true,
          feeStructure: true,
        },
      },
      school: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Generate HTML receipt (works without @react-pdf/renderer)
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${payment.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #f5f5f5; padding: 40px; }
    .receipt { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px dashed #e5e5e5; }
    .school-name { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .receipt-title { font-size: 14px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .receipt-number { font-size: 18px; font-weight: 600; color: #6366f1; margin-top: 8px; }
    .details { margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .row:last-child { border-bottom: none; }
    .label { color: #666; font-size: 14px; }
    .value { font-weight: 600; color: #1a1a2e; font-size: 14px; }
    .amount-row { background: #f8f9ff; padding: 16px; border-radius: 8px; margin-top: 24px; }
    .amount-row .label { font-size: 16px; }
    .amount-row .value { font-size: 24px; color: #6366f1; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 2px dashed #e5e5e5; color: #999; font-size: 12px; }
    @media print { body { padding: 0; background: white; } .receipt { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="school-name">${payment.school.name}</div>
      <div class="receipt-title">Payment Receipt</div>
      <div class="receipt-number">${payment.receiptNumber}</div>
    </div>
    <div class="details">
      <div class="row">
        <span class="label">Student Name</span>
        <span class="value">${payment.invoice.student.fullName}</span>
      </div>
      <div class="row">
        <span class="label">Admission No.</span>
        <span class="value">${payment.invoice.student.admissionNo}</span>
      </div>
      <div class="row">
        <span class="label">Fee Type</span>
        <span class="value">${payment.invoice.feeStructure.name}</span>
      </div>
      <div class="row">
        <span class="label">Payment Method</span>
        <span class="value">${payment.method}</span>
      </div>
      <div class="row">
        <span class="label">Payment Date</span>
        <span class="value">${formatDate(payment.paidAt)}</span>
      </div>
      <div class="row amount-row">
        <span class="label">Amount Paid</span>
        <span class="value">₹${payment.amount.toFixed(2)}</span>
      </div>
    </div>
    <div class="footer">
      <p>This is a computer-generated receipt.</p>
      <p>${payment.school.name} • ${payment.school.address || ""}</p>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
