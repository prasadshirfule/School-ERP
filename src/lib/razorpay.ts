import crypto from "crypto";

export interface CreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  keyId: string;
  isMock?: boolean;
}

export const razorpayService = {
  getKeyId(): string {
    return process.env.RAZORPAY_KEY_ID || "rzp_test_school_erp_demo";
  },

  getKeySecret(): string {
    return process.env.RAZORPAY_KEY_SECRET || "rzp_secret_demo_key_12345";
  },

  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    const currency = params.currency || "INR";
    const isProd = process.env.NODE_ENV === "production";

    // If live API credentials are provided and not default demo strings, attempt live Razorpay REST API call
    if (
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      !process.env.RAZORPAY_KEY_ID.includes("demo")
    ) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const res = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: params.amountInPaise,
            currency,
            receipt: params.receipt,
            notes: params.notes,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            id: data.id,
            amount: data.amount,
            currency: data.currency,
            receipt: data.receipt,
            status: data.status,
            keyId,
          };
        } else {
          const errBody = await res.text().catch(() => "");
          console.error("Razorpay order creation returned non-OK status:", res.status, errBody);
          if (isProd) {
            throw new Error(`Razorpay order creation failed with status ${res.status}`);
          }
        }
      } catch (err) {
        console.error("Razorpay live API call failed:", err);
        if (isProd) {
          throw new Error("Payment gateway is temporarily unavailable in production. Please try again later.");
        }
      }
    } else if (isProd) {
      throw new Error("Razorpay credentials are not configured for production payments.");
    }

    // Mock / sandbox fallback order generation for non-production development & offline testing only
    const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: mockOrderId,
      amount: params.amountInPaise,
      currency,
      receipt: params.receipt,
      status: "created",
      keyId,
      isMock: true,
    };
  },

  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const isProd = process.env.NODE_ENV === "production";

    // In production, mock signatures are strictly forbidden
    if (params.signature.startsWith("mock_sig_") || params.orderId.startsWith("order_")) {
      if (isProd) {
        return false;
      }
      // Allowed in development / test environments only
      if (params.signature === `mock_sig_${params.paymentId}`) {
        return true;
      }
    }

    const keySecret = this.getKeySecret();
    if (!keySecret || keySecret.includes("demo_key")) {
      if (isProd) {
        return false;
      }
    }

    try {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${params.orderId}|${params.paymentId}`)
        .digest("hex");

      return generatedSignature === params.signature;
    } catch {
      return false;
    }
  },
};
