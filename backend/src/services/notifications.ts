const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // límite de Expo por request

export const isExpoPushToken = (token: string): boolean => /^Expo(nent)?PushToken\[.+\]$/.test(token);

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Envía una notificación push a varios dispositivos. Nunca lanza: un push fallido no debe romper la operación. */
export async function sendPush(tokens: string[], { title, body, data }: PushMessage): Promise<void> {
  const valid = tokens.filter(isExpoPushToken);
  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    const chunk = valid.slice(i, i + CHUNK_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(chunk.map((to) => ({ to, title, body, data, sound: 'default' }))),
      });
      if (!response.ok) console.error('Expo push failed', response.status, await response.text());
    } catch (error) {
      console.error('Expo push error', error);
    }
  }
}
