import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';
import FeedbackBanner from '../components/FeedbackBanner';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ForgotPassword from '../components/ForgotPassword';

type Mode = 'login' | 'register' | 'forgot';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { status, signIn, signUp, signInWithGoogle, signInWithToken, unlockWithBiometrics } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePassword, setUsePassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const locked = status === 'locked' && !usePassword;

  const unlock = useCallback(async () => {
    setError(null);
    setBusy(true);
    const result = await unlockWithBiometrics();
    // Si salió bien el estado pasa a signedIn y esta pantalla se desmonta.
    if (!result.ok) {
      setBusy(false);
      if (!result.cancelled) setError(result.reason);
    }
  }, [unlockWithBiometrics]);

  // Con la sesión bloqueada por biometría se pide el desbloqueo apenas aparece la pantalla.
  useEffect(() => {
    if (status === 'locked') unlock();
  }, [status, unlock]);

  const validate = (): string | null => {
    if (mode === 'register' && !name.trim()) return 'Enter your name.';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email.';
    if (!password) return 'Enter your password.';
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) return setError(problem);

    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const handleGoogleToken = async (token: string, isSessionToken = false) => {
    setError(null);
    setBusy(true);
    try {
      if (isSessionToken) await signInWithToken(token);
      else await signInWithGoogle(token);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  const isRegister = mode === 'register';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.brandPrompt}>$_</Text>
            <Text style={styles.brandName}>LINEDU</Text>
            <Text style={styles.brandSub}>learn the command line, one block at a time</Text>
          </View>

          {error && <FeedbackBanner type="error" message={error} />}
          {notice && !error && <FeedbackBanner type="success" message={notice} />}

          {locked ? (
            <View style={styles.lockedBox}>
              <TouchableOpacity style={styles.fingerprintBtn} onPress={unlock} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.primary} /> : <Fingerprint color={colors.primary} size={40} />}
              </TouchableOpacity>
              <Text style={styles.lockedText}>Unlock with biometrics</Text>
              <TouchableOpacity onPress={() => { setUsePassword(true); setError(null); }}>
                <Text style={styles.link}>Use password instead</Text>
              </TouchableOpacity>
            </View>
          ) : mode === 'forgot' ? (
            <ForgotPassword
              onBack={() => setMode('login')}
              onDone={(message) => {
                setNotice(message);
                setPassword('');
                setMode('login');
              }}
            />
          ) : (
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>{isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>

              {isRegister && (
                <TextInput
                  style={styles.input}
                  placeholder="name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!busy}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!busy}
              />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!busy}
              />

              {!isRegister && (
                <TouchableOpacity onPress={() => { setMode('forgot'); setError(null); setNotice(null); }} disabled={busy}>
                  <Text style={styles.forgot}>Forgot your password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.submitBtn, busy && styles.submitBtnBusy]} onPress={submit} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.submitText}>{isRegister ? 'CREATE ACCOUNT' : 'LOG IN'}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton
                disabled={busy}
                onToken={(t) => handleGoogleToken(t)}
                onSessionToken={(t) => handleGoogleToken(t, true)}
                onError={setError}
              />

              <TouchableOpacity onPress={switchMode} disabled={busy} style={styles.switchRow}>
                <Text style={styles.switchText}>
                  {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                  <Text style={styles.link}>{isRegister ? 'Log in' : 'Sign up'}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 30,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 10,
  },
  brandPrompt: {
    color: colors.primary,
    fontFamily: 'monospace',
    fontSize: 40,
    fontWeight: 'bold',
  },
  brandName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginTop: 4,
  },
  brandSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  form: {
    gap: 14,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnBusy: {
    opacity: 0.7,
  },
  submitText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switchRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  forgot: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
  },
  link: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  lockedBox: {
    alignItems: 'center',
    gap: 16,
  },
  fingerprintBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: colors.text,
    fontSize: 16,
  },
});
