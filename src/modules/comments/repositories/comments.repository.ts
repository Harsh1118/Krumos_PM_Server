import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  FindManyOptions,
  DeepPartial,
} from 'typeorm';
import { Comment } from '../entities/comment.entity';

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly repository: Repository<Comment>,
  ) {}

  async findOne(options: FindOneOptions<Comment>): Promise<Comment | null> {
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Comment>): Comment {
    return this.repository.create(data);
  }

  async save(comment: Comment): Promise<Comment> {
    return this.repository.save(comment);
  }

  async find(options: FindManyOptions<Comment>): Promise<Comment[]> {
    return this.repository.find(options);
  }

  async remove(comment: Comment): Promise<Comment> {
    return this.repository.remove(comment);
  }
}
