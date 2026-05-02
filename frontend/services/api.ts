import { API_URL } from './backend';

const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const getErrorMessage = async (response: Response, fallback: string) => {
  const text = await response.text();
  return text || fallback;
};

export const register = async (data: any) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Registration failed"));
  }

  return await response.json();
};

export const login = async (data: any) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Login failed"));
  }

  return await response.json();
};

export const sendSMS = async (phone: string) => {
  const query = new URLSearchParams({ phone: phone.trim() }).toString();
  const response = await fetch(`${API_URL}/auth/send-sms?${query}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "SMS failed"));
  }

  return await response.json();
};

export const logout = async (token: string) => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: getAuthHeaders(token),
  });

  if (response.status === 401) {
    return { success: true, message: "Session already expired" };
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Logout failed"));
  }

  return await response.json();
};

export const getProfile = async (token: string) => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error("Не удалось получить профиль");
  }

  return await response.json();
};

export const getUsers = async (token: string) => {
  const response = await fetch(`${API_URL}/users`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error("Failed to get users");
  }

  return await response.json();
};

export const getConversations = async (token: string, userId: string) => {
  const response = await fetch(
    `${API_URL}/conversations?user_id=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить чаты");
  }

  return await response.json();
};

export const createConversation = async (
  token: string,
  data: {
    type: string;
    participants: string[];
  }
) => {
  const response = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Не удалось создать чат"));
  }

  return await response.json();
};

export const getMessages = async (token: string, conversationId: string) => {
  const response = await fetch(
    `${API_URL}/messages/${encodeURIComponent(conversationId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить сообщения");
  }

  return await response.json();
};

export const createMessage = async (
  token: string,
  data: {
    client_id: string;
    conversation_id: string;
    sender_id: string;
    sender_nickname: string;
    content: string;
  }
) => {
  const response = await fetch(`${API_URL}/messages`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Не удалось отправить сообщение")
    );
  }

  return await response.json();
};

export const api = {
  register,
  login,
  sendSMS,
  logout,
  getProfile,
  getConversations,
  getUsers,
  createConversation,
  getMessages,
  createMessage,
};
