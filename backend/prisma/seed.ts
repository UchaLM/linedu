import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Usuarios de prueba. Idempotente: no pisa datos de usuarios que ya existen.
// Credenciales de prueba (entregar al docente en privado): admin@test.com / Admin123!  ·  test@test.com / 123456
const USERS = [
  { email: 'admin@test.com', password: 'Admin123!', name: 'Admin LinEdu', role: 'admin', xp: 5000, streak: 30, level: 10, title: 'Root' },
  { email: 'mia@test.com', password: '123456', name: 'Mia Chen', xp: 8420, streak: 42 },
  { email: 'dev@test.com', password: '123456', name: 'Dev Patel', xp: 7900, streak: 38 },
  { email: 'sara@test.com', password: '123456', name: 'Sara Kim', xp: 7200, streak: 35 },
  { email: 'test@test.com', password: '123456', name: 'Lucas Soto', xp: 3840, streak: 27, level: 14, title: 'Shell Ranger' },
  { email: 'tom@test.com', password: '123456', name: 'Tom Wright', xp: 3200, streak: 21 },
  { email: 'ana@test.com', password: '123456', name: 'Ana Ruiz', xp: 2900, streak: 18 },
  { email: 'jon@test.com', password: '123456', name: 'Jon Blake', xp: 2400, streak: 12 },
];

const CHALLENGES = [
  { instruction: 'Move notes.txt to /backup/ in interactive mode', validRegex: '^mv -i notes\\.txt /backup/?$', xpReward: 12, blocks: ['mv', '-i', 'notes.txt', '/backup/', 'cp', '-f', 'rm', './backup/'] },
  { instruction: 'Copy the directory /var/log recursively to ./logs', validRegex: '^cp -r /var/log ./logs/?$', xpReward: 15, blocks: ['cp', '-r', '/var/log', './logs', 'mv', '-R', 'log', 'rm'] },
  { instruction: 'Remove the directory /tmp/cache and all its contents forcefully', validRegex: '^rm -rf /tmp/cache/?$', xpReward: 15, blocks: ['rm', '-rf', '/tmp/cache', '-f', 'del', '/var/cache', 'mkdir', 'rmdir'] },
  { instruction: 'Create a directory path /app/src/components, creating parents as needed', validRegex: '^mkdir -p /app/src/components/?$', xpReward: 12, blocks: ['mkdir', '-p', '/app/src/components', 'touch', 'make', '-d', 'src/'] },
  { instruction: 'Make the file script.sh executable for everyone', validRegex: '^chmod \\+x script\\.sh$', xpReward: 20, blocks: ['chmod', '+x', 'script.sh', 'chown', '777', '-R', 'execute', 'sh'] },
];

async function main() {
  for (const { password, ...user } of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      // Las cuentas de prueba siempre quedan con la contraseña y el rol documentados; el resto de sus datos no se toca.
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: await bcrypt.hash(password, 10), role: 'role' in user ? user.role : 'user' },
      });
      continue;
    }
    await prisma.user.create({ data: { ...user, password: await bcrypt.hash(password, 10) } });
  }

  if ((await prisma.challenge.count()) === 0) {
    const lesson = await prisma.lesson.create({
      data: { title: 'File Management', description: 'Move, copy and remove files', order: 1 },
    });
    for (const { blocks, ...challenge } of CHALLENGES) {
      await prisma.challenge.create({ data: { ...challenge, blocks: JSON.stringify(blocks), lessonId: lesson.id } });
    }
  }
  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
