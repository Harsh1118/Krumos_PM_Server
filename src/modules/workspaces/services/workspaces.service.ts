import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Workspace } from '../entities/workspace.entity';
import {
  WorkspaceMember,
  WorkspaceRole,
} from '../entities/workspace-member.entity';
import { mapWorkspaceMemberToWithRoleDto } from '../mappers/workspace.mapper';
import { WorkspacesRepository } from '../repositories/workspaces.repository';
import { WorkspaceMembersRepository } from '../repositories/workspace-members.repository';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly workspaceRepository: WorkspacesRepository,
    private readonly workspaceMemberRepository: WorkspaceMembersRepository,
  ) {}

  async create(userId: string, name: string, slug: string): Promise<Workspace> {
    // Standardize slug to lowercase and remove spaces
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    if (!cleanSlug) {
      throw new BadRequestException('Workspace slug is invalid');
    }

    const existing = await this.workspaceRepository.findOne({
      where: { slug: cleanSlug },
    });
    if (existing) {
      throw new ConflictException(
        `Workspace slug "${cleanSlug}" is already taken`,
      );
    }

    const workspace = this.workspaceRepository.create({
      name: name.trim(),
      slug: cleanSlug,
    });
    const savedWorkspace = await this.workspaceRepository.save(workspace);

    // Create owner as ADMIN
    const member = this.workspaceMemberRepository.create({
      userId,
      workspaceId: savedWorkspace.id,
      role: WorkspaceRole.ADMIN,
    });
    await this.workspaceMemberRepository.save(member);

    return savedWorkspace;
  }

  async findAllForUser(userId: string) {
    const memberships = await this.workspaceMemberRepository.find({
      where: { userId },
      relations: { workspace: true },
    });

    return memberships.map(mapWorkspaceMemberToWithRoleDto);
  }

  async update(
    slug: string,
    name?: string,
    logoUrl?: string | null,
  ): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { slug },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${slug}" not found`);
    }

    if (name) {
      workspace.name = name.trim();
    }
    if (logoUrl !== undefined) {
      workspace.logoUrl = logoUrl;
    }

    return this.workspaceRepository.save(workspace);
  }

  async delete(slug: string, confirmSlug: string): Promise<void> {
    if (slug !== confirmSlug) {
      throw new BadRequestException(
        'Confirmation slug does not match the workspace slug',
      );
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { slug },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${slug}" not found`);
    }

    await this.workspaceRepository.softRemove(workspace);
  }
}
