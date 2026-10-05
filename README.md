# Ahmarny Beat Marketplace

Full-stack beat marketplace built to be **API-first and mobile-ready**.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Auth: JWT
- Payments: Paystack
- Web deployment: Vercel
- API deployment: Render

## Architecture

The web frontend and future Android/iOS applications use the same backend API and PostgreSQL database. The current `/api` endpoints remain compatible with the web app, while `/api/v1` is the stable versioned API contract for future mobile clients.

```text
                 ┌── React/Vite Website
                 │
Clients ─────────┼── Future React Native/Expo App
                 │
                 └── Future other clients
                         │
                         ▼
                  Ahmarny Express API
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          PostgreSQL             Paystack
           + Prisma
```

## Run locally

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Future mobile app

When the client wants an Android/iOS app, create a separate React Native + Expo app and point it at:

```text
https://YOUR-API-DOMAIN/api/v1
```

Do **not** create a second database. The mobile app should reuse the existing users, beats, orders, licences and payment records.

See `API.md` for the stable mobile API contract.

## Deployment

- Frontend: Vercel
- Backend: Render
- PostgreSQL: Supabase or another managed PostgreSQL provider
- Audio/file storage: use object storage in production rather than relying on the Render filesystem

Never commit real `.env` files or payment/database secrets to GitHub.
