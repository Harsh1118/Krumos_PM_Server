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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? (process.env.FRONTEND_URL.includes(',') ? process.env.FRONTEND_URL.split(',') : process.env.FRONTEND_URL)
      : 'http://localhost:5173',
    credentials: true,
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

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
      client.join(`user_${payload.sub}`);
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
  handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() slug: string,
  ) {
    if (slug) {
      // Leave existing workspace rooms first
      for (const room of client.rooms) {
        if (room.startsWith('workspace_')) {
          client.leave(room);
        }
      }
      client.join(`workspace_${slug}`);
      this.logger.log(
        `User ${client.data.userId} joined workspace room: workspace_${slug}`,
      );
      return { status: 'joined', room: `workspace_${slug}` };
    }
  }

  broadcastToWorkspace(slug: string, eventName: string, data: object | string | number | boolean | null | undefined) {
    this.server.to(`workspace_${slug}`).emit(eventName, data);
  }

  sendToUser(userId: string, eventName: string, data: object | string | number | boolean | null | undefined) {
    this.server.to(`user_${userId}`).emit(eventName, data);
  }
}
