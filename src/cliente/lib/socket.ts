import { io, Socket } from 'socket.io-client';

export const socket: Socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});
