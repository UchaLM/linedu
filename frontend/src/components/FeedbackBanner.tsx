import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export type FeedbackType = 'error' | 'success';

interface Props {
  type: FeedbackType;
  message: string;
}

export default function FeedbackBanner({ type, message }: Props) {
  const { colors } = useTheme();
  const tone =
    type === 'error'
      ? { color: colors.danger, background: colors.dangerSoft, Icon: AlertTriangle }
      : { color: colors.primary, background: colors.primarySoft, Icon: CheckCircle2 };

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { borderColor: tone.color, backgroundColor: tone.background }]}
    >
      <tone.Icon color={tone.color} size={18} />
      <Text style={[styles.text, { color: tone.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
});
