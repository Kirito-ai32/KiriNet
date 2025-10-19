import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../stores/userStore';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { colors, spacing, borderRadius, fonts } from '../../constants/theme';

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    loadData();
    connectSocket();

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const connectSocket = () => {
    if (user) {
      socketService.connect(user.id);

      socketService.onNewMessage((message: any) => {
        loadConversations();
      });

      socketService.onUserStatus((data: any) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.user_id ? { ...u, is_online: data.is_online } : u
          )
        );
      });
    }
  };

  const loadData = async () => {
    await Promise.all([loadConversations(), loadUsers()]);
    setLoading(false);
  };

  const loadConversations = async () => {
    if (!user) return;
    try {
      const data = await api.getConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.filter((u: any) => u.id !== user?.id));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: any) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conversation.id,
        name: conversation.name || conversation.other_user?.nickname || 'チャット',
        type: conversation.type,
      },
    });
  };

  const handleUserPress = async (selectedUser: any) => {
    if (!user) return;

    // Check if conversation already exists
    const existing = conversations.find(
      (c) =>
        c.type === 'direct' &&
        c.participants.includes(user.id) &&
        c.participants.includes(selectedUser.id)
    );

    if (existing) {
      handleConversationPress(existing);
    } else {
      // Create new conversation
      try {
        const newConv = await api.createConversation({
          type: 'direct',
          participants: [user.id, selectedUser.id],
        });
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: newConv.id,
            name: selectedUser.nickname,
            type: 'direct',
          },
        });
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return '今';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const renderConversation = ({ item }: any) => {
    const isGlobal = item.type === 'global';
    const displayName = isGlobal
      ? item.name
      : item.other_user?.nickname || 'ユーザー';
    const isOnline = isGlobal || item.other_user?.is_online;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isGlobal && styles.avatarGlobal]}>
            <Ionicons
              name={isGlobal ? 'globe' : 'person'}
              size={24}
              color={colors.text}
            />
          </View>
          {!isGlobal && (
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? colors.online : colors.offline },
              ]}
            />
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName}>{displayName}</Text>
            {item.last_message_time && (
              <Text style={styles.conversationTime}>
                {formatTime(item.last_message_time)}
              </Text>
            )}
          </View>
          {item.last_message && (
            <Text style={styles.conversationMessage} numberOfLines={1}>
              {item.last_message}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }: any) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatarSmall}>
          <Ionicons name="person" size={20} color={colors.text} />
        </View>
        <View
          style={[
            styles.statusDotSmall,
            { backgroundColor: item.is_online ? colors.online : colors.offline },
          ]}
        />
      </View>
      <Text style={styles.userName}>{item.nickname}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>キリネット</Text>
        <Text style={styles.headerSubtitle}>KiriNet Messenger</Text>
      </View>

      {users.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>オンラインユーザー / Online Users</Text>
          <FlatList
            horizontal
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.usersList}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>会話 / Conversations</Text>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>会話がありません</Text>
              <Text style={styles.emptySubtext}>No conversations yet</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
  },
  sectionTitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  usersList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  userItem: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDotSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: colors.background,
  },
  userName: {
    fontSize: fonts.sizes.xs,
    color: colors.text,
    marginTop: spacing.xs,
    maxWidth: 60,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarGlobal: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  conversationName: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  conversationTime: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
  },
  conversationMessage: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: fonts.sizes.md,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
