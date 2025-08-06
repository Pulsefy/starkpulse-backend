// Real-time portfolio update gateway (e.g., using WebSockets)
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class PortfolioRealtimeGateway {
  @WebSocketServer()
  server: Server;

  sendPortfolioUpdate(portfolioId: string, data: any) {
    this.server.to(portfolioId).emit('portfolioUpdate', data);
  }
}
