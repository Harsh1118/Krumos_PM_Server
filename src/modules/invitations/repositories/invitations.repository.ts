import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, FindManyOptions, DeepPartial } from 'typeorm';
import { Invitation } from '../entities/invitation.entity';

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectRepository(Invitation)
    private readonly repository: Repository<Invitation>,
  ) {}

  async findOne(options: FindOneOptions<Invitation>): Promise<Invitation | null> {
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Invitation>): Invitation {
    return this.repository.create(data);
  }

  async save(invitation: Invitation): Promise<Invitation> {
    return this.repository.save(invitation);
  }

  async find(options: FindManyOptions<Invitation>): Promise<Invitation[]> {
    return this.repository.find(options);
  }
}
