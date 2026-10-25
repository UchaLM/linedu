import { Request, Response } from 'express';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { signToken, currentUserId } from '../middleware/auth';
import { sendMail } from '../services/mailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72; // límite de bcrypt
const BCRYPT_ROUNDS = 10;
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

export const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  xp: u.xp,
  level: u.level,
  title: u.title,
  streak: u.streak,
});

export const sessionFor = (u: User) => ({
  token: signToken({ userId: u.id, email: u.email }),
  user: publicUser(u),
});

export const passwordProblem = (password: unknown): string | null => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must have at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return `Password must have at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
};

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

const isBcryptHash = (value: string) => /^\$2[aby]\$/.test(value);

/** Acepta hashes bcrypt y las contraseñas en texto plano heredadas (las migra a hash). */
export const verifyPassword = async (user: User, password: string): Promise<boolean> => {
  if (isBcryptHash(user.password)) return bcrypt.compare(password, user.password);
  if (user.password !== password) return false;
  await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(password) } });
  return true;
};

/** Busca el usuario por email o lo crea (cuenta OAuth: contraseña aleatoria que nadie conoce). */
export const upsertOAuthUser = async (rawEmail: string, name?: string): Promise<User> => {
  const email = rawEmail.toLowerCase();
  return (
    (await prisma.user.findUnique({ where: { email } })) ??
    prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: await hashPassword(crypto.randomBytes(32).toString('hex')),
      },
    })
  );
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body ?? {};
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email.' });
  }
  const problem = passwordProblem(password);
  if (problem) return res.status(400).json({ error: problem });
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 60) {
    return res.status(400).json({ error: 'Enter your name (max 60 characters).' });
  }

  try {
    const normalized = email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email: normalized } })) {
      return res.status(409).json({ error: 'That email is already registered.' });
    }
    const user = await prisma.user.create({
      data: { email: normalized, name: name.trim(), password: await hashPassword(password) },
    });
    res.status(201).json(sessionFor(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await verifyPassword(user, password))) {
      return res.status(401).json({ error: 'Wrong email or password.' });
    }
    res.json(sessionFor(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Login con Google: recibe el access token de OAuth y lo valida contra Google. */
export const googleLogin = async (req: Request, res: Response) => {
  const { accessToken } = req.body ?? {};
  if (typeof accessToken !== 'string' || !accessToken) {
    return res.status(400).json({ error: 'Missing Google access token.' });
  }

  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return res.status(401).json({ error: 'Google rejected the token.' });

    const profile = (await response.json()) as { email?: string; email_verified?: boolean; name?: string };
    if (!profile.email || profile.email_verified === false) {
      return res.status(401).json({ error: 'Google account has no verified email.' });
    }
    res.json(sessionFor(await upsertOAuthUser(profile.email, profile.name)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Valida un token guardado (sesión previa / desbloqueo biométrico) y devuelve el usuario. */
export const getSession = async (_req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: currentUserId(res) } });
  if (!user) return res.status(401).json({ error: 'User no longer exists.' });
  res.json({ user: publicUser(user) });
};

/** Paso 1 de "olvidé mi contraseña": envía un código de 6 dígitos al email. Responde igual exista o no la cuenta. */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user) {
      const code = String(crypto.randomInt(100000, 1000000));
      await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
      await prisma.passwordReset.create({
        data: { userId: user.id, codeHash: await hashPassword(code), expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS) },
      });
      try {
        await sendMail(
          user.email,
          'LINEDU - your password reset code',
          `Your LINEDU code is ${code}. It expires in 15 minutes.\nIf you did not ask for it, ignore this email.`,
        );
      } catch (error) {
        console.error('Could not send reset email', error);
        return res.status(502).json({ error: 'We could not send the email right now. Try again in a few minutes.' });
      }
    }
    res.json({ message: 'If that email is registered, we sent you a 6-digit code.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Paso 2: valida el código y fija la nueva contraseña. */
export const resetPassword = async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body ?? {};
  if (typeof email !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the 6-digit code.' });
  }
  const problem = passwordProblem(newPassword);
  if (problem) return res.status(400).json({ error: problem });

  const invalid = () => res.status(400).json({ error: 'Invalid or expired code.' });

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const reset = user && (await prisma.passwordReset.findFirst({ where: { userId: user.id }, orderBy: { id: 'desc' } }));
    if (!user || !reset || reset.expiresAt < new Date()) return invalid();

    if (reset.attempts >= RESET_MAX_ATTEMPTS) {
      await prisma.passwordReset.delete({ where: { id: reset.id } });
      return invalid();
    }
    if (!(await bcrypt.compare(code, reset.codeHash))) {
      await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      return invalid();
    }

    await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword) } });
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    res.json({ message: 'Password updated. You can log in now.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
