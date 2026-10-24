import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { ThemeMode, useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'system', label: 'System', Icon: Smartphone },
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
];

export default function ThemeSelector() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      <Text style={styles.sectionTitle}>APPEARANCE</Text>
      <View style={styles.row}>
        {OPTIONS.map(({ mode: option, label, Icon }) => {
          const active = option === mode;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setMode(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Icon color={active ? colors.primary : colors.textMuted} size={18} />
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
      marginBottom: 15,
      marginTop: 10,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: 'bold',
    },
    optionTextActive: {
      color: colors.primary,
    },
  });
