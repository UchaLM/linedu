import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Fingerprint, LogOut } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';
import { BIOMETRIC_STATUS_MESSAGES } from '../services/biometrics';
import FeedbackBanner from './FeedbackBanner';

export default function SecuritySection() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { biometricEnabled, biometricStatus, setBiometricEnabled, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const available = biometricStatus === 'available';
  const hint = available
    ? 'Unlock the app with your fingerprint or face.'
    : BIOMETRIC_STATUS_MESSAGES[biometricStatus as Exclude<typeof biometricStatus, 'available'>];

  const toggle = async (enabled: boolean) => {
    setError(null);
    setBusy(true);
    const result = await setBiometricEnabled(enabled);
    setBusy(false);
    if (!result.ok && !result.cancelled) setError(result.reason);
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>SECURITY</Text>

      <View style={styles.card}>
        <View style={styles.iconBg}>
          <Fingerprint color={available ? colors.primary : colors.textMuted} size={24} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Biometric login</Text>
          <Text style={styles.desc}>{hint}</Text>
        </View>
        <Switch
          value={biometricEnabled}
          onValueChange={toggle}
          disabled={!available || busy}
          trackColor={{ false: colors.border, true: colors.primaryMedium }}
          thumbColor={biometricEnabled ? colors.primary : colors.textMuted}
        />
      </View>

      {error && (
        <View style={styles.error}>
          <FeedbackBanner type="error" message={error} />
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <LogOut color={colors.danger} size={18} />
        <Text style={styles.logoutText}>LOG OUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
    marginTop: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    marginTop: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
