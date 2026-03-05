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
- `ADMIN_PASSWORD_HASH` (obligatorio en producci贸n)
- `ADMIN_PASSWORD` (solo desarrollo)
- `API_BASE_URL` (default `https://api.opturon.com`)
- `API_DEBUG_KEY` (para `/debug/inbox*`, solo server-side)
- `API_TIMEOUT_MS` (default `10000`)
- `WHATSAPP_BOOK_CALL_URL`

## Auth hardening
En producci贸n (`NODE_ENV=production`) el login exige `ADMIN_PASSWORD_HASH`.
`ADMIN_PASSWORD` solo se usa en desarrollo para iterar r谩pido.

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

## Integraci贸n API
Panel bot usa llamadas server-side (no desde cliente):
- `GET /health`
- `GET /build`
- `GET /debug/inbox`
- `GET /debug/inbox/health`
- `POST /debug/inbox/clear`

Requiere que backend tenga:
- `WHATSAPP_DEBUG=true`
- `DEBUG_API_ENABLED=true`
- `x-debug-key` v谩lido (`API_DEBUG_KEY`)

## Deploy en Hostinger (Node)
1. Subir carpeta `opturon-web`.
2. Configurar env vars de producci贸n:
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
- `/bot/logs` muestra estado y 煤ltimo error (o `no errors`)
- Endpoints debug no exponen `API_DEBUG_KEY` al navegador

## Verificaci贸n r谩pida
```powershell
curl.exe -sS https://api.opturon.com/health
curl.exe -sS https://api.opturon.com/build
```

## GA4 deploy check
- Root injection lives in `app/layout.tsx` and is verified at build time by `scripts/verify-ga4-build.mjs`.
- Required env var:
  - `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (fallback code path uses `G-FL6RVZW90M`).
- After every deploy, validate production is serving the latest artifact:
  1. Hard refresh and open `view-source:https://opturon.com`.
  2. Confirm source contains:
     - `https://www.googletagmanager.com/gtag/js?id=...`
     - `id="ga-init"`
  3. In DevTools Console:
     - `typeof window.gtag` should be `"function"`.
  4. In Network:
     - request to `googletagmanager.com/gtag/js?id=...` must exist.

## SaaS mode (/ops + /app)

### Rutas
- `/ops`: backoffice interno Opturon (staff only)
- `/app`: portal cliente (tenant membership)
- Rutas existentes `/bot` y `/admin` se mantienen

### Seed demo
```bash
npm run seed:saas
```
Crea tenant demo, usuario staff y usuario cliente owner.

### Credenciales seed (defaults)
- Staff: `staff@opturon.com` / `demo1234`
- Owner: `owner@demo-tenant.com` / `demo1234`

### Migraciones de referencia
- `db/migrations/001_saas_core.sql`
- `db/migrations/002_saas_templates.sql`

### Verificaci髇 r醦ida
1. Login con usuario staff y abrir `/ops`.
2. Abrir ficha cliente en `/ops/tenants/[tenantId]`.
3. Clic en `Ver portal cliente (modo demo)`.
4. Login con owner y abrir `/app/catalog`, `/app/faqs`, `/app/business`, `/app/users`.

## Auth smoke test
Valida login por Credentials y sesion de NextAuth sin librerias extra.

```bash
AUTH_EMAIL=admin@opturon.com AUTH_PASSWORD=680774Ce npm run auth:smoke
AUTH_BASE_URL=https://opturon.com AUTH_EMAIL=admin@opturon.com AUTH_PASSWORD=680774Ce npm run auth:smoke
```

### PowerShell (Windows)
```powershell
$env:AUTH_EMAIL="admin@opturon.com"
$env:AUTH_PASSWORD="680774Ce"
npm run auth:smoke
```

## Auth en produccion (Vercel)
- No dependas de `data/saas.json` en serverless para login de admin.
- Configura estas variables en Vercel:
  - `AUTH_ADMIN_EMAIL`
  - `AUTH_ADMIN_PASSWORD_HASH`
  - `AUTH_ADMIN_GLOBAL_ROLE` (ej: `superadmin`)
  - `AUTH_ADMIN_NAME` (opcional)
- Mantener tambien `NEXTAUTH_URL` y `NEXTAUTH_SECRET` correctas.

Generar hash bcrypt (cost 10):
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('TU_PASSWORD_SEGURA',10));"
```

En local podes seguir usando `scripts/create-admin.mjs` + `data/saas.json`.

## API interna (sin api.opturon.com)
- El panel usa endpoints internos en el mismo dominio (`/api/app/*` y `/api/bot/*`).
- `BACKEND_BASE_URL` es opcional. Si no existe, el panel usa modo local y evita dependencia externa.
- `API_DEBUG_KEY` es solo server-side. El frontend no envia `x-debug-key`.

Variables sugeridas en Vercel:
- `NEXT_PUBLIC_SITE_URL=https://www.opturon.com`
- `BACKEND_BASE_URL=` (vac韔 para modo interno)
- `API_DEBUG_KEY` (solo servidor)

Pruebas rapidas:
```bash
curl -i https://www.opturon.com/api/app/health
curl -i https://www.opturon.com/api/app/inbox
curl -i https://www.opturon.com/api/app/logs
curl -i https://www.opturon.com/api/app/metrics
```

