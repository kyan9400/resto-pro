# resto-pro

Restaurant online-ordering monorepo: a customer-facing menu, cart and checkout, plus a realtime kitchen dashboard with printable order tickets.

## What it does

**Customer flow (`/`, `/cart`, `/checkout`)**

- Loads a restaurant menu grouped by category from the API.
- Each item can have option groups (e.g. add-ons with a price delta and a `maxSelect` limit).
- Cart lives in React state; checkout collects name / phone / email and pickup vs. delivery, then posts the order.
- The server re-validates every item and option against the database, recomputes line totals, applies `TAX_RATE`, and stores the order with a `PENDING` status event.

**Kitchen dashboard (`/admin`)**

- Lists recent orders and refreshes every 15 s as a fallback.
- Subscribes to a Server-Sent Events stream: new orders are highlighted and play a chime, status changes refetch the list.
- Staff move an order through `PENDING -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> COMPLETED` (or `CANCELED`); every change is recorded as a `StatusEvent`.
- "Print" opens an 80 mm thermal-printer ticket (HTML, auto-prints on load).
- `/admin/login` stores a bearer token in `localStorage`; the client sends it as `Authorization: Bearer ...` on API calls.

All prices are stored as integer cents. The seeded demo restaurant uses the slug `demo-deli`, which the client currently hard-codes.

## Stack

| Layer   | Tech |
|---------|------|
| Client  | Next.js 15 (App Router, Turbopack), React 19, TanStack Query, ky, Tailwind CSS v4 |
| Server  | Express 5, Prisma 6, PostgreSQL, zod, morgan, dotenv |
| Tooling | npm workspaces, TypeScript, tsx, Docker Compose (Postgres 16 + Adminer) |

## Repository layout

```
client/              Next.js app (menu, cart, checkout, admin dashboard)
server/              Express API + Prisma schema, migrations and seed
docker-compose.yml   Local Postgres + Adminer
```

## Getting started

Prerequisites: Node.js 20+, npm 10+, Docker.

```bash
# 1. Install all workspaces
npm ci

# 2. Start Postgres (127.0.0.1:5432) and Adminer (http://127.0.0.1:8080)
docker compose up -d

# 3. Configure the API
cp server/.env.example server/.env      # edit if you changed the compose credentials

# 4. Create the schema and seed "Demo Deli"
npm run -w server prisma:migrate
npm run -w server seed

# 5. Run the API (http://localhost:4000)
npm run dev                             # alias for: npm run -w server dev

# 6. In a second terminal, run the client (http://localhost:3000)
cp client/.env.example client/.env.local
npm run -w client dev
```

Open http://localhost:3000 for the menu and http://localhost:3000/admin for the dashboard. If you set `ADMIN_TOKEN` on the server, paste the same value at http://localhost:3000/admin/login first.

### Other scripts

| Command | Description |
|---------|-------------|
| `npm run -w server build` | Type-check and compile the API to `server/dist/` |
| `npm run -w server start` | Run the compiled API |
| `npm run -w server prisma:generate` | Regenerate the Prisma client |
| `npm run -w client build` | Production build of the Next.js app |
| `npm run -w client start` | Serve the production build |
| `npm run -w client lint` | ESLint (next/core-web-vitals + next/typescript) |

## Environment variables

### `server/.env`

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | yes | - | Postgres connection string used by Prisma |
| `PORT` | no | `4000` | API port |
| `CLIENT_ORIGIN` | no | - | Extra CORS origin; `localhost:3000/3001` and `127.0.0.1:3000/3001` are always allowed |
| `ADMIN_TOKEN` | no | - | Bearer token for `/api/admin/*`. **When unset, admin routes are open.** |
| `TAX_RATE` | no | `0` | Decimal tax rate applied to the subtotal, e.g. `0.08` |

### `client/.env.local`

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:4000` (browser code only) | Base URL of the API. The server-rendered menu page has no fallback, so set it explicitly. |

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | - | Liveness check |
| GET | `/api/menu/:slug` | - | Restaurant with categories, items, option groups and options |
| POST | `/api/orders` | - | Place an order (validated with zod) |
| GET | `/api/admin/:slug/orders?limit=50` | admin | Recent orders with items and status events (max 200) |
| GET | `/api/admin/:slug/stream` | admin | SSE stream emitting `order.created` and `order.updated` |
| POST | `/api/admin/orders/:id/status` | admin | Update status, body `{ "status": "...", "note"?: "..." }` |
| GET | `/api/admin/orders/:id/ticket` | admin | Printable 80 mm kitchen ticket (HTML) |

Admin routes accept the token either as `Authorization: Bearer <token>` or as a `?token=` query parameter. The query form exists because `EventSource` and `window.open` cannot set headers; be aware that it ends up in request logs and browser history, so use a strong token and HTTPS outside local development.

## Data model

`Restaurant` -> `Category` -> `MenuItem` -> `OptionGroup` -> `Option`, and `Order` -> `OrderItem` / `StatusEvent` / `Payment` (see `server/prisma/schema.prisma`). Orders carry `subtotal`, `tax` and `total` in cents, an `OrderType` (`PICKUP` / `DELIVERY`), an `OrderStatus` and a `PaymentStatus`. The `stripe` package is installed but no payment provider is wired up yet; orders are created as `UNPAID`.

## Known issues

- `npm run -w client build` (and `npm run -w client lint`) currently fail on `@typescript-eslint/no-explicit-any` errors in `client/src/app/_AddToCart.tsx`, `client/src/app/admin/page.tsx` and `client/src/app/checkout/page.tsx`. The code compiles and type-checks (`tsc --noEmit`); only the lint gate inside `next build` blocks. `next dev` is unaffected.
- When `ADMIN_TOKEN` is empty the admin API and dashboard are unauthenticated. Always set it outside local development.

## License

MIT - see [LICENSE](LICENSE).
