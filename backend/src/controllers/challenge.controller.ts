import { Request, Response } from 'express';
import { Challenge } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { currentUserId } from '../middleware/auth';

const MAX_BLOCKS = 30;
const MAX_BLOCK_LENGTH = 100;

export const parseBlocks = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((b): b is string => typeof b === 'string') : [];
  } catch {
    return [];
  }
};

const toClient = (c: Challenge) => ({
  id: c.id,
  instruction: c.instruction,
  xpReward: c.xpReward,
  blocks: parseBlocks(c.blocks).map((text, i) => ({ id: String(i), text })),
});

/** Devuelve todos los retos en orden (la app los recorre como una lección). */
export const getChallenge = async (_req: Request, res: Response) => {
  try {
    const challenges = await prisma.challenge.findMany({ orderBy: { id: 'asc' } });
    res.json(challenges.map(toClient));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const isBlockList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= MAX_BLOCKS &&
  value.every((b) => typeof b === 'string' && b.length > 0 && b.length <= MAX_BLOCK_LENGTH);

export const validateCommand = async (req: Request, res: Response) => {
  const { challengeId, blocks, isLast } = req.body ?? {};
  if (!Number.isInteger(challengeId) || !isBlockList(blocks)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    let isValid = false;
    try {
      isValid = new RegExp(challenge.validRegex).test(blocks.join(' '));
    } catch {
      console.error('Challenge', challenge.id, 'has an invalid regex');
      return res.status(500).json({ error: 'This challenge is misconfigured.' });
    }
    if (!isValid) return res.json({ success: false, message: 'Incorrect command. Try again.' });

    const user = await prisma.user.findUnique({ where: { id: currentUserId(res) } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updateData: { xp: { increment: number }; streak?: { increment: number }; lastPlay?: Date } = {
      xp: { increment: challenge.xpReward },
    };

    // El día se completa al terminar el último reto: se suma la racha una vez por día.
    let streakIncremented = false;
    if (isLast === true) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastPlayDay = new Date(user.lastPlay);
      lastPlayDay.setHours(0, 0, 0, 0);

      if (lastPlayDay.getTime() < today.getTime() || user.streak === 0) {
        updateData.streak = { increment: 1 };
        updateData.lastPlay = new Date();
        streakIncremented = true;
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });
    res.json({ success: true, message: 'Correct command!', xpGained: challenge.xpReward, streakIncremented });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
