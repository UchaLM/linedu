import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiFetch } from './api';

export type PushStatus = 'registered' | 'denied' | 'unsupported';

// Con la app abierta también se muestra el aviso.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
  Constants.easConfig?.projectId;

/**
 * Pide permiso, obtiene el token de Expo y se lo manda al backend.
 * Nunca lanza: en web, emulador, Expo Go de Android (sin push remoto) o sin projectId devuelve 'unsupported'.
 */
export async function registerForPush(): Promise<PushStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'LINEDU',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return 'denied';

    const id = projectId();
    if (!id) return 'unsupported';

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await apiFetch('/users/me/push-token', { method: 'PUT', body: { token } });
    return 'registered';
  } catch (error) {
    console.warn('Push notifications unavailable:', error);
    return 'unsupported';
  }
}

/** Al cerrar sesión: este dispositivo deja de recibir avisos de esa cuenta. */
export async function unregisterPush(): Promise<void> {
  try {
    await apiFetch('/users/me/push-token', { method: 'PUT', body: { token: null } });
  } catch {
    // Sin conexión o sesión vencida: no impide cerrar sesión.
  }
}
