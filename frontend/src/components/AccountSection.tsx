import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import FeedbackBanner, { FeedbackType } from './FeedbackBanner';
import { AppButton, SectionTitle, TextField } from './ui';

const MIN_PASSWORD_LENGTH = 6;
const MAX_NAME_LENGTH = 60;

interface Props {
  name: string;
  email: string;
  onProfileChanged: () => void;
}

interface Notice {
  type: FeedbackType;
  message: string;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

/** Datos de la cuenta: ver, cambiar el nombre y cambiar la contraseña. */
export default function AccountSection({ name, email, onProfileChanged }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [newName, setNewName] = useState(name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameNotice, setNameNotice] = useState<Notice | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null);

  const saveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return setNameNotice({ type: 'error', message: 'Enter your name.' });
    if (trimmed.length > MAX_NAME_LENGTH) {
      return setNameNotice({ type: 'error', message: `Name can have at most ${MAX_NAME_LENGTH} characters.` });
    }

    setNameBusy(true);
    setNameNotice(null);
    try {
      await apiFetch('/users/me', { method: 'PUT', body: { name: trimmed } });
      setNameNotice({ type: 'success', message: 'Name updated.' });
      onProfileChanged();
    } catch (error) {
      setNameNotice({ type: 'error', message: errorText(error) });
    } finally {
      setNameBusy(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword) return setPasswordNotice({ type: 'error', message: 'Enter your current password.' });
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return setPasswordNotice({ type: 'error', message: `New password needs at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    setPasswordBusy(true);
    setPasswordNotice(null);
    try {
      await apiFetch('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordNotice({ type: 'success', message: 'Password updated.' });
    } catch (error) {
      setPasswordNotice({ type: 'error', message: errorText(error) });
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <View>
      <SectionTitle>ACCOUNT</SectionTitle>
      <View style={styles.card}>
        <Text style={styles.label}>EMAIL</Text>
        <Text style={styles.value}>{email}</Text>

        <Text style={[styles.label, styles.spaced]}>DISPLAY NAME</Text>
        <TextField value={newName} onChangeText={setNewName} autoCapitalize="words" maxLength={MAX_NAME_LENGTH} editable={!nameBusy} />
        {nameNotice && <FeedbackBanner type={nameNotice.type} message={nameNotice.message} />}
        <AppButton label="SAVE NAME" onPress={saveName} busy={nameBusy} disabled={newName.trim() === name} />
      </View>

      <View style={[styles.card, styles.spaced]}>
        <Text style={styles.label}>CHANGE PASSWORD</Text>
        <TextField placeholder="current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry editable={!passwordBusy} />
        <TextField placeholder="new password" value={newPassword} onChangeText={setNewPassword} secureTextEntry editable={!passwordBusy} />
        {passwordNotice && <FeedbackBanner type={passwordNotice.type} message={passwordNotice.message} />}
        <AppButton label="UPDATE PASSWORD" onPress={savePassword} busy={passwordBusy} tone="outline" />
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    spaced: {
      marginTop: 12,
    },
    label: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    value: {
      color: colors.text,
      fontSize: 15,
    },
  });
