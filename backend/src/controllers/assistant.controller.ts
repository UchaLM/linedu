import { Request, Response } from 'express';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-5-5';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const RETRYABLE_STATUS = [404, 429, 500, 503];
const MAX_TOKENS = 600;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

const SYSTEM_PROMPT =
  'You are the LINEDU assistant, a friendly tutor inside a gamified app that teaches Linux/shell commands ' +
  'by assembling command blocks. Answer briefly (max ~120 words), in the same language as the user. ' +
  'Explain commands, flags and concepts clearly with a short example. Give hints rather than the full ' +
  'answer when the user asks about a specific challenge. Stay on topic: shell, Linux and the app.';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

class ProviderError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const parseMessages = (body: unknown): ChatMessage[] | null => {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const messages = raw.slice(-MAX_MESSAGES).map((m) => ({
    role: (m as ChatMessage)?.role,
    content: (m as ChatMessage)?.content,
  }));
  const valid = messages.every(
    (m) =>
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0 &&
      m.content.length <= MAX_MESSAGE_LENGTH,
  );
  return valid && messages[messages.length - 1].role === 'user' ? messages : null;
};

const post = async (url: string, headers: Record<string, string>, body: unknown): Promise<any> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error('Assistant provider error', response.status, await response.text());
    throw new ProviderError(`Provider answered ${response.status}`, response.status);
  }
  return response.json();
};

const askGemini = async (apiKey: string, messages: ChatMessage[]): Promise<string> => {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: MAX_TOKENS },
  };

  // Si un modelo está saturado (503/429) o retirado (404) se prueba el siguiente.
  const models = [process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL, ...GEMINI_FALLBACK_MODELS];
  let lastError: ProviderError | null = null;
  for (const model of models) {
    try {
      const data = await post(`${GEMINI_URL}/${model}:generateContent`, { 'x-goog-api-key': apiKey }, body);
      const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
      return parts.map((p) => p.text ?? '').join('').trim();
    } catch (error) {
      if (!(error instanceof ProviderError) || !RETRYABLE_STATUS.includes(error.status)) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new ProviderError('No Gemini model available', 0);
};

const askAnthropic = async (apiKey: string, messages: ChatMessage[]): Promise<string> => {
  const data = await post(
    ANTHROPIC_URL,
    { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    {
      model: process.env.ANTHROPIC_MODEL || ANTHROPIC_DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    },
  );
  const blocks: { type: string; text?: string }[] = data?.content ?? [];
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
};

export const chat = async (req: Request, res: Response) => {
  const messages = parseMessages(req.body);
  if (!messages) return res.status(400).json({ error: 'Send a non-empty message.' });

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    return res
      .status(503)
      .json({ error: 'The assistant is not configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY on the server).' });
  }

  try {
    const reply = geminiKey ? await askGemini(geminiKey, messages) : await askAnthropic(anthropicKey!, messages);
    if (!reply) return res.status(502).json({ error: 'The assistant sent an empty answer.' });
    res.json({ reply });
  } catch (error) {
    if (!(error instanceof ProviderError)) console.error(error);
    res.status(502).json({ error: 'The assistant is unavailable right now. Try again.' });
  }
};
