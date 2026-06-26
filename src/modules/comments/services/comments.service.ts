import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Comment } from '../entities/comment.entity';
import { User } from '../../users/entities/user.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace-member.entity';
import { ActivityLogsService } from '../../activity-logs/services/activity-logs.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CommentsRepository } from '../repositories/comments.repository';
import { TasksRepository } from '../../tasks/repositories/tasks.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentRepository: CommentsRepository,
    private readonly taskRepository: TasksRepository,
    private readonly activityLogsService: ActivityLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    workspaceId: string,
    taskId: string,
    user: User,
    content: string,
  ): Promise<Comment> {
    // 1. Verify task exists
    const task = await this.taskRepository.findOne({
      where: { id: taskId, workspaceId },
      relations: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 2. Create comment
    const comment = this.commentRepository.create({
      taskId,
      userId: user.id,
      content: content.trim(),
    });

    const savedComment = await this.commentRepository.save(comment);

    // 3. Log Activity
    await this.activityLogsService.log(taskId, user.id, 'COMMENT_ADDED', {
      commentId: savedComment.id,
    });

    // 4. Create Notifications for Assignee and Reporter
    // Notify assignee
    if (task.assigneeId && task.assigneeId !== user.id) {
      await this.notificationsService.create(
        task.assigneeId,
        workspaceId,
        `"${user.name}" commented on your assigned task: "${task.title}"`,
        'NEW_COMMENT',
        taskId,
      );
    }

    // Notify reporter (if reporter is different from assignee and commenter)
    if (task.reporterId !== user.id && task.reporterId !== task.assigneeId) {
      await this.notificationsService.create(
        task.reporterId,
        workspaceId,
        `"${user.name}" commented on your reported task: "${task.title}"`,
        'NEW_COMMENT',
        taskId,
      );
    }

    // Fetch comment with user info
    const result = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: { user: true },
    });
    if (!result) {
      throw new NotFoundException('Comment could not be retrieved');
    }
    return result;
  }

  async findAllForTask(
    workspaceId: string,
    taskId: string,
  ): Promise<Comment[]> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, workspaceId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.commentRepository.find({
      where: { taskId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    workspaceId: string,
    commentId: string,
    userId: string,
    content: string,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: { task: true },
    });

    if (!comment || comment.task.workspaceId !== workspaceId) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = content.trim();
    return this.commentRepository.save(comment);
  }

  async delete(
    workspaceId: string,
    commentId: string,
    user: User,
    role: WorkspaceRole,
  ): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: { task: { workspace: true } },
    });

    if (!comment || comment.task.workspaceId !== workspaceId) {
      throw new NotFoundException('Comment not found');
    }

    // Allowed if owner of comment OR ADMIN in the workspace
    if (comment.userId !== user.id && role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment',
      );
    }

    await this.commentRepository.remove(comment);
  }
}
