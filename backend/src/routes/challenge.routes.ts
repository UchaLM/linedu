import { Router } from 'express';
import { getChallenge, validateCommand } from '../controllers/challenge.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/:id', requireAuth, getChallenge);
router.post('/validate', requireAuth, validateCommand);

export default router;
