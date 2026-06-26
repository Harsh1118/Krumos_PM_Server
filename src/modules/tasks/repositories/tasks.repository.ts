import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, FindManyOptions, DeepPartial, SelectQueryBuilder } from 'typeorm';
import { Task } from '../entities/task.entity';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repository: Repository<Task>,
  ) {}

  async findOne(options: FindOneOptions<Task>): Promise<Task | null> {
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Task>): Task {
    return this.repository.create(data);
  }

  async save(task: Task): Promise<Task> {
    return this.repository.save(task);
  }

  async find(options: FindManyOptions<Task>): Promise<Task[]> {
    return this.repository.find(options);
  }

  async softRemove(task: Task): Promise<Task> {
    return this.repository.softRemove(task);
  }

  createQueryBuilder(alias: string): SelectQueryBuilder<Task> {
    return this.repository.createQueryBuilder(alias);
  }
}
