import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const TOKEN_TTL = '30d';

// Se lee en cada uso: dotenv.config() corre después de que se evalúan los imports.
export const jwtSecret = () => process.env.JWT_SECRET || 'linedu-dev-secret-change-me';

export interface AuthPayload {
  userId: number;
  email: string;
}

export const signToken = (payload: AuthPayload): string =>
  jwt.sign(payload, jwtSecret(), { expiresIn: TOKEN_TTL });

const readToken = (req: Request): AuthPayload | null => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), jwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
};

/** Rechaza la request si no hay un token válido. */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const payload = readToken(req);
  if (!payload) return res.status(401).json({ error: 'Invalid or missing token' });
  res.locals.auth = payload;
  next();
};

/**
 * Exige un rol. Se consulta la base en cada request: así quitarle el rol a alguien
 * surte efecto de inmediato, aunque su token siga vigente.
 */
export const requireRole = (role: string) => async (req: Request, res: Response, next: NextFunction) => {
  const payload = readToken(req);
  if (!payload) return res.status(401).json({ error: 'Invalid or missing token' });

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { role: true } });
  if (!user) return res.status(401).json({ error: 'User no longer exists.' });
  if (user.role !== role) return res.status(403).json({ error: 'You do not have permission to do this.' });

  res.locals.auth = payload;
  next();
};

export const currentUserId = (res: Response): number => (res.locals.auth as AuthPayload).userId;
export const currentEmail = (res: Response): string => (res.locals.auth as AuthPayload).email;
