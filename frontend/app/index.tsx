import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

// Этот экран используется только как заглушка
// Реальная навигация происходит в _layout.tsx
export default function IndexScreen() {

  const handleContinue = async () => {
    if (!nickname.trim()) return;

    setLoading(true);
    try {
      console.log('Creating user with nickname:', nickname.trim());
      const userData = await api.createUser(nickname.trim());
      console.log('User created successfully:', userData);
      await setUser(userData);
      console.log('User saved to store, navigating to chats...');
      router.replace('/chats');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Ошибка подключения. Попробуйте еще раз.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.logo}>キリネット</Text>
          <Text style={styles.logoSub}>KiriNet</Text>
          <View style={styles.glowLine} />
        </Animated.View>

        <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
          <Text style={styles.label}>ニックネーム / Nickname</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your nickname"
              placeholderTextColor={colors.textSecondary}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              !nickname.trim() && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!nickname.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>接続 / Connect</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  logo: {
    fontSize: fonts.sizes.xxl * 1.5,
    fontWeight: 'bold',
    color: colors.primary,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: fonts.sizes.lg,
    color: colors.secondary,
    marginTop: spacing.sm,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  glowLine: {
    width: 100,
    height: 2,
    backgroundColor: colors.secondary,
    marginTop: spacing.md,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  input: {
    padding: spacing.md,
    fontSize: fonts.sizes.md,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
  },
  buttonText: {
    color: colors.text,
    fontSize: fonts.sizes.md,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
