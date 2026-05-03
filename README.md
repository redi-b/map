# Medicine Access Platform

Medicine Access Platform (MAP) helps patients find medicines across pharmacies, upload prescriptions, track requests, manage adherence reminders, and gives pharmacies a focused inventory and request review workspace.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, next-themes
- Backend: Fastify, TypeScript, Better Auth, Drizzle ORM
- Database: PostgreSQL, Neon for production and local Postgres for development

## Scripts

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run lint
npm run typecheck
```

Copy `.env.example` into `.env` files as needed before connecting the database or auth provider.
