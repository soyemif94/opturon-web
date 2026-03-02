# Opturon Web (Next.js 15)

Rebuild de `opturon.com` con Next.js 15 (App Router) + Tailwind + NextAuth, integrado con `https://api.opturon.com` para panel bot.

## Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth (Credentials)
- lucide-react + componentes estilo shadcn/ui

## Estructura
- `app/(public)` Home, servicios, quienes-somos, contacto
- `app/(auth)/login`
- `app/(bot)/bot/inbox`, `settings`, `metrics`, `logs`
- `app/(bot)/admin` placeholder
- `app/api/bot/*` wrappers server-side para consumir `api.opturon.com`
- `middleware.ts` protege `/bot/*`

## Variables de entorno
Copiar `.env.example` a `.env`.

Variables principales:
- `NODE_ENV`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (local: `http://localhost:3000`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (obligatorio en producción)
- `ADMIN_PASSWORD` (solo desarrollo)
- `API_BASE_URL` (default `https://api.opturon.com`)
- `API_DEBUG_KEY` (para `/debug/inbox*`, solo server-side)
- `API_TIMEOUT_MS` (default `10000`)
- `WHATSAPP_BOOK_CALL_URL`

## Auth hardening
En producción (`NODE_ENV=production`) el login exige `ADMIN_PASSWORD_HASH`.
`ADMIN_PASSWORD` solo se usa en desarrollo para iterar rápido.

Generar hash bcrypt:
```bash
npm run auth:hash -- "tu-password-fuerte"
```

Usar el valor resultante en `ADMIN_PASSWORD_HASH`.

## Scripts
```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

## Integración API
Panel bot usa llamadas server-side (no desde cliente):
- `GET /health`
- `GET /__build`
- `GET /debug/inbox`
- `GET /debug/inbox/health`
- `POST /debug/inbox/clear`

Requiere que backend tenga:
- `WHATSAPP_DEBUG=true`
- `DEBUG_API_ENABLED=true`
- `x-debug-key` válido (`API_DEBUG_KEY`)

## Deploy en Hostinger (Node)
1. Subir carpeta `opturon-web`.
2. Configurar env vars de producción:
   - `NODE_ENV=production`
   - `NEXTAUTH_SECRET` fuerte
   - `NEXTAUTH_URL=https://opturon.com`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
   - `API_BASE_URL=https://api.opturon.com`
   - `API_DEBUG_KEY` (si se usa inbox debug)
3. Instalar dependencias y compilar:
   - `npm ci`
   - `npm run build`
4. Start:
   - `npm run start`

### Checklist deploy
- `npm run lint` sin errores
- Login funcional con hash en prod
- `/bot/inbox` carga health/build/inbox
- `/bot/logs` muestra estado y último error (o `no errors`)
- Endpoints debug no exponen `API_DEBUG_KEY` al navegador

## Verificación rápida
```powershell
curl.exe -sS https://api.opturon.com/health
curl.exe -sS https://api.opturon.com/__build
```
