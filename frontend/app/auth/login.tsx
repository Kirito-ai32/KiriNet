import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../stores/userStore';
import { api } from '../../services/api';
import { borderRadius, colors, fonts, spacing } from '../../constants/theme';

type LoginMethod = 'phone' | 'email' | 'nickname';

export default function LoginScreen() {
  const router = useRouter();
  const { setUserAndTokens } = useUserStore();

  const [method, setMethod] = useState<LoginMethod>('nickname');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleSendSMS = async () => {
    if (!identifier.trim()) {
      Alert.alert('Ошибка', 'Введите номер телефона');
      return;
    }

    setLoading(true);
    try {
      const response = await api.sendSMS(identifier);
      setSmsCodeSent(true);
      setGeneratedCode(response.code_for_testing);
      Alert.alert(
        'SMS-код отправлен',
        `Для теста: код ${response.code_for_testing}\n\nВведите его в поле ниже`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось отправить SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert('Ошибка', 'Заполните поле входа');
      return;
    }

    if (method === 'phone' && !smsCode.trim()) {
      Alert.alert('Ошибка', 'Введите SMS-код');
      return;
    }

    if ((method === 'email' || method === 'nickname') && !password.trim()) {
      Alert.alert('Ошибка', 'Введите пароль');
      return;
    }

    setLoading(true);
    try {
      const loginData: any = {
        auth_method: method,
        identifier: identifier.trim(),
      };

      if (method === 'phone') {
        loginData.sms_code = smsCode.trim();
      } else {
        loginData.password = password;
      }

      const tokens = await api.login(loginData);
      const userProfile = await api.getProfile(tokens.access_token);
      await setUserAndTokens(userProfile, tokens);
      router.replace('/(tabs)/chats');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Ошибка входа', error.message || 'Неверные данные');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (method) {
      case 'phone':
        return '+380XXXXXXXXX';
      case 'email':
        return 'example@email.com';
      case 'nickname':
        return 'Ваш никнейм';
      default:
        return '';
    }
  };

  const getInputIcon = () => {
    switch (method) {
      case 'phone':
        return 'call-outline';
      case 'email':
        return 'mail-outline';
      case 'nickname':
        return 'person-outline';
      default:
        return 'person-outline';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>KiriNet</Text>
          <Text style={styles.logoSub}>Messenger</Text>
          <View style={styles.glowLine} />
        </View>

        <Text style={styles.title}>Вход / Login</Text>

        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[styles.methodTab, method === 'phone' && styles.methodTabActive]}
            onPress={() => {
              setMethod('phone');
              setIdentifier('');
              setPassword('');
              setSmsCode('');
              setSmsCodeSent(false);
            }}
          >
            <Ionicons
              name="call"
              size={20}
              color={method === 'phone' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.methodTabText,
                method === 'phone' && styles.methodTabTextActive,
              ]}
            >
              Телефон
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodTab, method === 'email' && styles.methodTabActive]}
            onPress={() => {
              setMethod('email');
              setIdentifier('');
              setPassword('');
              setSmsCode('');
              setSmsCodeSent(false);
            }}
          >
            <Ionicons
              name="mail"
              size={20}
              color={method === 'email' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.methodTabText,
                method === 'email' && styles.methodTabTextActive,
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodTab, method === 'nickname' && styles.methodTabActive]}
            onPress={() => {
              setMethod('nickname');
              setIdentifier('');
              setPassword('');
              setSmsCode('');
              setSmsCodeSent(false);
            }}
          >
            <Ionicons
              name="person"
              size={20}
              color={method === 'nickname' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.methodTabText,
                method === 'nickname' && styles.methodTabTextActive,
              ]}
            >
              Никнейм
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {method === 'phone' && 'Телефон / Phone'}
              {method === 'email' && 'Email'}
              {method === 'nickname' && 'Никнейм / Nickname'}
            </Text>
            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Ionicons name={getInputIcon() as any} size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder={getPlaceholder()}
                  placeholderTextColor={colors.textSecondary}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType={
                    method === 'phone'
                      ? 'phone-pad'
                      : method === 'email'
                      ? 'email-address'
                      : 'default'
                  }
                  autoCapitalize="none"
                  editable={!smsCodeSent || method !== 'phone'}
                />
              </View>
              {method === 'phone' && (
                <TouchableOpacity
                  style={[styles.smsButton, smsCodeSent && styles.smsButtonSent]}
                  onPress={handleSendSMS}
                  disabled={loading || smsCodeSent}
                >
                  <Text style={styles.smsButtonText}>{smsCodeSent ? '✓' : 'SMS'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {method === 'phone' && smsCodeSent && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SMS-код</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Код из SMS"
                  placeholderTextColor={colors.textSecondary}
                  value={smsCode}
                  onChangeText={setSmsCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              {generatedCode && (
                <Text style={styles.hint}>Тестовый код: {generatedCode}</Text>
              )}
            </View>
          )}

          {(method === 'email' || method === 'nickname') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Пароль / Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Введите пароль"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.loginButtonText}>Войти</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/auth/method')}
          >
            <Text style={styles.registerLinkText}>Нет аккаунта? Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
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
    marginBottom: spacing.lg,
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  methodTabActive: {
    backgroundColor: colors.background,
  },
  methodTabText: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  methodTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    padding: spacing.md,
    fontSize: fonts.sizes.md,
    color: colors.text,
  },
  smsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsButtonSent: {
    backgroundColor: colors.success,
  },
  smsButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fonts.sizes.md,
  },
  hint: {
    fontSize: fonts.sizes.xs,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: colors.text,
    fontSize: fonts.sizes.md,
    fontWeight: 'bold',
  },
  registerLink: {
    alignItems: 'center',
    padding: spacing.md,
  },
  registerLinkText: {
    fontSize: fonts.sizes.sm,
    color: colors.primary,
  },
});
