import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import FeedbackBanner from './FeedbackBanner';
import { AppButton, TextField } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

interface Props {
  onBack: () => void;
  /** Se llama al terminar con éxito para que el login muestre el aviso. */
  onDone: (message: string) => void;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

/** Recuperar contraseña en dos pasos: 1) pedir el código por email, 2) ingresar código y contraseña nueva. */
export default function ForgotPassword({ onBack, onDone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const requestCode = async () => {
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email.');
    setError(null);
    setBusy(true);
    try {
      const { message } = await apiFetch<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      });
      setInfo(message);
      setStep('code');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setError('The code has 6 digits.');
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return setError(`New password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    setError(null);
    setBusy(true);
    try {
      const { message } = await apiFetch<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim(), newPassword },
      });
      onDone(message);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.sectionTitle}>{step === 'email' ? 'FORGOT PASSWORD' : 'ENTER THE CODE'}</Text>

      {error && <FeedbackBanner type="error" message={error} />}
      {info && step === 'code' && !error && <FeedbackBanner type="success" message={info} />}

      {step === 'email' ? (
        <>
          <Text style={styles.help}>We will email you a 6-digit code to reset your password.</Text>
          <TextField placeholder="email" value={email} onChangeText={setEmail} autoCorrect={false} keyboardType="email-address" editable={!busy} />
          <AppButton label="SEND CODE" onPress={requestCode} busy={busy} />
        </>
      ) : (
        <>
          <TextField placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} editable={!busy} />
          <TextField placeholder="new password" value={newPassword} onChangeText={setNewPassword} secureTextEntry editable={!busy} />
          <AppButton label="RESET PASSWORD" onPress={resetPassword} busy={busy} />
          <TouchableOpacity onPress={() => { setStep('email'); setError(null); }} disabled={busy}>
            <Text style={styles.link}>Send me a new code</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={onBack} disabled={busy} style={styles.backRow}>
        <Text style={styles.link}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    form: { gap: 14 },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    help: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    backRow: { alignItems: 'center', paddingVertical: 6 },
    link: { color: colors.primary, fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  });
