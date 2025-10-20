import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  nickname: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: string;
  about?: string;
  language?: string;
  theme?: string;
  is_online: boolean;
  is_premium: boolean;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface UserStore {
  user: User | null;
  tokens: AuthTokens | null;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUserAndTokens: (user: User, tokens: AuthTokens) => Promise<void>;
  loadUser: () => Promise<void>;
  clearUser: () => Promise<void>;
  getAccessToken: () => string | null;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  tokens: null,
  
  setUser: (user: User) => {
    // Устанавливаем state сразу для немедленной реакции UI
    set({ user });
    // AsyncStorage в фоне (не блокирует)
    AsyncStorage.setItem('user', JSON.stringify(user)).catch(console.error);
  },
  
  setTokens: (tokens: AuthTokens) => {
    // Устанавливаем state сразу
    set({ tokens });
    // AsyncStorage в фоне
    AsyncStorage.setItem('tokens', JSON.stringify(tokens)).catch(console.error);
  },
  
  setUserAndTokens: async (user: User, tokens: AuthTokens) => {
    // Устанавливаем state сразу для немедленного редиректа
    set({ user, tokens });
    // AsyncStorage в фоне
    Promise.all([
      AsyncStorage.setItem('user', JSON.stringify(user)),
      AsyncStorage.setItem('tokens', JSON.stringify(tokens))
    ]).catch(console.error);
  },
  
  loadUser: async () => {
    const userStr = await AsyncStorage.getItem('user');
    const tokensStr = await AsyncStorage.getItem('tokens');
    
    if (userStr) {
      set({ user: JSON.parse(userStr) });
    }
    if (tokensStr) {
      set({ tokens: JSON.parse(tokensStr) });
    }
  },
  
  clearUser: () => {
    // Очищаем state немедленно для редиректа
    set({ user: null, tokens: null });
    // AsyncStorage в фоне
    Promise.all([
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('tokens')
    ]).catch(console.error);
  },
  
  getAccessToken: () => {
    const state = get();
    return state.tokens?.access_token || null;
  },
}));
