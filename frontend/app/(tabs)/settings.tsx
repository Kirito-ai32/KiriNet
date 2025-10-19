import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../stores/userStore';
import { colors, spacing, borderRadius, fonts } from '../../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'ログアウト / Logout',
      '本当にログアウトしますか？ / Are you sure you want to logout?',
      [
        {
          text: 'キャンセル / Cancel',
          style: 'cancel',
        },
        {
          text: 'ログアウト / Logout',
          style: 'destructive',
          onPress: async () => {
            await clearUser();
            router.replace('/');
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    type = 'switch',
    onPress,
  }: any) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={type === 'switch'}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.text}
        />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
        <Text style={styles.headerSubtitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.text} />
          </View>
          <Text style={styles.nickname}>{user?.nickname}</Text>
          <Text style={styles.userId}>ID: {user?.id.slice(0, 8)}...</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知 / Notifications</Text>
        <SettingItem
          icon="notifications"
          title="プッシュ通知 / Push Notifications"
          subtitle="新しいメッセージの通知"
          value={notifications}
          onValueChange={setNotifications}
        />
        <SettingItem
          icon="volume-high"
          title="サウンド / Sound"
          subtitle="メッセージ音を有効にする"
          value={soundEnabled}
          onValueChange={setSoundEnabled}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>外観 / Appearance</Text>
        <SettingItem
          icon="moon"
          title="ダークモード / Dark Mode"
          subtitle="サイバーパンクテーマ"
          value={darkMode}
          onValueChange={setDarkMode}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>情報 / Information</Text>
        <SettingItem
          icon="information-circle"
          title="バージョン / Version"
          subtitle="KiriNet v1.0.0"
          type="button"
        />
        <SettingItem
          icon="document-text"
          title="利用規約 / Terms of Service"
          type="button"
        />
        <SettingItem
          icon="shield-checkmark"
          title="プライバシー / Privacy Policy"
          type="button"
        />
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.error} />
          <Text style={styles.logoutText}>ログアウト / Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>キリネット / KiriNet</Text>
        <Text style={styles.footerSubtext}>日本のサイバーパンクメッセンジャー</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl + 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  nickname: {
    fontSize: fonts.sizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userId: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fonts.sizes.md,
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    fontSize: fonts.sizes.md,
    color: colors.error,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: fonts.sizes.lg,
    color: colors.primary,
    fontWeight: 'bold',
  },
  footerSubtext: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
