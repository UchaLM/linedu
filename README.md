# LINEDU

Aplicación móvil que enseña comandos de la terminal de Linux armando bloques: retos, XP, rachas, ranking con amigos y un asistente de IA.
Proyecto final de Construcción de Software (6.º año).

## Qué incluye
| Parte | Carpeta | Tecnología |
|---|---|---|
| App multiplataforma (Android, iOS, web) | `frontend/` | Expo + React Native + TypeScript |
| API REST | `backend/` | Node.js + Express + TypeScript |
| Base de datos | `backend/prisma/` | Prisma ORM + PostgreSQL en Neon (desarrollo y producción) |
| Sitio web público | `website/` | HTML estático |

## Requisitos del proyecto y dónde están
- **Autenticación:** registro, login, cierre de sesión, sesión persistente (JWT guardado en SecureStore), recuperar y restablecer contraseña por código de 6 dígitos enviado por email, login con Google, huella digital. `backend/src/controllers/auth.controller.ts`
- **Home:** resumen de racha, XP, ranking y siguiente lección. `frontend/src/screens/HomeScreen.tsx`
- **ABM:** alta, baja, modificación y consulta de retos y usuarios desde el panel de administración. `backend/src/controllers/admin.controller.ts`
- **Roles:** `user` y `admin`. El rol se comprueba en el backend en cada request (`requireRole`), no solo en la interfaz.
- **Interacción entre usuarios:** buscar, seguir y ranking de amigos; aviso push al ser seguido.
- **Cuenta:** ver datos, cambiar nombre y contraseña, cerrar sesión.
- **Tema:** claro, oscuro o el del sistema.
- **Notificaciones push:** recordatorio de racha en riesgo y nuevos seguidores (Expo Notifications).
- **Segundo plano:** el servidor revisa cada hora quién tiene la racha en riesgo (`backend/src/services/scheduler.ts`).
- **Validaciones y errores:** datos obligatorios, formatos, credenciales inválidas, permisos, conexión, estados de carga.
- **Seguridad:** contraseñas con bcrypt, JWT, límite de intentos (rate limit), validación de entradas, secretos solo en variables de entorno.

## Cómo probarla (sin instalar nada de desarrollo)
1. Descargar el APK desde la web del proyecto (ver `DEPLOY.md` para la URL) e instalarlo en Android.
2. Entrar con un usuario de prueba:

| Rol | Email | Contraseña |
|---|---|---|
| Usuario | `test@test.com` | `123456` |
| Administrador | se entrega en privado al docente | |

## Desarrollo local
```bash
# 1) Backend
cd backend
cp .env.example .env        # completar JWT_SECRET (y GEMINI_API_KEY si se quiere el asistente)
npm install
neon deploy                 # trae DATABASE_URL y DATABASE_URL_UNPOOLED de Neon al .env (requiere `neon login`)
npx prisma db push
npx ts-node prisma/seed.ts  # crea usuarios de prueba y los retos
npm run dev                 # http://localhost:3000

# 2) Frontend
cd ../frontend
npm install
npx expo start              # QR para Expo Go, o `w` para abrir la web
```
En el celular, la app necesita la dirección del backend: definir `EXPO_PUBLIC_API_URL=http://IP-DE-TU-PC:3000/api` en `frontend/.env`.

## API (resumen)
Base: `/api`. Todas las rutas salvo `auth/*` y `health` exigen `Authorization: Bearer <token>`.

| Ruta | Descripción |
|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/google` | Alta, login, login con Google |
| `POST /auth/forgot-password`, `/auth/reset-password` | Recuperar contraseña con código |
| `GET /auth/profile` | Valida la sesión |
| `GET /challenges/1`, `POST /challenges/validate` | Retos y validación del comando |
| `GET /users/profile`, `PUT /users/me`, `PUT /users/me/password` | Perfil y cuenta |
| `GET /users/leaderboard?scope=friends`, `GET /users/search`, `POST/DELETE /users/:id/follow` | Ranking y amigos |
| `PUT /users/me/push-token` | Registro del dispositivo para push |
| `/admin/challenges`, `/admin/users` | ABM (solo rol admin) |
| `POST /assistant/chat` | Asistente de IA |

## Modelo de datos
`User` (rol, XP, nivel, racha, token push) · `Lesson` · `Challenge` (instrucción, regex de validación, bloques, XP) · `Follow` (seguidor → seguido) · `PasswordReset` (código hasheado con vencimiento).
Esquema completo en `backend/prisma/schema.prisma`.

## Secretos
Ninguna clave está en el repositorio. Ver `backend/.env.example` y `frontend/.env.example`. Las credenciales reales se cargan como variables de entorno en el hosting.
