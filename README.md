# Medicine Access Platform

Medicine Access Platform (MAP) helps patients find medicines across nearby pharmacies, submit prescription requests, track adherence, and gives pharmacy teams a focused workspace for inventory and request review.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, next-themes
- Backend: Fastify, TypeScript, Better Auth, Drizzle ORM
- Database: PostgreSQL, Neon for production or local Postgres for development

## Requirements

- Node.js 22 or newer
- npm
- PostgreSQL, either local or a Neon database

## Setup

```bash
npm install

cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your database URL and auth settings:

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/map"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:4000"
FRONTEND_ORIGIN="http://localhost:3000"
PORT="4000"
PRESCRIPTION_IMAGE_KEY="replace-with-a-32-character-minimum-secret"
PRESCRIPTION_STORAGE_PROVIDER="fs"
PRESCRIPTION_STORAGE_DIR="storage/prescriptions"
```

The frontend expects the API at:

```bash
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

Run database migrations after the database exists:

```bash
npm run db:migrate
npm run db:seed
```

The seed script creates one operations user and one pharmacist user per seeded pharmacy:

```bash
admin@map.local / mapAdmin2026!
lion.pharmacist@map.local / mapPharmacy2026!
wudassie.pharmacist@map.local / mapPharmacy2026!
healthplus.pharmacist@map.local / mapPharmacy2026!
redcross.pharmacist@map.local / mapPharmacy2026!
```

Seeded pharmacist accounts are linked to their pharmacy and are asked to set a private password on first login.

## Development

Run the frontend and backend together:

```bash
npm run dev
```

Or run each app separately:

```bash
npm run dev:frontend
npm run dev:backend
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:4000/health`
