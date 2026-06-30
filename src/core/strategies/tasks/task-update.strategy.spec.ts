import { ForbiddenException } from '@nestjs/common';
import {
  AdminTaskUpdateStrategy,
  ManagerTaskUpdateStrategy,
  MemberTaskUpdateStrategy,
  TaskUpdateStrategySelector,
} from './task-update.strategy';
import {
  Task,
  TaskPriority,
} from '../../../modules/tasks/entities/task.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { WorkspaceRole } from '../../../modules/workspaces/entities/workspace-member.entity';

describe('TaskUpdateStrategies', () => {
  const user = { id: 'u1' } as User;

  describe('AdminTaskUpdateStrategy', () => {
    const strategy = new AdminTaskUpdateStrategy();

    it('should allow Admin to update anything', () => {
      const task = { assigneeId: 'u2' } as Task;
      expect(() =>
        strategy.validate(task, user, { priority: TaskPriority.HIGH }),
      ).not.toThrow();
    });
  });

  describe('ManagerTaskUpdateStrategy', () => {
    const strategy = new ManagerTaskUpdateStrategy();

    it('should allow Manager to update anything', () => {
      const task = { assigneeId: 'u2' } as Task;
      expect(() =>
        strategy.validate(task, user, { priority: TaskPriority.HIGH }),
      ).not.toThrow();
    });
  });

  describe('MemberTaskUpdateStrategy', () => {
    const strategy = new MemberTaskUpdateStrategy();

    it('should throw ForbiddenException if task is not assigned to the member', () => {
      const task = { assigneeId: 'u2' } as Task;
      expect(() => strategy.validate(task, user, {})).toThrow(
        new ForbiddenException(
          'MEMBERs can only update tasks assigned to them',
        ),
      );
    });

    it('should allow member to update details (like title/desc) if assigned to them', () => {
      const task = {
        assigneeId: 'u1',
        priority: TaskPriority.MEDIUM,
        dueDate: null,
      } as Task;
      expect(() =>
        strategy.validate(task, user, { title: 'New title' }),
      ).not.toThrow();
    });

    it('should throw ForbiddenException if member tries to change task priority', () => {
      const task = {
        assigneeId: 'u1',
        priority: TaskPriority.MEDIUM,
        dueDate: null,
      } as Task;
      expect(() =>
        strategy.validate(task, user, { priority: TaskPriority.HIGH }),
      ).toThrow(
        new ForbiddenException(
          'Only admins can change task priority, assignee, and due date',
        ),
      );
    });

    it('should throw ForbiddenException if member tries to change assignee', () => {
      const task = {
        assigneeId: 'u1',
        priority: TaskPriority.MEDIUM,
        dueDate: null,
      } as Task;
      expect(() => strategy.validate(task, user, { assigneeId: 'u2' })).toThrow(
        new ForbiddenException(
          'Only admins can change task priority, assignee, and due date',
        ),
      );
    });

    it('should throw ForbiddenException if member tries to change due date', () => {
      const task = {
        assigneeId: 'u1',
        priority: TaskPriority.MEDIUM,
        dueDate: new Date('2026-07-01'),
      } as Task;
      expect(() =>
        strategy.validate(task, user, { dueDate: new Date('2026-07-02') }),
      ).toThrow(
        new ForbiddenException(
          'Only admins can change task priority, assignee, and due date',
        ),
      );
    });
  });

  describe('TaskUpdateStrategySelector', () => {
    const adminStrategy = new AdminTaskUpdateStrategy();
    const managerStrategy = new ManagerTaskUpdateStrategy();
    const memberStrategy = new MemberTaskUpdateStrategy();
    const selector = new TaskUpdateStrategySelector(
      adminStrategy,
      managerStrategy,
      memberStrategy,
    );

    it('should select correct strategy based on role', () => {
      expect(selector.getStrategy(WorkspaceRole.ADMIN)).toBe(adminStrategy);
      expect(selector.getStrategy(WorkspaceRole.MANAGER)).toBe(managerStrategy);
      expect(selector.getStrategy(WorkspaceRole.MEMBER)).toBe(memberStrategy);
    });

    it('should throw if role is unsupported', () => {
      expect(() => selector.getStrategy('INVALID' as WorkspaceRole)).toThrow(
        new ForbiddenException('Unsupported workspace role: INVALID'),
      );
    });
  });
});
