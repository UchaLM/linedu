import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

/** Frena la fuerza bruta sobre login, registro y recuperación de contraseña (por IP). */
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

/** Más estricto aún para pedir códigos de recuperación (evita llenar la casilla de alguien). */
export const resetLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});
