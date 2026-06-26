import { Injectable, NotFoundException } from '@nestjs/common';
import { LessThan } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { EventsGateway } from '../../../core/events/events.gateway';
import { NotificationsRepository } from '../repositories/notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationsRepository,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(
    userId: string,
    workspaceId: string,
    message: string,
    type: string,
    relatedId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      workspaceId,
      message,
      type,
      relatedId,
      isRead: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Push real-time notification to the user
    this.eventsGateway.sendToUser(
      userId,
      'new_notification',
      savedNotification,
    );

    return savedNotification;
  }

  async findAllForUser(
    userId: string,
    workspaceId: string,
  ): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId, workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string, workspaceId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, workspaceId, isRead: false },
      { isRead: true },
    );
  }

  async clearOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await this.notificationRepository.delete({
      createdAt: LessThan(thirtyDaysAgo),
    });
  }
}
