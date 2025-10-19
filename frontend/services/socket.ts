import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

    this.userId = userId;
    this.socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      if (this.userId) {
        this.socket?.emit('user_online', { user_id: this.userId });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('new_message', callback);
  }

  onUserStatus(callback: (data: any) => void) {
    this.socket?.on('user_status', callback);
  }

  onUserTyping(callback: (data: any) => void) {
    this.socket?.on('user_typing', callback);
  }

  sendMessage(messageData: any) {
    this.socket?.emit('send_message', messageData);
  }

  sendTyping(data: any) {
    this.socket?.emit('typing', data);
  }

  removeListener(event: string, callback: any) {
    this.socket?.off(event, callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
