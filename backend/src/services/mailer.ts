import nodemailer from 'nodemailer';

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

/**
 * Envía un email por SMTP (Gmail con contraseña de aplicación, Brevo, etc.).
 * Sin SMTP configurado el mensaje se imprime en la consola del servidor (solo útil en desarrollo).
 * Devuelve true si realmente se envió.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!smtpConfigured()) {
    console.log(`[mail] SMTP not configured. To: ${to} | ${subject}\n${text}`);
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
  return true;
}
