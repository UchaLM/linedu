import { Router } from 'express';
import { chat } from '../controllers/assistant.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Con sesión: la clave del proveedor de IA tiene costo y no debe quedar abierta a cualquiera.
router.post('/chat', requireAuth, chat);

export default router;
