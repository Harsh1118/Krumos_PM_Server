import { User } from '../entities/user.entity';

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMinResponseDto {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export const mapUserToResponse = (user: User): UserResponseDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const mapUserToMinResponse = (user: User): UserMinResponseDto => ({
  id: user.id,
  name: user.name,
  avatarUrl: user.avatarUrl,
});
