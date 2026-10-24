import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricStatus = 'available' | 'unsupported' | 'no-hardware' | 'not-enrolled';

export type BiometricResult = { ok: true } | { ok: false; reason: string; cancelled: boolean };

export const BIOMETRIC_STATUS_MESSAGES: Record<Exclude<BiometricStatus, 'available'>, string> = {
  unsupported: 'Biometric login is only available on the mobile app.',
  'no-hardware': 'This device has no fingerprint or Face ID sensor.',
  'not-enrolled': 'No fingerprint or face is registered. Add one in your device settings first.',
};

export async function getBiometricStatus(): Promise<BiometricStatus> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'no-hardware';
    if (!(await LocalAuthentication.isEnrolledAsync())) return 'not-enrolled';
    return 'available';
  } catch {
    return 'no-hardware';
  }
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricResult> {
  const status = await getBiometricStatus();
  if (status !== 'available') {
    return { ok: false, reason: BIOMETRIC_STATUS_MESSAGES[status], cancelled: false };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use passcode',
    });
    if (result.success) return { ok: true };

    const cancelled = ['user_cancel', 'system_cancel', 'app_cancel'].includes(result.error);
    return { ok: false, reason: cancelled ? 'Authentication cancelled.' : 'Biometric authentication failed.', cancelled };
  } catch {
    return { ok: false, reason: 'Biometric authentication is not available right now.', cancelled: false };
  }
}
