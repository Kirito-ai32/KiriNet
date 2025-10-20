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
  
  setUser: async (user: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  
  setTokens: async (tokens: AuthTokens) => {
    await AsyncStorage.setItem('tokens', JSON.stringify(tokens));
    set({ tokens });
  },
  
  setUserAndTokens: async (user: User, tokens: AuthTokens) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('tokens', JSON.stringify(tokens));
    set({ user, tokens });
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
  
  clearUser: async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('tokens');
    set({ user: null, tokens: null });
  },
  
  getAccessToken: () => {
    const state = get();
    return state.tokens?.access_token || null;
  },
}));
