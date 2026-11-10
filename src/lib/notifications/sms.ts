export interface SmsMessage {
  to: string; // Indian E.164 or 10-digit format: e.g. +919876543210
  message: string;
  templateId?: string; // Indian DLT registered template ID
}

export interface SmsDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  unconfigured?: boolean;
  timestamp: Date;
}

export interface SmsProvider {
  sendSms(message: SmsMessage): Promise<SmsDeliveryResult>;
}

export const devSmsOutbox: SmsMessage[] = [];

export class LocalDevSmsProvider implements SmsProvider {
  async sendSms(message: SmsMessage): Promise<SmsDeliveryResult> {
    devSmsOutbox.push(message);
    const maskedPhone = message.to.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[DevSMS] Dispatched to ${maskedPhone} (DLT: ${message.templateId || "DEV"}): "${message.message.substring(0, 30)}..."`
      );
    }
    return {
      success: true,
      messageId: `dev-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
    };
  }
}

/**
 * Production Indian DLT SMS Gateway Adapter.
 * Validates credentials strictly. If SMS_GATEWAY_URL or SMS_API_KEY is not set,
 * returns explicit delivery failure and never reports false success.
 */
export class HttpSmsProvider implements SmsProvider {
  private gatewayUrl?: string;
  private apiKey?: string;
  private senderId?: string;

  constructor() {
    this.gatewayUrl = process.env.SMS_GATEWAY_URL;
    this.apiKey = process.env.SMS_API_KEY;
    this.senderId = process.env.SMS_SENDER_ID;
  }

  isConfigured(): boolean {
    return Boolean(this.gatewayUrl && this.apiKey && this.senderId);
  }

  async sendSms(message: SmsMessage): Promise<SmsDeliveryResult> {
    const maskedPhone = message.to.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");

    // 1. Check Indian DLT compliance
    if (!message.templateId) {
      console.warn(
        `[HttpSmsProvider] Indian DLT compliance violation: SMS to ${maskedPhone} rejected because templateId is missing.`
      );
      return {
        success: false,
        error: "Indian DLT compliance requirement: registered templateId is missing.",
        timestamp: new Date(),
      };
    }

    // 2. Validate configuration
    if (!this.isConfigured()) {
      const missingVars = [
        !this.gatewayUrl && "SMS_GATEWAY_URL",
        !this.apiKey && "SMS_API_KEY",
        !this.senderId && "SMS_SENDER_ID",
      ]
        .filter(Boolean)
        .join(", ");

      console.warn(
        `[HttpSmsProvider] Cannot dispatch SMS to ${maskedPhone}: Production SMS provider is unconfigured. Missing: ${missingVars}. Explicit delivery failure returned.`
      );

      return {
        success: false,
        unconfigured: true,
        error: `Production SMS gateway unconfigured (Missing environment variables: ${missingVars})`,
        timestamp: new Date(),
      };
    }

    // 3. Real HTTP POST dispatch with timeout
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(this.gatewayUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          sender: this.senderId,
          to: message.to,
          message: message.message,
          templateId: message.templateId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          success: false,
          error: `SMS Gateway returned HTTP status ${response.status}`,
          timestamp: new Date(),
        };
      }

      const data = (await response.json()) as { messageId?: string; id?: string };
      return {
        success: true,
        messageId: data.messageId || data.id || `sms-${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(
        `[HttpSmsProvider] Failed to dispatch SMS to ${maskedPhone}:`,
        error instanceof Error ? error.message : "Network error"
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMS Gateway network failure",
        timestamp: new Date(),
      };
    }
  }
}

export const smsService: SmsProvider =
  process.env.NODE_ENV === "production"
    ? new HttpSmsProvider()
    : new LocalDevSmsProvider();
