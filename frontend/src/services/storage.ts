import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore no existe en web: ahí se usa localStorage (solo para desarrollo en navegador).
const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    return isWeb ? window.localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) window.localStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn('Could not persist', key, error);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (isWeb) window.localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn('Could not remove', key, error);
  }
}
