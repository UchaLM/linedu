import { prisma } from '../lib/prisma';
import { sendPush } from './notifications';

const CHECK_EVERY_MS = 60 * 60 * 1000; // cada hora
const FIRST_RUN_DELAY_MS = 30 * 1000;
const DEFAULT_REMINDER_HOUR = 19; // hora del servidor (variable TZ) a partir de la cual se avisa

/** Avisa por push a quien tiene racha activa y todavía no jugó hoy. Una vez por día por usuario. */
export async function sendStreakReminders(now = new Date()): Promise<number> {
  const reminderHour = Number(process.env.REMINDER_HOUR ?? DEFAULT_REMINDER_HOUR);
  if (now.getHours() < reminderHour) return 0;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: {
      streak: { gt: 0 },
      pushToken: { not: null },
      lastPlay: { lt: startOfToday },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: startOfToday } }],
    },
    select: { id: true, name: true, streak: true, pushToken: true },
  });

  for (const user of users) {
    await sendPush([user.pushToken!], {
      title: `🔥 Your ${user.streak}-day streak is at risk`,
      body: `${user.name}, finish a challenge today to keep it alive.`,
      data: { type: 'streak-reminder' },
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastReminderAt: now } });
  }
  return users.length;
}

/** Proceso en segundo plano del servidor: revisa periódicamente quién necesita el recordatorio. */
export function startScheduler(): void {
  const run = () =>
    sendStreakReminders()
      .then((count) => count && console.log(`[scheduler] streak reminders sent: ${count}`))
      .catch((error) => console.error('[scheduler] reminder job failed', error));

  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, CHECK_EVERY_MS).unref();
}
