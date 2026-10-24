import React, { useEffect, useState, useMemo } from 'react';
import * as Linking from 'expo-linking';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { AUTH_BASE_URL, GOOGLE_CLIENT_IDS, isGoogleConfigured, usesBackendOAuth } from '../config/oauth';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  disabled?: boolean;
  /** Web / development build: access token de Google, el backend lo valida. */
  onToken: (accessToken: string) => void;
  /** Celular (flujo mediado por el backend): token de LINEDU ya emitido. */
  onSessionToken: (token: string) => void;
  onError: (message: string) => void;
}

const IN_EXPO_GO = Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const NOT_CONFIGURED = IN_EXPO_GO
  ? 'Google sign-in in Expo Go needs EXPO_PUBLIC_AUTH_URL (public https URL of the backend) in frontend/.env.'
  : 'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID in frontend/.env.';

function Button({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={[styles.btn, disabled && styles.btnDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.logo}>G</Text>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

// El hook de Google lanza error si falta el Client ID de la plataforma, por eso va en un componente aparte
// que solo se monta cuando OAuth está configurado.
function ConfiguredButton({ disabled, onToken, onError }: Props) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.authentication?.accessToken) {
      onToken(response.authentication.accessToken);
    } else if (response.type === 'error') {
      onError('Google sign-in failed. Try again.');
    }
    // onToken/onError cambian en cada render del padre; solo reaccionamos a la respuesta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <Button
      label="CONTINUE WITH GOOGLE"
      disabled={disabled || !request}
      onPress={() => {
        promptAsync().catch(() => onError('Could not open Google sign-in.'));
      }}
    />
  );
}

// En el celular el navegador visita el backend, que habla con Google y vuelve a la app por deep link.
function BackendButton({ disabled, onSessionToken, onError }: Props) {
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const appRedirect = Linking.createURL('auth');
      const startUrl = `${AUTH_BASE_URL}/api/auth/google/start?app_redirect=${encodeURIComponent(appRedirect)}`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, appRedirect);
      if (result.type !== 'success') return; // el usuario cerró la ventana

      const { queryParams } = Linking.parse(result.url);
      if (typeof queryParams?.token === 'string') onSessionToken(queryParams.token);
      else onError(typeof queryParams?.error === 'string' ? queryParams.error : 'Google sign-in failed.');
    } catch {
      onError('Could not open Google sign-in.');
    } finally {
      setBusy(false);
    }
  };

  return <Button label="CONTINUE WITH GOOGLE" disabled={disabled || busy} onPress={start} />;
}

export default function GoogleSignInButton(props: Props) {
  if (usesBackendOAuth()) return <BackendButton {...props} />;
  if (!isGoogleConfigured()) {
    return <Button label="CONTINUE WITH GOOGLE" disabled={props.disabled} onPress={() => props.onError(NOT_CONFIGURED)} />;
  }
  return <ConfiguredButton {...props} />;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  logo: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  text: {
    color: colors.text,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontSize: 13,
  },
});
