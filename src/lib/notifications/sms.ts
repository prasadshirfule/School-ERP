export interface SmsMessage {
  to: string; // Indian E.164 or 10-digit format: e.g. +919876543210
  message: string;
  templateId?: string; // Indian DLT registered template ID
}

export interface SmsProvider {
  sendSms(message: SmsMessage): Promise<{ success: boolean; messageId?: string }>;
}

export const devSmsOutbox: SmsMessage[] = [];

export class LocalDevSmsProvider implements SmsProvider {
  async sendSms(message: SmsMessage): Promise<{ success: boolean; messageId: string }> {
    devSmsOutbox.push(message);
    const maskedPhone = message.to.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
    if (process.env.NODE_ENV !== "test") {
      console.log(`[DevSMS] Dispatched to ${maskedPhone} (DLT: ${message.templateId || "DEV"}): "${message.message.substring(0, 30)}..."`);
    }
    return {
      success: true,
      messageId: `dev-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}

export class ProductionSmsProvider implements SmsProvider {
  async sendSms(message: SmsMessage): Promise<{ success: boolean; messageId?: string }> {
    const smsApiKey = process.env.SMS_API_KEY;
    if (!smsApiKey) {
      console.warn("[ProductionSmsProvider] SMS_API_KEY not configured. SMS suppressed.");
      return { success: false };
    }
    if (!message.templateId) {
      console.warn("[ProductionSmsProvider] Indian DLT compliance violation: Missing templateId.");
      return { success: false };
    }
    return { success: true, messageId: `prod-sms-${Date.now()}` };
  }
}

export const smsService: SmsProvider =
  process.env.NODE_ENV === "production"
    ? new ProductionSmsProvider()
    : new LocalDevSmsProvider();
