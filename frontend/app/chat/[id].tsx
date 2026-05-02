import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useUserStore } from '../../stores/userStore';
import { borderRadius, colors, fonts, spacing } from '../../constants/theme';

type MessageStatus = 'sending' | 'sent' | 'failed';

type ChatMessage = {
  id: string;
  client_id?: string;
  conversation_id: string;
  sender_id: string;
  sender_nickname: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
};

const createClientId = (): string => {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  // UUID v4 fallback for runtimes without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const getMessageDate = (timestamp?: string): number => {
  if (!timestamp) {
    return 0;
  }

  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) ? value : 0;
};

const normalizeMessage = (raw: any): ChatMessage => ({
  id:
    typeof raw?.id === 'string' && raw.id.length > 0
      ? raw.id
      : `local-${raw?.client_id ?? createClientId()}`,
  client_id: raw?.client_id,
  conversation_id: raw?.conversation_id ?? '',
  sender_id: raw?.sender_id ?? '',
  sender_nickname: raw?.sender_nickname ?? '',
  content: raw?.content ?? '',
  timestamp:
    typeof raw?.timestamp === 'string' && raw.timestamp.length > 0
      ? raw.timestamp
      : new Date().toISOString(),
  status:
    raw?.status === 'sending' || raw?.status === 'failed' ? raw.status : 'sent',
});

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, getAccessToken } = useUserStore();

  const conversationId = (params.id as string) || '';
  const conversationName = (params.name as string) || 'Chat';
  const conversationType = (params.type as string) || 'direct';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [socketConnected, setSocketConnected] = useState(socketService.isConnected());

  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = (animated: boolean) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  const upsertMessage = (rawMessage: any) => {
    const nextMessage = normalizeMessage(rawMessage);

    setMessages((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          (nextMessage.client_id &&
            item.client_id &&
            item.client_id === nextMessage.client_id) ||
          item.id === nextMessage.id
      );

      if (existingIndex === -1) {
        return [...prev, nextMessage].sort(
          (a, b) => getMessageDate(a.timestamp) - getMessageDate(b.timestamp)
        );
      }

      const merged = {
        ...prev[existingIndex],
        ...nextMessage,
      };

      const updated = [...prev];
      updated[existingIndex] = merged;

      return updated.sort(
        (a, b) => getMessageDate(a.timestamp) - getMessageDate(b.timestamp)
      );
    });
  };

  const setMessageStatus = (clientId: string, status: MessageStatus) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.client_id === clientId ? { ...message, status } : message
      )
    );
  };

  const loadMessages = async () => {
    if (!user || !conversationId) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      const raw = await api.getMessages(token, conversationId);
      const serverMessages: ChatMessage[] = raw.map((message: any) =>
        normalizeMessage({ ...message, status: 'sent' })
      );

      setMessages((prev) => {
        const localPending = prev.filter(
          (item) =>
            item.status !== 'sent' &&
            !serverMessages.some(
              (serverItem: ChatMessage) =>
                (item.client_id &&
                  serverItem.client_id &&
                  item.client_id === serverItem.client_id) ||
                item.id === serverItem.id
            )
        );

        return [...serverMessages, ...localPending].sort(
          (a, b) => getMessageDate(a.timestamp) - getMessageDate(b.timestamp)
        );
      });

      scrollToBottom(false);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    socketService.connect(user.id);
    loadMessages();

    const unsubscribeMessages = socketService.onNewMessage((message: any) => {
      if (message.conversation_id !== conversationId) {
        return;
      }

      upsertMessage({ ...message, status: 'sent' });
      scrollToBottom(true);
    });

    const unsubscribeConnection = socketService.onConnectionChange(
      (connected: boolean) => {
        setSocketConnected(connected);
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeConnection();
    };
  }, [conversationId, user]);

  const sendMessageWithClientId = async (message: ChatMessage) => {
    if (!user) {
      throw new Error('User not found');
    }

    const token = getAccessToken();
    if (!token) {
      throw new Error('Missing access token');
    }

    const saved = await api.createMessage(token, {
      client_id: message.client_id || createClientId(),
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_nickname: message.sender_nickname,
      content: message.content,
    });

    upsertMessage({ ...saved, status: 'sent' });
  };

  const handleSendMessage = async () => {
    if (!user || !conversationId || !inputText.trim()) return;

    const content = inputText.trim();
    const clientId = createClientId();
    const optimisticMessage: ChatMessage = {
      id: `local-${clientId}`,
      client_id: clientId,
      conversation_id: conversationId,
      sender_id: user.id,
      sender_nickname: user.nickname,
      content,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setInputText('');
    Keyboard.dismiss();
    upsertMessage(optimisticMessage);
    scrollToBottom(true);

    try {
      await sendMessageWithClientId(optimisticMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageStatus(clientId, 'failed');
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      alert(message);
    }
  };

  const handleRetryMessage = async (message: ChatMessage) => {
    if (!message.client_id) {
      return;
    }

    setMessageStatus(message.client_id, 'sending');

    try {
      await sendMessageWithClientId(message);
    } catch (error) {
      console.error('Retry failed:', error);
      setMessageStatus(message.client_id, 'failed');
      const messageText =
        error instanceof Error ? error.message : 'Retry failed';
      alert(messageText);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOwnStatus = (item: ChatMessage) => {
    if (item.status === 'sent') {
      return null;
    }

    if (item.status === 'sending') {
      return <Text style={styles.statusSending}>sending</Text>;
    }

    return (
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => handleRetryMessage(item)}
      >
        <Ionicons name="refresh" size={12} color={colors.error} />
        <Text style={styles.statusFailed}>retry</Text>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && conversationType === 'global' && (
          <Text style={styles.senderName}>{item.sender_nickname}</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
        <View style={styles.messageMeta}>
          <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
          {isOwnMessage && renderOwnStatus(item)}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{conversationName}</Text>
          {conversationType === 'global' && (
            <Text style={styles.headerSubtitle}>Global chat</Text>
          )}
        </View>
      </View>

      {!socketConnected && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionBannerText}>Reconnecting...</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.client_id || item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => scrollToBottom(true)}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? colors.text : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: spacing.xl + 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  connectionBanner: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warning,
  },
  connectionBannerText: {
    color: colors.background,
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
  },
  messagesList: {
    padding: spacing.md,
  },
  messageContainer: {
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: fonts.sizes.xs,
    color: colors.secondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fonts.sizes.md,
  },
  ownMessageText: {
    color: colors.text,
  },
  otherMessageText: {
    color: colors.text,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  messageTime: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
  },
  statusSending: {
    fontSize: fonts.sizes.xs,
    color: colors.warning,
  },
  statusFailed: {
    fontSize: fonts.sizes.xs,
    color: colors.error,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fonts.sizes.md,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    marginLeft: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
});
