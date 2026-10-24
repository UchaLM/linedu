import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { currentUserId } from '../middleware/auth';
import { parseBlocks } from './challenge.controller';

const MAX_INSTRUCTION = 200;
const MAX_REGEX = 200;
const MAX_BLOCKS = 30;
const MAX_BLOCK_LENGTH = 100;
const MAX_XP = 100;
const ROLES = ['user', 'admin'];

const serverError = (res: Response, error: unknown) => {
  console.error(error);
  res.status(500).json({ error: 'Server error' });
};

const parseId = (value: string): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

interface ChallengeInput {
  instruction: string;
  validRegex: string;
  blocks: string[];
  xpReward: number;
}

/** Valida el cuerpo de alta/modificación de un reto. Devuelve el reto limpio o el motivo del rechazo. */
const parseChallengeInput = (body: any): { data: ChallengeInput } | { error: string } => {
  const { instruction, validRegex, blocks, xpReward } = body ?? {};

  if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > MAX_INSTRUCTION) {
    return { error: `Instruction is required (max ${MAX_INSTRUCTION} characters).` };
  }
  if (typeof validRegex !== 'string' || !validRegex || validRegex.length > MAX_REGEX) {
    return { error: `A validation regex is required (max ${MAX_REGEX} characters).` };
  }
  try {
    new RegExp(validRegex);
  } catch {
    return { error: 'The validation regex is not valid.' };
  }
  if (
    !Array.isArray(blocks) ||
    blocks.length < 2 ||
    blocks.length > MAX_BLOCKS ||
    !blocks.every((b) => typeof b === 'string' && b.trim().length > 0 && b.length <= MAX_BLOCK_LENGTH)
  ) {
    return { error: `Send between 2 and ${MAX_BLOCKS} non-empty blocks.` };
  }
  if (!Number.isInteger(xpReward) || xpReward < 1 || xpReward > MAX_XP) {
    return { error: `XP reward must be a whole number between 1 and ${MAX_XP}.` };
  }
  return { data: { instruction: instruction.trim(), validRegex, blocks: blocks.map((b: string) => b.trim()), xpReward } };
};

const defaultLessonId = async (): Promise<number> => {
  const lesson =
    (await prisma.lesson.findFirst({ orderBy: { order: 'asc' } })) ??
    (await prisma.lesson.create({
      data: { title: 'File Management', description: 'Move, copy and remove files', order: 1 },
    }));
  return lesson.id;
};

const adminChallenge = (c: { id: number; instruction: string; validRegex: string; blocks: string; xpReward: number }) => ({
  id: c.id,
  instruction: c.instruction,
  validRegex: c.validRegex,
  blocks: parseBlocks(c.blocks),
  xpReward: c.xpReward,
});

export const listChallenges = async (_req: Request, res: Response) => {
  try {
    const challenges = await prisma.challenge.findMany({ orderBy: { id: 'asc' } });
    res.json(challenges.map(adminChallenge));
  } catch (error) {
    serverError(res, error);
  }
};

export const createChallenge = async (req: Request, res: Response) => {
  const parsed = parseChallengeInput(req.body);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });

  try {
    const { blocks, ...rest } = parsed.data;
    const challenge = await prisma.challenge.create({
      data: { ...rest, blocks: JSON.stringify(blocks), lessonId: await defaultLessonId() },
    });
    res.status(201).json(adminChallenge(challenge));
  } catch (error) {
    serverError(res, error);
  }
};

export const updateChallenge = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid challenge.' });
  const parsed = parseChallengeInput(req.body);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });

  try {
    if (!(await prisma.challenge.findUnique({ where: { id } }))) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    const { blocks, ...rest } = parsed.data;
    const challenge = await prisma.challenge.update({ where: { id }, data: { ...rest, blocks: JSON.stringify(blocks) } });
    res.json(adminChallenge(challenge));
  } catch (error) {
    serverError(res, error);
  }
};

export const deleteChallenge = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid challenge.' });

  try {
    const { count } = await prisma.challenge.deleteMany({ where: { id } });
    if (count === 0) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ deleted: true });
  } catch (error) {
    serverError(res, error);
  }
};

export const listUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    res.json(
      users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, xp: u.xp, createdAt: u.createdAt })),
    );
  } catch (error) {
    serverError(res, error);
  }
};

export const setUserRole = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { role } = req.body ?? {};
  if (!id || typeof role !== 'string' || !ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}.` });
  }
  if (id === currentUserId(res)) return res.status(400).json({ error: 'You cannot change your own role.' });

  try {
    const { count } = await prisma.user.updateMany({ where: { id }, data: { role } });
    if (count === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ id, role });
  } catch (error) {
    serverError(res, error);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user.' });
  if (id === currentUserId(res)) return res.status(400).json({ error: 'You cannot delete your own account here.' });

  try {
    const { count } = await prisma.user.deleteMany({ where: { id } });
    if (count === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ deleted: true });
  } catch (error) {
    serverError(res, error);
  }
};
