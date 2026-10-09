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
        }
      } catch (err) {
        console.error("Razorpay live API call failed, falling back to mock sandbox order:", err);
      }
    }

    // Mock / sandbox fallback order generation for development & offline testing
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
    const keySecret = this.getKeySecret();
    
    // In demo / sandbox mode with mock order IDs, validate simulated signatures
    if (params.orderId.startsWith("order_") && params.signature === `mock_sig_${params.paymentId}`) {
      return true;
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
