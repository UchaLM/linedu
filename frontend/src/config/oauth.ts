import { Platform } from 'react-native';

// Client IDs de Google OAuth (Google Cloud Console → Credenciales → ID de cliente OAuth).
// Se definen en frontend/.env (ver .env.example), por ejemplo: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
export const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

// URL https pública del backend (túnel o deploy). Con ella el celular puede iniciar sesión con Google
// sin development build: el backend hace de intermediario con Google (ver backend/oauth.controller.ts).
export const AUTH_BASE_URL = process.env.EXPO_PUBLIC_AUTH_URL?.replace(/\/$/, '');

/** En celular se usa el flujo mediado por el backend cuando hay una URL pública configurada. */
export const usesBackendOAuth = (): boolean => Platform.OS !== 'web' && Boolean(AUTH_BASE_URL);

/** true si hay un Client ID para la plataforma actual. */
export const isGoogleConfigured = (): boolean => {
  const id = Platform.select({
    web: GOOGLE_CLIENT_IDS.web,
    android: GOOGLE_CLIENT_IDS.android,
    ios: GOOGLE_CLIENT_IDS.ios,
  });
  return Boolean(id);
};
