import { PrismaClient } from '@prisma/client';

// Un único cliente para toda la app (cada PrismaClient abre su propio pool de conexiones).
export const prisma = new PrismaClient();
