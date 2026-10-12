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
npx prisma migrate deploy
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


## Beat audio and cover uploads

The admin dashboard uploads audio and cover images to Supabase Storage. This avoids relying on local disk, which is temporary on Render.

1. In Supabase, open **Storage** and create a bucket named `ahmarny-assets`. Set the bucket to **Public** so published beat previews and cover images can be played/displayed by visitors.
2. In `backend/.env`, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=ahmarny-assets`. Get the URL and service-role key from Supabase project settings. The service-role key must remain only in the backend environment and must never be placed in `frontend/.env` or committed to GitHub.
3. Install updated backend dependencies with `npm install`, then restart the API. For Render, add the same three variables in the service's Environment settings and redeploy.
4. Open `/admin`, choose a watermarked MP3/WAV preview (up to 30 MB), optionally choose cover art, fill in the metadata, and select **Upload and publish beat**. Do not upload an unwatermarked master: this bucket serves preview URLs publicly. A private master-file download flow should be implemented separately before selling full-quality files. The new beat will appear in `/store`.

Uploads are limited to MP3/WAV audio and JPG/PNG/WebP covers. The current admin form creates the standard licence rows with starter prices; review those prices and licence terms before accepting payments.

## Persistent cart, checkout, and Paystack

Guest carts are kept in browser `localStorage` under `ahmarny_cart_v1`. After sign-in, the selected beat/licence IDs are synced to the account-backed `CartItem` table through `GET /api/cart` and `PUT /api/cart`, so the cart can be restored on another device. The cart migration is additive and does not reset existing database records. Render applies it with `prisma migrate deploy`; for a local database, run `npx prisma migrate deploy` from `backend` after setting `DATABASE_URL` and `DIRECT_URL`.

Checkout is available at `/checkout` and requires a signed-in customer account. The backend recalculates prices from the database when creating an order; the frontend does not set the payable amount. The Paystack callback is `/payment/callback`.

For Paystack test payments, configure these backend environment variables:

```env
PAYSTACK_SECRET_KEY="sk_test_your_secret_key"
FRONTEND_URL="http://localhost:5173"
```

Use the matching test public/secret keys from the Paystack dashboard. The backend initializes transactions with Paystack and redirects the customer to Paystack's hosted payment page. Paystack returns to `/payment/callback`, where the backend verifies the transaction with Paystack before marking the order paid. Configure the Paystack webhook URL as `https://YOUR-API-DOMAIN/api/payments/paystack/webhook` for deployed environments. Do not expose the secret key in frontend environment variables.

Before going live, test successful, cancelled, and failed payments with Paystack test keys, then configure live keys only after the verification flow has been tested.

### Paystack integration notes (test mode)

1. Set `PAYSTACK_SECRET_KEY` to your Paystack **test secret key** in `backend/.env`. Do not place it in the Vite frontend environment or commit it to Git.
2. Ensure `FRONTEND_URL` is the exact frontend origin, with no trailing slash (for example `http://localhost:5173` locally or your deployed Vercel URL in production).
3. Restart the backend after changing environment variables.
4. In Paystack Dashboard → Settings → API Keys & Webhooks, set the webhook URL to `https://YOUR-API-DOMAIN/api/payments/paystack/webhook` (and use `/api/v1/payments/paystack/webhook` only if you deliberately configure that route instead). The server verifies Paystack's HMAC-SHA512 signature against the raw request body and checks transaction reference, amount and currency before marking an order paid.
5. Sign in as a customer, add a published beat and licence, open checkout and complete a test payment. The callback verifies the transaction with Paystack before clearing the cart. Also test cancelling checkout and returning without paying; the order must not be marked paid.
6. Confirm paid orders at `GET /api/orders/mine` with the customer bearer token.

The cart in this version is saved in browser `localStorage`; it survives refreshes on the same browser/device, but is not yet synchronized to a customer's account across devices. Do not describe that as cross-device persistence until server-side cart storage is added.


## Frontend component structure

The frontend is split into small files under `frontend/src` so individual areas can be maintained independently:

- `App.tsx` — route selection, authentication state, and navigation
- `components/Header.tsx` — shared navigation
- `components/AuthModal.tsx` — login and registration
- `components/BeatCard.tsx` — preview player, licence selector, add-to-cart control
- `pages/LandingPage.tsx` — public home page
- `pages/StorePage.tsx` — catalogue, filters, and cart synchronization
- `pages/CheckoutPage.tsx` — order review and Paystack initialization
- `pages/PaymentCallbackPage.tsx` — server-side payment verification result
- `pages/AccountPage.tsx` — customer account landing page
- `pages/AdminPage.tsx` — admin dashboard and beat upload
- `lib/api.ts` — API requests and JWT header handling
- `lib/format.ts` — shared currency formatting
- `types.ts` — shared TypeScript types

Code comments describe the responsibility of each module and important security decisions.
