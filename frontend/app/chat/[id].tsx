import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../stores/userStore';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { colors, spacing, borderRadius, fonts } from '../../constants/theme';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useUserStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const conversationId = params.id as string;
  const conversationName = params.name as string;
  const conversationType = params.type as string;

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    loadMessages();
    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, [conversationId]);

  const setupSocketListeners = () => {
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
  };

  const cleanup = () => {
    socketService.removeListener('new_message', handleNewMessage);
    socketService.removeListener('user_typing', handleUserTyping);
  };

  const handleNewMessage = (message: any) => {
    if (message.conversation_id === conversationId) {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleUserTyping = (data: any) => {
    if (data.conversation_id === conversationId && data.user_id !== user?.id) {
      setTypingUser(data.nickname);
      setIsTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTypingUser('');
      }, 3000);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(conversationId);
      setMessages(data);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user) return;

    const messageData = {
      conversation_id: conversationId,
      sender_id: user.id,
      sender_nickname: user.nickname,
      content: inputText.trim(),
    };

    try {
      // Отправляем через REST API (надежнее чем WebSocket в данной среде)
      const newMessage = await api.createMessage(messageData);
      
      // Добавляем сообщение в список локально
      setMessages((prev) => [...prev, newMessage]);
      
      // Также пытаемся отправить через WebSocket для real-time если подключен
      if (socketService.isConnected()) {
        socketService.sendMessage(messageData);
      }
      
      setInputText('');
      Keyboard.dismiss();
      
      // Прокручиваем вниз
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Ошибка отправки сообщения. Попробуйте снова.');
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    
    if (text.trim() && user) {
      socketService.sendTyping({
        conversation_id: conversationId,
        user_id: user.id,
        nickname: user.nickname,
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: any) => {
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
        <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{conversationName}</Text>
          {conversationType === 'global' && (
            <Text style={styles.headerSubtitle}>グローバルチャット</Text>
          )}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {typingUser} が入力中...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="メッセージ... / Message..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
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
  messageTime: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  typingContainer: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  typingText: {
    fontSize: fonts.sizes.xs,
    color: colors.secondary,
    fontStyle: 'italic',
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
