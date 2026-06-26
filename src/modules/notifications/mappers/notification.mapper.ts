import { Notification } from '../entities/notification.entity';

export interface NotificationResponseDto {
  id: string;
  userId: string;
  workspaceId: string;
  message: string;
  type: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export const mapNotificationToResponse = (notification: Notification): NotificationResponseDto => ({
  id: notification.id,
  userId: notification.userId,
  workspaceId: notification.workspaceId,
  message: notification.message,
  type: notification.type,
  relatedId: notification.relatedId || null,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
});
