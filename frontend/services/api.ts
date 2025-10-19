import Constants from 'expo-constants';

// @ts-ignore
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const API_URL = `${BACKEND_URL}/api`;

console.log('API Service initialized with URL:', API_URL);

export const api = {
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
