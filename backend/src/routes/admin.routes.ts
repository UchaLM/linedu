import { Router } from 'express';
import {
  listChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  listUsers,
  setUserRole,
  deleteUser,
} from '../controllers/admin.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

// Todo el panel exige rol admin, comprobado contra la base en cada request.
router.use(requireRole('admin'));

router.get('/challenges', listChallenges);
router.post('/challenges', createChallenge);
router.put('/challenges/:id', updateChallenge);
router.delete('/challenges/:id', deleteChallenge);

router.get('/users', listUsers);
router.put('/users/:id/role', setUserRole);
router.delete('/users/:id', deleteUser);

export default router;
