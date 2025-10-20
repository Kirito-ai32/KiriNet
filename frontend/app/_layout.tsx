import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useUserStore } from '../stores/userStore';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const loadUser = useUserStore((state) => state.loadUser);
  const user = useUserStore((state) => state.user);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Загружаем пользователя при старте
    loadUser().then(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (user && !inTabsGroup) {
      // Пользователь авторизован - перенаправляем в чаты
      router.replace('/(tabs)/chats');
    } else if (!user && !inAuthGroup) {
      // Пользователь не авторизован - перенаправляем на выбор языка
      router.replace('/auth/language');
    }
  }, [user, isReady, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
    </>
  );
}
