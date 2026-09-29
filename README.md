# Relay — WhatsApp CRM SaaS

Multi-tenant WhatsApp engagement platform on the official Meta Cloud API. Working product name: **Relay**. India-first SMB focus.

## Stack

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma (tenant-scoped models)
- Redis via Docker (queue coordination reserved)
- Animated marketing homepage using [React Bits](https://reactbits.dev/)-style components (`Threads`, `BlurText`, `Magnet`, `CountUp`, `FadeContent`)

## Defaults (Phase 1)

| Decision | Choice |
| --- | --- |
| Market | India (`en-IN`, `Asia/Kolkata`) |
| Meta onboarding | Customer-owned Cloud API credentials |
| Billing | Stripe stubs only |
| Auth | Email/password + HTTP-only session cookies |

## Quick start

### 1. Dependencies

```bash
npm install
```

### 2. Infrastructure

```bash
docker compose up -d
```

Starts Postgres (`localhost:5432`) and Redis (`localhost:6379`).

### 3. Environment

```bash
cp .env.example .env
```

### 4. Database

```bash
npx prisma migrate dev --name init
```

### 5. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the animated landing page. Sign up at `/signup` to enter the app shell.

## App routes

| Path | Purpose |
| --- | --- |
| `/` | Animated marketing homepage |
| `/signup`, `/login` | Auth |
| `/app` | Dashboard |
| `/app/inbox` | Conversation list stub |
| `/app/contacts` | Contacts stub |
| `/app/campaigns` | Campaigns stub |
| `/app/settings` | Connect WhatsApp Cloud API credentials |
| `/api/webhooks/whatsapp` | Meta webhook verify + signed ingress with idempotency |

## Webhook setup (pilot)

1. In Settings, save Phone Number ID + permanent access token + verify token.
2. In Meta Developer Console, set callback URL to `https://<your-host>/api/webhooks/whatsapp`.
3. Use the same verify token. Set `META_APP_SECRET` in `.env` for signature checks in production.

Inbound text messages are normalized once (idempotent on provider message ID) into Contact → Conversation → Message.

## Scripts

```bash
npm run dev          # Next.js dev
npm run build        # Production build
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio
```

## Out of scope (this slice)

Live Embedded Signup, campaign send workers, Stripe charges, visual flow builder, AI copilot, native apps.
