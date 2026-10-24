import { Router } from 'express';
import {
  getLeaderboard,
  getProfile,
  updateMe,
  changePassword,
  searchUsers,
  followUser,
  unfollowUser,
  savePushToken,
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/leaderboard', getLeaderboard);
router.get('/profile', getProfile);
router.put('/me', updateMe);
router.put('/me/password', changePassword);
router.put('/me/push-token', savePushToken);
router.get('/search', searchUsers);
router.post('/:id/follow', followUser);
router.delete('/:id/follow', unfollowUser);

export default router;
