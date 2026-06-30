import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WorkspacesRepository } from '../../modules/workspaces/repositories/workspaces.repository';
import { WorkspaceMembersRepository } from '../../modules/workspaces/repositories/workspace-members.repository';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.includes(',')
        ? process.env.FRONTEND_URL.split(',')
        : process.env.FRONTEND_URL
      : 'http://localhost:5173',
    credentials: true,
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Authenticate socket connection via query token
      const token = client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      // Join private user room for targeted notifications
      await client.join(`user_${payload.sub}`);
      this.logger.log(`Socket Client Connected: User ${payload.sub}`);
    } catch {
      this.logger.warn('Socket connection unauthorized, disconnecting...');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Socket Client Disconnected: User ${client.data.userId || 'anonymous'}`,
    );
  }

  @SubscribeMessage('join_workspace')
  async handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() slug: string,
  ) {
    if (!slug) {
      return { error: 'Workspace slug is required' };
    }

    const userId = client.data.userId as string;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    // Verify the workspace exists
    const workspace = await this.workspacesRepository.findOne({
      where: { slug },
    });
    if (!workspace) {
      this.logger.warn(
        `User ${userId} attempted to join non-existent workspace: ${slug}`,
      );
      return { error: 'Workspace not found' };
    }

    // Verify the user is a member of the requested workspace before joining its room.
    // This prevents any authenticated user from eavesdropping on another workspace's real-time events (IDOR).
    const membership = await this.workspaceMembersRepository.findOne({
      where: { userId, workspaceId: workspace.id },
    });

    if (!membership) {
      this.logger.warn(
        `Unauthorized workspace join attempt: User ${userId} → workspace "${slug}"`,
      );
      return { error: 'You are not a member of this workspace' };
    }

    // Leave all previously joined workspace rooms before joining the new one
    const rooms = Array.from(client.rooms);
    for (const room of rooms) {
      if (room.startsWith('workspace_')) {
        await client.leave(room);
      }
    }

    await client.join(`workspace_${slug}`);
    this.logger.log(`User ${userId} joined workspace room: workspace_${slug}`);
    return { status: 'joined', room: `workspace_${slug}` };
  }

  broadcastToWorkspace(
    slug: string,
    eventName: string,
    data: object | string | number | boolean | null | undefined,
  ) {
    if (this.server) {
      this.server.to(`workspace_${slug}`).emit(eventName, data);
    } else {
      this.logger.warn(
        `WebSocket server not initialized. Suppressed broadcast of event "${eventName}" to workspace "${slug}"`,
      );
    }
  }

  sendToUser(
    userId: string,
    eventName: string,
    data: object | string | number | boolean | null | undefined,
  ) {
    if (this.server) {
      this.server.to(`user_${userId}`).emit(eventName, data);
    } else {
      this.logger.warn(
        `WebSocket server not initialized. Suppressed event "${eventName}" to user "${userId}"`,
      );
    }
  }
}
