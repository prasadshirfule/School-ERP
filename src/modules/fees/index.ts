export type OfflinePaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER";

export interface FeeReceiptDTO {
  receiptNo: string;
  invoiceId: string;
  amount: number;
  paymentMethod: OfflinePaymentMethod;
  paymentDate: Date;
}
