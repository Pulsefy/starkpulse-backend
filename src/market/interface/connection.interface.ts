export interface SocketWithUser extends WebSocket {
  id: string;
  user: any;
  subscriptions: Set<string>;
}