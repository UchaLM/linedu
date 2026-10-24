import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, ApiError, setAuthToken } from '../services/api';
import { getItem, setItem, removeItem } from '../services/storage';
import { unregisterPush } from '../services/pushNotifications';
import {
  authenticateWithBiometrics,
  getBiometricStatus,
  BiometricResult,
  BiometricStatus,
} from '../services/biometrics';

const TOKEN_KEY = 'linedu.token';
const BIOMETRIC_KEY = 'linedu.biometric';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  xp: number;
  level: number;
  title: string;
  streak: number;
}

interface Session {
  token: string;
  user: AuthUser;
}

/** loading: arrancando · signedOut: pedir login · locked: hay sesión guardada protegida por biometría · signedIn */
export type AuthStatus = 'loading' | 'signedOut' | 'locked' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  biometricEnabled: boolean;
  biometricStatus: BiometricStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: (accessToken: string) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<BiometricResult>;
  setBiometricEnabled: (enabled: boolean) => Promise<BiometricResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>('unsupported');
  const storedToken = useRef<string | null>(null);

  const startSession = useCallback(async ({ token, user: sessionUser }: Session) => {
    setAuthToken(token);
    storedToken.current = token;
    await setItem(TOKEN_KEY, token);
    setUser(sessionUser);
    setStatus('signedIn');
  }, []);

  /** Valida el token guardado contra el servidor. Devuelve false si ya no sirve o no hay red. */
  const restoreSession = useCallback(async (token: string): Promise<boolean> => {
    setAuthToken(token);
    try {
      const { user: restored } = await apiFetch<{ user: AuthUser }>('/auth/profile');
      setUser(restored);
      setStatus('signedIn');
      return true;
    } catch (error) {
      setAuthToken(null);
      if (error instanceof ApiError && error.status === 401) {
        storedToken.current = null;
        await removeItem(TOKEN_KEY);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [token, bioFlag, bioStatus] = await Promise.all([
        getItem(TOKEN_KEY),
        getItem(BIOMETRIC_KEY),
        getBiometricStatus(),
      ]);
      if (cancelled) return;

      setBiometricStatus(bioStatus);
      const bioEnabled = bioFlag === '1';

      // Si el usuario borró sus huellas/rostro, la protección biométrica ya no es válida: se pide login de nuevo.
      if (bioEnabled && bioStatus !== 'available') {
        await Promise.all([removeItem(BIOMETRIC_KEY), removeItem(TOKEN_KEY)]);
        if (cancelled) return;
        setBiometricEnabledState(false);
        setStatus('signedOut');
        return;
      }

      setBiometricEnabledState(bioEnabled);
      storedToken.current = token;

      if (!token) setStatus('signedOut');
      else if (bioEnabled) setStatus('locked');
      else if (!(await restoreSession(token)) && !cancelled) setStatus('signedOut');
    })();

    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await startSession(await apiFetch<Session>('/auth/login', { method: 'POST', body: { email, password } }));
    },
    [startSession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await startSession(await apiFetch<Session>('/auth/register', { method: 'POST', body: { name, email, password } }));
    },
    [startSession],
  );

  const signInWithGoogle = useCallback(
    async (accessToken: string) => {
      await startSession(await apiFetch<Session>('/auth/google', { method: 'POST', body: { accessToken } }));
    },
    [startSession],
  );

  /** Inicia sesión con un token de LINEDU ya emitido por el backend (flujo OAuth mediado). */
  const signInWithToken = useCallback(
    async (token: string) => {
      setAuthToken(token);
      try {
        const { user: sessionUser } = await apiFetch<{ user: AuthUser }>('/auth/profile');
        await startSession({ token, user: sessionUser });
      } catch (error) {
        setAuthToken(null);
        throw error;
      }
    },
    [startSession],
  );

  const unlockWithBiometrics = useCallback(async (): Promise<BiometricResult> => {
    const result = await authenticateWithBiometrics('Unlock LINEDU');
    if (!result.ok) return result;

    const token = storedToken.current;
    if (!token || !(await restoreSession(token))) {
      return { ok: false, reason: 'Could not restore your session. Sign in with your password.', cancelled: false };
    }
    return { ok: true };
  }, [restoreSession]);

  const setBiometricEnabled = useCallback(async (enabled: boolean): Promise<BiometricResult> => {
    if (!enabled) {
      await removeItem(BIOMETRIC_KEY);
      setBiometricEnabledState(false);
      return { ok: true };
    }

    const result = await authenticateWithBiometrics('Confirm to enable biometric login');
    if (!result.ok) return result;

    await setItem(BIOMETRIC_KEY, '1');
    setBiometricEnabledState(true);
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await unregisterPush(); // todavía con el token: sin él el backend no sabe de qué cuenta quitar el dispositivo
    setAuthToken(null);
    storedToken.current = null;
    await Promise.all([removeItem(TOKEN_KEY), removeItem(BIOMETRIC_KEY)]);
    setBiometricEnabledState(false);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      biometricEnabled,
      biometricStatus,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithToken,
      unlockWithBiometrics,
      setBiometricEnabled,
      signOut,
    }),
    [status, user, biometricEnabled, biometricStatus, signIn, signUp, signInWithGoogle, signInWithToken, unlockWithBiometrics, setBiometricEnabled, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
