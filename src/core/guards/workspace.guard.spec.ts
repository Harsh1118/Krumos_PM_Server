import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceGuard } from './workspace.guard';
import { WorkspacesRepository } from '../../modules/workspaces/repositories/workspaces.repository';
import { WorkspaceMembersRepository } from '../../modules/workspaces/repositories/workspace-members.repository';
import { TenantContextService } from '../context/tenant-context.service';

describe('WorkspaceGuard', () => {
  let guard: WorkspaceGuard;
  let workspacesRepository: jest.Mocked<Partial<WorkspacesRepository>>;
  let workspaceMembersRepository: jest.Mocked<
    Partial<WorkspaceMembersRepository>
  >;
  let tenantContextService: jest.Mocked<Partial<TenantContextService>>;

  beforeEach(async () => {
    const mockWorkspacesRepository = {
      findOne: jest.fn(),
    };
    const mockWorkspaceMembersRepository = {
      findOne: jest.fn(),
    };
    const mockTenantContextService = {
      setWorkspaceId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceGuard,
        { provide: WorkspacesRepository, useValue: mockWorkspacesRepository },
        {
          provide: WorkspaceMembersRepository,
          useValue: mockWorkspaceMembersRepository,
        },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    guard = module.get<WorkspaceGuard>(WorkspaceGuard);
    workspacesRepository = module.get(WorkspacesRepository);
    workspaceMembersRepository = module.get(WorkspaceMembersRepository);
    tenantContextService = module.get(TenantContextService);
  });

  const createMockContext = (
    requestData: Record<string, unknown>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => requestData,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException if user is missing', async () => {
    const context = createMockContext({ params: {} });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('User is not authenticated'),
    );
  });

  it('should throw ForbiddenException if slug is missing', async () => {
    const context = createMockContext({
      user: { id: 'u1' },
      params: {},
      headers: {},
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Workspace context is missing'),
    );
  });

  it('should throw NotFoundException if workspace does not exist', async () => {
    const context = createMockContext({
      user: { id: 'u1' },
      params: { slug: 'missing-ws' },
    });
    (workspacesRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new NotFoundException('Workspace with slug "missing-ws" not found'),
    );
  });

  it('should throw ForbiddenException if user is not a member of the workspace', async () => {
    const context = createMockContext({
      user: { id: 'u1' },
      params: { slug: 'my-ws' },
    });
    (workspacesRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      slug: 'my-ws',
    });
    (workspaceMembersRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('You are not a member of this workspace'),
    );
  });

  it('should set request.workspace and tenant context if user is a member', async () => {
    const request = {
      user: { id: 'u1' },
      params: { slug: 'my-ws' },
      workspace: null,
      workspaceRole: null,
    };
    const context = createMockContext(request);
    (workspacesRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      slug: 'my-ws',
    });
    (workspaceMembersRepository.findOne as jest.Mock).mockResolvedValue({
      userId: 'u1',
      workspaceId: 'w1',
      role: 'ADMIN',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.workspace).toEqual({ id: 'w1', slug: 'my-ws' });
    expect(request.workspaceRole).toBe('ADMIN');
    expect(tenantContextService.setWorkspaceId).toHaveBeenCalledWith('w1');
  });
});
