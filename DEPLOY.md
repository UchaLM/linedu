# Cómo poner LINEDU en internet

Orden: **1) base de datos → 2) backend → 3) Google → 4) APK → 5) web pública**.
Todo tiene plan gratuito. Lo que tenés que hacer vos son los pasos que piden crear una cuenta.

## 1. Base de datos PostgreSQL (Neon) — ya está hecha
El proyecto de Neon (rama `production`) ya está creado y vinculado con `neon init`; las tablas y los datos de prueba ya existen.
Las claves están en `backend/.env` (no se sube a git): `DATABASE_URL` (con pooler) y `DATABASE_URL_UNPOOLED` (directa).
Si hace falta volver a traerlas: `cd backend && neon deploy` las vuelve a escribir en `.env`.

> Neon free no se borra con el tiempo. (La base gratuita de Render sí expira a los 30 días, por eso no se usa.)

## 2. Backend (Render)
1. Subir el repositorio a GitHub **sin** `backend/.env`, `frontend/.env` ni `backend/prisma/dev.db` (ya están en `.gitignore`;
   si `dev.db` ya estaba subido: `git rm --cached backend/prisma/dev.db`).
2. En https://render.com → **New → Blueprint** → elegir el repositorio. Render lee `render.yaml`.
3. Cargar las variables que piden (las marcadas `sync: false`):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | el valor de `DATABASE_URL` de `backend/.env` |
| `DATABASE_URL_UNPOOLED` | el valor de `DATABASE_URL_UNPOOLED` de `backend/.env` |
| `GEMINI_API_KEY` | clave de https://aistudio.google.com/apikey (asistente de IA) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ver paso 3 |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | para el email de recuperar contraseña. Con Gmail: `smtp.gmail.com`, tu mail, una **contraseña de aplicación** (cuenta Google → Seguridad → Contraseñas de aplicaciones) |
| `PUBLIC_URL` | la URL que Render asigne, ej. `https://linedu-api.onrender.com` (se completa después del primer deploy y se vuelve a desplegar) |

4. Al desplegar, el servicio crea las tablas y carga los usuarios de prueba y los retos solos (`npm run start:prod`).
5. Probar: abrir `https://TU-URL/api/health` → debe responder `{"status":"ok",...}`.

**Importante:** el plan gratis de Render se duerme tras 15 min sin uso y la primera petición tarda ~1 minuto.
Para evitarlo, crear un monitor gratis en https://uptimerobot.com que consulte `/api/health` cada 5 minutos.

## 3. Google OAuth (login con Google en el celular)
En https://console.cloud.google.com → APIs y servicios → Credenciales → tu cliente OAuth **Web**:
- **URI de redireccionamiento autorizados:** `https://TU-URL-DE-RENDER/api/auth/google/callback`
- Mientras la app esté en modo "Prueba", agregar los emails de quien vaya a probar en **Usuarios de prueba**
  (o publicar la app en la pantalla de consentimiento).

## 4. APK (Expo EAS)
```bash
cd frontend
npx eas-cli@latest login            # cuenta gratuita de https://expo.dev
npx eas-cli@latest init             # crea el proyecto y guarda el projectId en app.json
```
1. Editar `frontend/eas.json` y reemplazar `REEMPLAZAR-POR-TU-API.onrender.com` por la URL real del backend.
2. Construir:
```bash
npx eas-cli@latest build --platform android --profile preview
```
Tarda 10-20 minutos. Al terminar, EAS entrega un **enlace de descarga del APK** (y un QR).
3. Las notificaciones push de Android necesitan además una clave FCM: `npx eas-cli@latest credentials` → Android → Google Service Account / FCM, siguiendo https://docs.expo.dev/push-notifications/fcm-credentials/

## 5. Sitio web público (Vercel)
1. En `website/index.html` reemplazar `REEMPLAZAR-URL-DEL-APK` por el enlace del APK del paso 4.
2. En https://vercel.com → **Add New → Project** → elegir el repositorio → **Root Directory: `website`** → Deploy.
3. La URL que entrega Vercel es la web pública del proyecto.

## Lista final antes de entregar
- [ ] `https://TU-URL/api/health` responde.
- [ ] Desde un celular que **no** es el tuyo: instalar el APK, crear una cuenta, iniciar sesión y completar un reto.
- [ ] Recuperar contraseña envía el email.
- [ ] Entrar con el usuario admin: se ve la pestaña Admin y se puede crear/editar/borrar un reto.
- [ ] Un usuario común **no** ve Admin (y `GET /api/admin/users` con su token responde 403).
- [ ] La web pública tiene el botón de descarga funcionando.
- [ ] Credenciales del admin entregadas al docente en privado (no publicadas).
