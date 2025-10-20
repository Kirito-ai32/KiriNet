import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fonts } from '../constants/theme';

export default function ResetScreen() {
  const router = useRouter();
  const [cleared, setCleared] = React.useState(false);

  const handleClear = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared!');
      setCleared(true);
      
      // Очищаем также localStorage для веба
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
      
      setTimeout(() => {
        router.replace('/auth/language');
      }, 1000);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔄 Сброс данных</Text>
      <Text style={styles.subtitle}>Reset Data</Text>
      
      {!cleared ? (
        <>
          <Text style={styles.description}>
            Эта страница очистит все сохраненные данные
            и вернет вас на экран регистрации.
          </Text>
          
          <TouchableOpacity style={styles.button} onPress={handleClear}>
            <Text style={styles.buttonText}>Очистить данные</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.success}>✅ Данные очищены! Перенаправление...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fonts.sizes.xxl,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fonts.sizes.lg,
    color: colors.secondary,
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: fonts.sizes.md,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.error,
    padding: spacing.lg,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonText: {
    color: colors.text,
    fontSize: fonts.sizes.md,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  success: {
    fontSize: fonts.sizes.lg,
    color: colors.success,
    fontWeight: 'bold',
  },
});
