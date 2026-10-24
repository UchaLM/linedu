import { Platform } from 'react-native';

// Configuración centralizada de la API
// Si estás en tu casa o en otra red, usa la IP de tu PC (ej. 192.168.10.248)
// Si estás en la escuela (EPET), ajusta a la IP local de la red escolar (ej. 172.16.3.3)
const LAN_URL = 'http://192.168.1.101:3000/api';

// En el navegador (expo start --web) el backend corre en la misma PC.
// En producción (APK) la URL llega por EXPO_PUBLIC_API_URL, definida en eas.json o en frontend/.env.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? 'http://localhost:3000/api' : LAN_URL);
