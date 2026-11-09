export interface NotificationDTO {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  type: string;
  readAt?: Date | null;
}
