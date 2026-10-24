# EventRadar AI

EventRadar AI helps students in India discover real hackathons, AI events, coding competitions, and tech meetups.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/eventradar-ai run dev` — run the EventRadar AI web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secret: `TINYFISH_API_KEY` — used only by the Express API for TinyFish Search and Fetch requests

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/eventradar-ai` — React/Vite web app
- `artifacts/api-server/src/routes/events.ts` — live TinyFish event search and page-fetch workflow
- `lib/api-spec/openapi.yaml` — source of truth for the search API contract

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- Search by event topic and Indian city.
- Display source-linked event pages with dates, locations, registration links, and explicit labels for details that sources do not provide.
- Use TinyFish Search and Fetch from the server; event results are never seeded or fabricated.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
