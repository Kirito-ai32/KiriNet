import Constants from 'expo-constants';

// @ts-ignore
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const API_URL = `${BACKEND_URL}/api`;

console.log('API Service initialized with URL:', API_URL);

// Helper для получения токена
const getAuthHeader = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const api = {
  // ===== AUTH API =====
  async sendSMS(phone: string) {
    const response = await fetch(`${API_URL}/auth/send-sms?phone=${encodeURIComponent(phone)}`, {
      method: 'POST',
    });
    return response.json();
  },

  async register(data: {
    auth_method: 'phone' | 'email' | 'nickname';
    nickname: string;
    phone?: string;
    email?: string;
    password?: string;
    sms_code?: string;
  }) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка регистрации');
    }
    return response.json();
  },

  async login(data: {
    auth_method: 'phone' | 'email' | 'nickname';
    identifier: string;
    password?: string;
    sms_code?: string;
  }) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка входа');
    }
    return response.json();
  },

  async getProfile(token: string) {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeader(token),
    });
    if (!response.ok) {
      throw new Error('Не удалось загрузить профиль');
    }
    return response.json();
  },

  async updateProfile(token: string, data: any) {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'PUT',
      headers: getAuthHeader(token),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async logout(token: string) {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeader(token),
    });
    return response.json();
  },

  async refreshToken(refreshToken: string) {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return response.json();
  },

  // ===== LEGACY API (для обратной совместимости) =====
  async createUser(nickname: string) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    return response.json();
  },

  async getUsers() {
    const response = await fetch(`${API_URL}/users`);
    return response.json();
  },

  async getUser(userId: string) {
    const response = await fetch(`${API_URL}/users/${userId}`);
    return response.json();
  },

  // ===== CHAT API =====
  async getConversations(userId: string) {
    const response = await fetch(`${API_URL}/conversations?user_id=${userId}`);
    return response.json();
  },

  async createConversation(data: any) {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getMessages(conversationId: string) {
    const response = await fetch(`${API_URL}/messages/${conversationId}`);
    return response.json();
  },

  async createMessage(data: any) {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
