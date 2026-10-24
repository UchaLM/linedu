import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  getSession,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { googleStart, googleCallback } from '../controllers/oauth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter, resetLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleLogin);
router.get('/google/start', googleStart);
router.get('/google/callback', googleCallback);
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);
router.get('/profile', requireAuth, getSession);

export default router;
