import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentUserId } from '../middleware/auth';
import { passwordProblem, hashPassword, verifyPassword, publicUser } from './auth.controller';
import { isExpoPushToken, sendPush } from '../services/notifications';

const LEADERBOARD_SIZE = 20;
const SEARCH_POOL = 200;
const SEARCH_RESULTS = 20;
const MAX_NAME_LENGTH = 60;
const MEDALS = ['🥇', '🥈', '🥉'];

const serverError = (res: Response, error: unknown) => {
  console.error(error);
  res.status(500).json({ error: 'Server error' });
};

const parseId = (value: string): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** ?scope=friends limita el ranking a la gente que sigues (y tú). */
export const getLeaderboard = async (req: Request, res: Response) => {
  const myId = currentUserId(res);
  try {
    let where = {};
    if (req.query.scope === 'friends') {
      const follows = await prisma.follow.findMany({ where: { followerId: myId }, select: { followingId: true } });
      where = { id: { in: [myId, ...follows.map((f) => f.followingId)] } };
    }

    const users = await prisma.user.findMany({ where, orderBy: { xp: 'desc' }, take: LEADERBOARD_SIZE });
    res.json(
      users.map((u, index) => ({
        id: u.id.toString(),
        name: u.name,
        streak: u.streak,
        xp: u.xp,
        rank: index + 1,
        medal: MEDALS[index],
        isYou: u.id === myId,
      })),
    );
  } catch (error) {
    serverError(res, error);
  }
};

export const getProfile = async (_req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: currentUserId(res) } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [higherXpCount, followers, following] = await Promise.all([
      prisma.user.count({ where: { xp: { gt: user.xp } } }),
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
    ]);
    res.json({ ...publicUser(user), rank: higherXpCount + 1, followers, following });
  } catch (error) {
    serverError(res, error);
  }
};

export const updateMe = async (req: Request, res: Response) => {
  const { name } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: `Enter a name (max ${MAX_NAME_LENGTH} characters).` });
  }
  try {
    const user = await prisma.user.update({ where: { id: currentUserId(res) }, data: { name: name.trim() } });
    res.json({ user: publicUser(user) });
  } catch (error) {
    serverError(res, error);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string') return res.status(400).json({ error: 'Enter your current password.' });
  const problem = passwordProblem(newPassword);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const user = await prisma.user.findUnique({ where: { id: currentUserId(res) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await verifyPassword(user, currentPassword))) {
      return res.status(400).json({ error: 'Your current password is wrong.' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword) } });
    res.json({ message: 'Password updated.' });
  } catch (error) {
    serverError(res, error);
  }
};

/** Busca usuarios por nombre para seguirlos. */
export const searchUsers = async (req: Request, res: Response) => {
  const myId = currentUserId(res);
  const query = String(req.query.q ?? '').trim().toLowerCase();
  if (query.length < 2) return res.json([]);

  try {
    const [pool, follows] = await Promise.all([
      prisma.user.findMany({ where: { id: { not: myId } }, orderBy: { xp: 'desc' }, take: SEARCH_POOL }),
      prisma.follow.findMany({ where: { followerId: myId }, select: { followingId: true } }),
    ]);
    const followed = new Set(follows.map((f) => f.followingId));
    res.json(
      pool
        .filter((u) => u.name.toLowerCase().includes(query))
        .slice(0, SEARCH_RESULTS)
        .map((u) => ({ id: u.id, name: u.name, xp: u.xp, streak: u.streak, isFollowing: followed.has(u.id) })),
    );
  } catch (error) {
    serverError(res, error);
  }
};

export const followUser = async (req: Request, res: Response) => {
  const myId = currentUserId(res);
  const targetId = parseId(req.params.id);
  if (!targetId) return res.status(400).json({ error: 'Invalid user.' });
  if (targetId === myId) return res.status(400).json({ error: 'You cannot follow yourself.' });

  try {
    const [target, me] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetId } }),
      prisma.user.findUnique({ where: { id: myId } }),
    ]);
    if (!target || !me) return res.status(404).json({ error: 'User not found' });

    const already = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: myId, followingId: targetId } },
    });
    if (!already) {
      await prisma.follow.create({ data: { followerId: myId, followingId: targetId } });
      if (target.pushToken) {
        // Notificación real de un evento real: no se espera a que termine para responder.
        void sendPush([target.pushToken], {
          title: 'New follower',
          body: `${me.name} started following you.`,
          data: { type: 'follow', userId: me.id },
        });
      }
    }
    res.json({ following: true });
  } catch (error) {
    serverError(res, error);
  }
};

export const unfollowUser = async (req: Request, res: Response) => {
  const targetId = parseId(req.params.id);
  if (!targetId) return res.status(400).json({ error: 'Invalid user.' });

  try {
    await prisma.follow.deleteMany({ where: { followerId: currentUserId(res), followingId: targetId } });
    res.json({ following: false });
  } catch (error) {
    serverError(res, error);
  }
};

export const savePushToken = async (req: Request, res: Response) => {
  const { token } = req.body ?? {};
  if (token !== null && (typeof token !== 'string' || !isExpoPushToken(token))) {
    return res.status(400).json({ error: 'Invalid push token.' });
  }
  try {
    await prisma.user.update({ where: { id: currentUserId(res) }, data: { pushToken: token } });
    res.json({ ok: true });
  } catch (error) {
    serverError(res, error);
  }
};
