import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

/** Campo de texto con el estilo de la app. */
export function TextField(props: TextInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <TextInput placeholderTextColor={colors.textMuted} autoCapitalize="none" {...props} style={[styles.input, props.style]} />;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** primary: relleno verde · outline: borde · danger: borde rojo */
  tone?: 'primary' | 'outline' | 'danger';
}

export function AppButton({ label, onPress, busy, disabled, tone = 'primary' }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toneStyle = tone === 'primary' ? styles.btnPrimary : tone === 'danger' ? styles.btnDanger : styles.btnOutline;
  const textColor = tone === 'primary' ? colors.onPrimary : tone === 'danger' ? colors.danger : colors.text;

  return (
    <TouchableOpacity
      style={[styles.btn, toneStyle, (busy || disabled) && styles.btnDisabled]}
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
    >
      {busy ? <ActivityIndicator color={textColor} /> : <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      color: colors.text,
      fontFamily: 'monospace',
      fontSize: 15,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    btn: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    btnOutline: { backgroundColor: colors.card, borderColor: colors.border },
    btnDanger: { backgroundColor: 'transparent', borderColor: colors.danger },
    btnDisabled: { opacity: 0.5 },
    btnText: { fontWeight: 'bold', letterSpacing: 1 },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
      marginBottom: 15,
      marginTop: 10,
    },
  });
