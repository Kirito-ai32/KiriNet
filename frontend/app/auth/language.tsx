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

export default function LanguageScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLanguageSelect = (language: string) => {
    console.log('Selected language:', language);
    router.push('/auth/method');
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.logo}>KiriNet</Text>
          <Text style={styles.logoSub}>Messenger</Text>
          <View style={styles.glowLine} />
        </View>

        <Text style={styles.title}>Выберите язык / Choose language</Text>

        <View style={styles.languageButtons}>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => handleLanguageSelect('ru')}
          >
            <Text style={styles.languageCode}>RU</Text>
            <Text style={styles.languageText}>Русский</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => handleLanguageSelect('en')}
          >
            <Text style={styles.languageCode}>EN</Text>
            <Text style={styles.languageText}>English</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => handleLanguageSelect('system')}
          >
            <Text style={styles.languageCode}>SYS</Text>
            <Text style={styles.languageText}>Системный / System</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
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
    letterSpacing: 2,
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
  title: {
    fontSize: fonts.sizes.lg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  languageButtons: {
    gap: spacing.md,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageCode: {
    width: 48,
    textAlign: 'center',
    fontSize: fonts.sizes.md,
    color: colors.primary,
    fontWeight: '700',
    marginRight: spacing.md,
  },
  languageText: {
    flex: 1,
    fontSize: fonts.sizes.md,
    color: colors.text,
    fontWeight: '600',
  },
});
