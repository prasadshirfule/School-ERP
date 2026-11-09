import PublicFooter from "@/components/public-footer";

export default function TermsPage() {
  return (
    <>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", color: "#334155", lineHeight: "1.7", fontSize: "15px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Terms of Service</h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>Last updated: November 2026</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>1. Introduction</h2>
        <p>These Terms of Service (&quot;Terms&quot;) govern your access to and use of the School ERP Cloud platform (&quot;Service&quot;), a multi-tenant Software-as-a-Service application designed for K-12 educational institutions in India. By registering a school account, you agree to comply with these Terms.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>2. Definitions</h2>
        <p><strong>&quot;School&quot;</strong> refers to the educational institution registering on the platform.<br/>
        <strong>&quot;Administrator&quot;</strong> refers to the designated school administrative user(s).<br/>
        <strong>&quot;Parent&quot;</strong> refers to a guardian accessing the parent portal.<br/>
        <strong>&quot;Platform Owner&quot;</strong> refers to the Super Admin operating the SaaS platform.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>3. Account Registration</h2>
        <p>School registration requires verification by the Platform Owner. You agree to provide accurate, complete institution details and maintain the confidentiality of administrator credentials. Each school operates as an isolated tenant with strict data separation.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>4. Subscription &amp; Billing</h2>
        <p>Upon approval, each school receives a <strong>complimentary 30-day trial</strong> of the Professional plan. After the trial period, the portal transitions to <strong>read-only mode</strong> until a paid subscription is activated. Student-based pricing applies at published rates. All payments are processed securely via Razorpay and are subject to applicable GST (18%).</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>5. Data Ownership</h2>
        <p>Your institution retains full ownership of all student, parent, staff, academic, and financial data uploaded to the platform. You may export your data at any time via the built-in CSV/JSON export facility. We will never sell, share, or monetize your institutional data.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>6. Acceptable Use</h2>
        <p>You agree not to: (a) use the Service for unlawful purposes; (b) attempt to access another school&apos;s tenant data; (c) reverse-engineer, decompile, or disassemble the Service; (d) upload malicious files or scripts; (e) share administrator credentials with unauthorized individuals.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>7. Intellectual Property</h2>
        <p>The Service, including its source code, design, and documentation, is the intellectual property of the Platform Owner. Your subscription grants a non-exclusive, non-transferable license to use the Service for institutional purposes during the active subscription period.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>8. Limitation of Liability</h2>
        <p>To the maximum extent permitted by applicable law, the Platform Owner shall not be liable for indirect, incidental, special, or consequential damages arising from use of the Service, including but not limited to loss of data, revenue, or business interruption.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>9. Termination</h2>
        <p>Either party may terminate the subscription at any time. Upon termination, you will have 30 days to export your data before it is permanently deleted. The Platform Owner reserves the right to suspend accounts that violate these Terms or exhibit fraudulent activity.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>10. Governing Law</h2>
        <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka, India.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>11. Contact</h2>
        <p>For questions about these Terms, contact us at <strong>support@schoolerp.cloud</strong>.</p>
      </div>
      <PublicFooter />
    </>
  );
}
