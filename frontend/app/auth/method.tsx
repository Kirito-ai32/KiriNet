import React, { useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, fonts, spacing } from '../../constants/theme';

export default function AuthMethodScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleMethodSelect = (method: 'phone' | 'email' | 'nickname') => {
    router.push(`/auth/register?method=${method}`);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>KiriNet</Text>
          <Text style={styles.logoSub}>Messenger</Text>
          <View style={styles.glowLine} />
        </View>

        <Text style={styles.title}>Выберите способ регистрации</Text>
        <Text style={styles.subtitle}>Choose registration method</Text>

        <View style={styles.methodButtons}>
          <TouchableOpacity
            style={styles.methodButton}
            onPress={() => handleMethodSelect('phone')}
          >
            <View style={[styles.methodIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="call" size={32} color={colors.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Телефон / Phone</Text>
              <Text style={styles.methodDesc}>SMS-код для подтверждения</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodButton}
            onPress={() => handleMethodSelect('email')}
          >
            <View style={[styles.methodIcon, { backgroundColor: `${colors.secondary}20` }]}>
              <Ionicons name="mail" size={32} color={colors.secondary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Email</Text>
              <Text style={styles.methodDesc}>Email и пароль</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodButton}
            onPress={() => handleMethodSelect('nickname')}
          >
            <View style={[styles.methodIcon, { backgroundColor: `${colors.accent}20` }]}>
              <Ionicons name="person" size={32} color={colors.accent} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Никнейм / Nickname</Text>
              <Text style={styles.methodDesc}>Никнейм и пароль</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.loginText}>Уже есть аккаунт? Войти</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.xl + 20,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: fonts.sizes.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: fonts.sizes.md,
    color: colors.secondary,
    marginTop: spacing.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  glowLine: {
    width: 80,
    height: 2,
    backgroundColor: colors.secondary,
    marginTop: spacing.sm,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  title: {
    fontSize: fonts.sizes.xl,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  methodButtons: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: fonts.sizes.md,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  methodDesc: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  loginLink: {
    alignItems: 'center',
    padding: spacing.md,
  },
  loginText: {
    fontSize: fonts.sizes.md,
    color: colors.primary,
  },
});
