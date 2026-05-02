import { buildWebSocketUrl } from './backend';

class SocketService {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private callbacks: Set<(message: any) => void> = new Set();
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();
  private seenMessageKeys: string[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private readonly maxSeenMessages = 500;

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }

  private getMessageKey(message: any): string | null {
    if (!message || typeof message !== 'object') {
      return null;
    }

    if (typeof message.client_id === 'string' && message.client_id.length > 0) {
      return `client:${message.client_id}`;
    }

    if (typeof message.id === 'string' && message.id.length > 0) {
      return `server:${message.id}`;
    }

    return null;
  }

  private shouldIgnoreAsDuplicate(message: any): boolean {
    const key = this.getMessageKey(message);
    if (!key) {
      return false;
    }

    if (this.seenMessageKeys.includes(key)) {
      return true;
    }

    this.seenMessageKeys.push(key);
    if (this.seenMessageKeys.length > this.maxSeenMessages) {
      this.seenMessageKeys.shift();
    }

    return false;
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || !this.userId || this.reconnectAttempts >= 5) {
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * this.reconnectAttempts, 5000);

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  connect(userId: string) {
    const isAlreadyConnected =
      this.socket &&
      this.userId === userId &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING);

    if (isAlreadyConnected) {
      return;
    }

    this.disconnect();
    this.shouldReconnect = true;
    this.userId = userId;

    const socket = new WebSocket(buildWebSocketUrl(userId));
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      console.log('WebSocket connected');
      this.notifyConnectionStatus(true);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.event === 'pong') {
          return;
        }

        const message =
          parsed?.event === 'new_message' ? parsed.data : parsed?.data ?? parsed;

        if (!message || this.shouldIgnoreAsDuplicate(message)) {
          return;
        }

        this.callbacks.forEach((callback) => callback(message));
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      this.notifyConnectionStatus(false);
      this.scheduleReconnect();
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.notifyConnectionStatus(false);
    };
  }

  onNewMessage(callback: (message: any) => void) {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.add(callback);
    callback(this.isConnected());

    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  sendMessage(data: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = {
      event: 'new_message',
      data,
    };

    this.socket.send(JSON.stringify(payload));
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.userId = null;
    this.reconnectAttempts = 0;
    this.notifyConnectionStatus(false);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const socketService = new SocketService();
