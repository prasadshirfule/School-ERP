import PublicFooter from "@/components/public-footer";

export default function RefundPage() {
  return (
    <>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", color: "#334155", lineHeight: "1.7", fontSize: "15px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Refund &amp; Cancellation Policy</h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>Last updated: November 2026</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>1. Free 30-Day Trial</h2>
        <p>Every newly approved school receives a <strong>complimentary 30-day trial</strong> of the Professional plan at no cost. No credit card or payment information is required to start the trial. If you do not upgrade before the trial ends, your portal will automatically transition to read-only mode — no charges are incurred.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>2. Cancellation During Trial</h2>
        <p>You may cancel your account at any time during the free trial period without any charges, obligations, or questions asked. Simply contact our support team and your school tenant will be deactivated.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>3. Paid Subscription Refunds</h2>
        <p><strong>Annual Plans:</strong> If you cancel within the first 30 days after payment, you are eligible for a pro-rata refund for the unused portion of your subscription period. Refund requests submitted after 30 days from the payment date are not eligible for monetary refund, but your access will continue until the end of the paid period.</p>
        <p><strong>Monthly Plans:</strong> Monthly subscriptions are non-refundable. You may cancel at any time and your access will continue until the end of the current billing month.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>4. How to Request a Refund</h2>
        <p>To request a refund, send an email to <strong>billing@schoolerp.cloud</strong> with:</p>
        <ul>
          <li>Your registered school name and administrator email</li>
          <li>Razorpay payment reference or receipt number</li>
          <li>Reason for cancellation</li>
        </ul>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>5. Processing Time</h2>
        <p>Approved refunds are processed within <strong>5–7 business days</strong> and credited to the original payment method used during checkout.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>6. Data After Cancellation</h2>
        <p>Upon cancellation, you have <strong>30 days to export all institutional data</strong> (students, attendance, fees) via the built-in export tools. After 30 days, the school tenant and all associated data will be permanently deleted from our servers.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>7. Contact</h2>
        <p>For billing and refund inquiries, contact <strong>billing@schoolerp.cloud</strong> or call <strong>+91-80-XXXX-XXXX</strong> (Mon–Sat, 9 AM – 6 PM IST).</p>
      </div>
      <PublicFooter />
    </>
  );
}
