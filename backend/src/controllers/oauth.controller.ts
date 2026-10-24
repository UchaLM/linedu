import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../middleware/auth';
import { sessionFor, upsertOAuthUser } from './auth.controller';

// Flujo OAuth mediado por el backend: sirve para Expo Go, donde Google no acepta el redirect `exp://`.
//   app → /google/start → Google → /google/callback (https público) → deep link de vuelta a la app con el token.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const STATE_TTL = '10m';

// Solo se puede volver a la app: evita que el callback sirva de open redirect.
const ALLOWED_APP_REDIRECT = /^(exps?|linedu|com\.linedu\.app):\/\/\S*$/;

const callbackUrl = () => `${(process.env.PUBLIC_URL ?? '').replace(/\/$/, '')}/api/auth/google/callback`;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Página que devuelve el control a la app (un 302 a un esquema propio no siempre lo respeta el navegador). */
const backToApp = (res: Response, appRedirect: string, params: Record<string, string>) => {
  const url = new URL(appRedirect);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const target = escapeHtml(url.toString());
  res.status(200).type('html').send(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>LINEDU</title></head><body style="background:#0a0a0a;color:#fff;font-family:monospace;text-align:center;padding:48px 20px">` +
      `<p>Returning to LINEDU…</p><p><a style="color:#39FF14" href="${target}">Tap here if the app does not open</a></p>` +
      `<script>location.href=${JSON.stringify(url.toString()).replace(/</g, '\\u003c')}</script></body></html>`,
  );
};

const showError = (res: Response, status: number, message: string) =>
  res.status(status).type('text').send(message);

export const googleStart = (req: Request, res: Response) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !PUBLIC_URL) {
    return showError(res, 503, 'Google sign-in is not configured on the server (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_URL).');
  }

  const appRedirect = String(req.query.app_redirect ?? '');
  if (!ALLOWED_APP_REDIRECT.test(appRedirect)) return showError(res, 400, 'Invalid app_redirect.');

  const state = jwt.sign({ appRedirect }, jwtSecret(), { expiresIn: STATE_TTL });
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
};

export const googleCallback = async (req: Request, res: Response) => {
  let appRedirect: string;
  try {
    const decoded = jwt.verify(String(req.query.state ?? ''), jwtSecret()) as { appRedirect?: string };
    if (!decoded.appRedirect || !ALLOWED_APP_REDIRECT.test(decoded.appRedirect)) throw new Error('bad redirect');
    appRedirect = decoded.appRedirect;
  } catch {
    return showError(res, 400, 'The sign-in request expired. Go back to the app and try again.');
  }

  const code = String(req.query.code ?? '');
  if (req.query.error || !code) return backToApp(res, appRedirect, { error: 'Google sign-in was cancelled.' });

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: callbackUrl(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      console.error('Google token exchange failed', tokenResponse.status, await tokenResponse.text());
      return backToApp(res, appRedirect, { error: 'Google rejected the sign-in. Try again.' });
    }
    const { access_token } = (await tokenResponse.json()) as { access_token?: string };

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
    const profile = (await profileResponse.json()) as { email?: string; email_verified?: boolean; name?: string };
    if (!profileResponse.ok || !profile.email || profile.email_verified === false) {
      return backToApp(res, appRedirect, { error: 'Your Google account has no verified email.' });
    }

    const { token } = sessionFor(await upsertOAuthUser(profile.email, profile.name));
    backToApp(res, appRedirect, { token });
  } catch (error) {
    console.error(error);
    backToApp(res, appRedirect, { error: 'Something went wrong signing in with Google.' });
  }
};
