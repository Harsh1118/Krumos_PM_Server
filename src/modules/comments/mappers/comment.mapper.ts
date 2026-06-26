import { Comment } from '../entities/comment.entity';
import { UserMinResponseDto } from '../../users/mappers/user.mapper';

export interface CommentResponseDto {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user?: UserMinResponseDto;
}

export const mapCommentToResponse = (comment: Comment): CommentResponseDto => ({
  id: comment.id,
  taskId: comment.taskId,
  userId: comment.userId,
  content: comment.content,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  user: comment.user ? {
    id: comment.user.id,
    name: comment.user.name,
    avatarUrl: comment.user.avatarUrl,
  } : undefined,
});
