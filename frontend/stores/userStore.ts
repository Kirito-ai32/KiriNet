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
  isLoaded: boolean;

  setUser: (user: User) => Promise<void>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  setUserAndTokens: (user: User, tokens: AuthTokens) => Promise<void>;

  loadUser: () => Promise<void>;
  clearUser: () => Promise<void>;

  getAccessToken: () => string | null;
}

export const useUserStore = create<UserStore>((set, get) => ({

  user: null,
  tokens: null,
  isLoaded: false,

  setUser: async (user: User) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch (error) {
      console.error('setUser error:', error);
    }
  },

  setTokens: async (tokens: AuthTokens) => {
    try {
      await AsyncStorage.setItem('tokens', JSON.stringify(tokens));
      set({ tokens });
    } catch (error) {
      console.error('setTokens error:', error);
    }
  },

  setUserAndTokens: async (user: User, tokens: AuthTokens) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('tokens', JSON.stringify(tokens));

      set({
        user,
        tokens,
      });

    } catch (error) {
      console.error('setUserAndTokens error:', error);
    }
  },

  loadUser: async () => {
    try {

      const userStr = await AsyncStorage.getItem('user');
      const tokensStr = await AsyncStorage.getItem('tokens');

      let user = null;
      let tokens = null;

      if (userStr) {
        user = JSON.parse(userStr);
      }

      if (tokensStr) {
        tokens = JSON.parse(tokensStr);
      }

      set({
        user,
        tokens,
        isLoaded: true,
      });

    } catch (error) {
      console.error('loadUser error:', error);

      set({
        user: null,
        tokens: null,
        isLoaded: true,
      });
    }
  },

  clearUser: async () => {
    try {

      // Удаляем из AsyncStorage полностью
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('tokens');

      // Очищаем Zustand state
      set({
        user: null,
        tokens: null,
      });

      console.log('User logged out successfully');

    } catch (error) {
      console.error('clearUser error:', error);
    }
  },

  getAccessToken: () => {
    const state = get();
    return state.tokens?.access_token || null;
  },

}));