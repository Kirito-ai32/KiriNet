import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  nickname: string;
  is_online: boolean;
}

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  loadUser: () => Promise<void>;
  clearUser: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: async (user: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  loadUser: async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      set({ user: JSON.parse(userStr) });
    }
  },
  clearUser: async () => {
    await AsyncStorage.removeItem('user');
    set({ user: null });
  },
}));
