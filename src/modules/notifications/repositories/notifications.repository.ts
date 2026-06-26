import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, FindManyOptions, DeepPartial, UpdateResult, DeleteResult } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  create(data: DeepPartial<Notification>): Notification {
    return this.repository.create(data);
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repository.save(notification);
  }

  async find(options: FindManyOptions<Notification>): Promise<Notification[]> {
    return this.repository.find(options);
  }

  async findOne(options: FindOneOptions<Notification>): Promise<Notification | null> {
    return this.repository.findOne(options);
  }

  async update(criteria: any, partialEntity: QueryDeepPartialEntity<Notification>): Promise<UpdateResult> {
    return this.repository.update(criteria, partialEntity);
  }

  async delete(criteria: any): Promise<DeleteResult> {
    return this.repository.delete(criteria);
  }
}
