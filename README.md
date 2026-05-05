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

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment Notes

- Deploy the frontend to Vercel and set `NEXT_PUBLIC_API_URL` to the backend URL.
- Deploy the backend to Render and set the backend environment variables there.
- Use Neon for the production PostgreSQL database.
