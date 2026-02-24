import { io } from 'socket.io-client';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace('/api', '');

// Singleton socket connection
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE, {
      autoConnect: false,
      transports: ['polling', 'websocket'],   // polling first — more reliable through HTTPS proxy
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
}

export function connectSocket(tenantId) {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.once('connect', () => {
      if (tenantId) s.emit('join-tenant', tenantId);
    });
  } else if (tenantId) {
    s.emit('join-tenant', tenantId);
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
