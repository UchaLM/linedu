import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, RotateCcw, Send, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { apiFetch } from '../services/api';
import FeedbackBanner from './FeedbackBanner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Mensaje local (bienvenida): no se envía al servidor. */
  local?: boolean;
}

const MAX_HISTORY = 12;
const SUGGESTIONS = ['What does chmod do?', 'How do I move a file?', 'Explain the -i flag'];

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  local: true,
  content: "Hi! I'm your LINEDU assistant. Ask me about any command, flag or challenge.",
};

let nextId = 0;
const newId = () => `m${++nextId}`;

/** Burbuja "pensando": tres barras que pulsan mientras llega la respuesta. */
function ThinkingSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.bubble, styles.assistantBubble, styles.skeleton]}>
      {[160, 120, 80].map((width) => (
        <Animated.View key={width} style={[styles.skeletonBar, { width, opacity: pulse }]} />
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AssistantModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  const requestReply = async (history: ChatMessage[]) => {
    setError(null);
    setLoading(true);
    scrollToEnd();
    try {
      const payload = history
        .filter((m) => !m.local)
        .slice(-MAX_HISTORY)
        .map(({ role, content }) => ({ role, content }));
      const { reply } = await apiFetch<{ reply: string }>('/assistant/chat', {
        method: 'POST',
        body: { messages: payload },
      });
      setMessages([...history, { id: newId(), role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The assistant could not answer.');
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const history = [...messages, { id: newId(), role: 'user' as const, content }];
    setMessages(history);
    setInput('');
    requestReply(history);
  };

  const retry = () => requestReply(messages);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Bot color={colors.primary} size={20} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.headerSub}>AI ASSISTANT</Text>
            <Text style={styles.headerTitle}>Ask anything about the shell</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close assistant">
            <X color={colors.text} size={20} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={listRef}
            style={styles.flex}
            contentContainerStyle={styles.list}
            data={messages}
            keyExtractor={(m) => m.id}
            onContentSizeChange={scrollToEnd}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={item.role === 'user' ? styles.userText : styles.assistantText}>{item.content}</Text>
              </View>
            )}
            ListFooterComponent={
              <View style={styles.footer}>
                {messages.length === 1 && !loading && (
                  <View style={styles.suggestions}>
                    {SUGGESTIONS.map((s) => (
                      <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
                        <Text style={styles.chipText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {loading && <ThinkingSkeleton />}
                {error && (
                  <View style={styles.errorBox}>
                    <FeedbackBanner type="error" message={error} />
                    <TouchableOpacity style={styles.retryBtn} onPress={retry} disabled={loading}>
                      <RotateCcw color={colors.text} size={14} />
                      <Text style={styles.retryText}>RETRY</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            }
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="ask about a command..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              editable={!loading}
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
              accessibilityLabel="Send message"
            >
              <Send color={colors.onPrimary} size={18} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitles: { flex: 1 },
  headerSub: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 12,
    paddingBottom: 12,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: colors.onPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  skeleton: {
    gap: 8,
    paddingVertical: 16,
  },
  skeletonBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cardLight,
  },
  footer: {
    gap: 12,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.blockBorder,
    backgroundColor: colors.blockBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  errorBox: {
    gap: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
