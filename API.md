# Ahmarny API Contract

Ahmarny is API-first. The current website uses `/api/*`; future Android/iOS apps should use `/api/v1/*`.

## Base URLs

Local: `http://localhost:4000/api/v1`
Production: `https://YOUR-API-DOMAIN/api/v1`

## Authentication

Register:
`POST /auth/register`

```json
{"name":"Jane Doe","email":"jane@example.com","password":"password123"}
```

Login:
`POST /auth/login`

```json
{"email":"jane@example.com","password":"password123"}
```

Authenticated requests send:
`Authorization: Bearer <token>`

Current account:
`GET /auth/me`

## Beats

List/search published beats:
`GET /beats?q=afro&genre=Afrobeats&mood=Dark`

Single beat:
`GET /beats/:slug`

Each beat includes its available licenses and prices.

## Account-backed cart

Get the signed-in customer's cart:
`GET /cart`

Replace the cart contents (up to 20 items):
`PUT /cart`

```json
{
  "items": [
    {"beatId":"...","licenseId":"..."}
  ]
}
```

Only published beats and licences that belong to the selected beat are accepted. The server stores cart rows against the authenticated user, so the same cart can be restored on another device. Guest carts remain local until sign-in.

## Orders

Create order:
`POST /orders`

```json
{
  "email":"jane@example.com",
  "customerName":"Jane Doe",
  "items":[{"beatId":"...","licenseId":"..."}]
}
```

Authenticated customer's orders:
`GET /orders/mine`

## Payments

Initialize Paystack:
`POST /payments/paystack/initialize`

```json
{"orderId":"..."}
```

Paystack webhook:
`POST /payments/paystack/webhook`

## Mobile-app rule

Do not connect a future mobile app directly to PostgreSQL or Supabase. The app should only communicate with this API. This keeps credentials, pricing validation, payment verification, licensing rules, and database access on the server.

The mobile app can therefore share the same customer accounts, purchases, licences and payment history as the website.
