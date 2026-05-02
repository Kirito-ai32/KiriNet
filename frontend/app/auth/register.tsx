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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../stores/userStore';
import * as api from '../../services/api';
import { borderRadius, colors, fonts, spacing } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setUserAndTokens } = useUserStore();

  const method = (params.method as 'phone' | 'email' | 'nickname') || 'nickname';

  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleSendSMS = async () => {
    if (!phone.trim()) {
      Alert.alert('Ошибка', 'Введите номер телефона');
      return;
    }

    setLoading(true);
    try {
      const response = await api.sendSMS(phone);
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

  const handleRegister = async () => {
    if (!nickname.trim()) {
      Alert.alert('Ошибка', 'Введите никнейм');
      return;
    }

    if (method === 'phone') {
      if (!phone.trim()) {
        Alert.alert('Ошибка', 'Введите номер телефона');
        return;
      }
      if (!smsCode.trim()) {
        Alert.alert('Ошибка', 'Введите SMS-код');
        return;
      }
    }

    if (method === 'email') {
      if (!email.trim()) {
        Alert.alert('Ошибка', 'Введите email');
        return;
      }
      if (!password.trim()) {
        Alert.alert('Ошибка', 'Введите пароль');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Ошибка', 'Пароли не совпадают');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
        return;
      }
    }

    if (method === 'nickname') {
      if (!password.trim()) {
        Alert.alert('Ошибка', 'Введите пароль');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Ошибка', 'Пароли не совпадают');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
        return;
      }
    }

    setLoading(true);
    try {
      const registerData: any = {
        auth_method: method,
        nickname: nickname.trim(),
      };

      if (method === 'phone') {
        registerData.phone = phone.trim();
        registerData.sms_code = smsCode.trim();
      } else if (method === 'email') {
        registerData.email = email.trim();
        registerData.password = password;
      } else {
        registerData.password = password;
      }

      const tokens = await api.register(registerData);
      const userProfile = await api.getProfile(tokens.access_token);
      await setUserAndTokens(userProfile, tokens);
      router.replace('/(tabs)/chats');
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Ошибка регистрации', error.message || 'Попробуйте еще раз');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = () => {
    switch (method) {
      case 'phone':
        return 'call';
      case 'email':
        return 'mail';
      case 'nickname':
        return 'person';
      default:
        return 'person';
    }
  };

  const getMethodTitle = () => {
    switch (method) {
      case 'phone':
        return 'Регистрация по телефону';
      case 'email':
        return 'Регистрация по email';
      case 'nickname':
        return 'Регистрация по никнейму';
      default:
        return 'Регистрация';
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
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name={getMethodIcon() as any} size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>{getMethodTitle()}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Никнейм / Nickname</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Введите никнейм"
                placeholderTextColor={colors.textSecondary}
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
                maxLength={20}
              />
            </View>
          </View>

          {method === 'phone' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Телефон / Phone</Text>
                <View style={styles.inputRow}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="+380XXXXXXXXX"
                      placeholderTextColor={colors.textSecondary}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      editable={!smsCodeSent}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.smsButton, smsCodeSent && styles.smsButtonSent]}
                    onPress={handleSendSMS}
                    disabled={loading || smsCodeSent}
                  >
                    <Text style={styles.smsButtonText}>{smsCodeSent ? '✓' : 'SMS'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {smsCodeSent && (
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
            </>
          )}

          {method === 'email' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@email.com"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Пароль / Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Минимум 6 символов"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Подтвердите пароль</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Повторите пароль"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>
            </>
          )}

          {method === 'nickname' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Пароль / Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Минимум 6 символов"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Подтвердите пароль</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Повторите пароль"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginLinkText}>Уже есть аккаунт? Войти</Text>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.sizes.xl,
    color: colors.text,
    fontWeight: 'bold',
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
  registerButton: {
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
  registerButtonText: {
    color: colors.text,
    fontSize: fonts.sizes.md,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    padding: spacing.md,
  },
  loginLinkText: {
    fontSize: fonts.sizes.sm,
    color: colors.primary,
  },
});
