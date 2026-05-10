<div align="center">

<img src="https://api.iconify.design/lucide:layout-dashboard.svg?color=%2306b6d4&width=72" width="72" alt="frontend" />

# Traveloop · `feat/frontend`

### React + TypeScript frontend — 14 screens, shadcn/ui, TanStack everything

Branch owner: **Aniket Wahul** ([wahulaniket66@gmail.com](mailto:wahulaniket66@gmail.com))
Final integrated state: [**`main`**](../../tree/main)

[![Branch](https://img.shields.io/badge/branch-feat%2Ffrontend-714B67)]()
[![Merged](https://img.shields.io/badge/merged_to-main-success)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)]()
[![Tailwind 4](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)]()
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-60+_components-000)]()

</div>

---

## What this branch contains

The full client of Traveloop — every page judges click through during the demo. 16 file-based routes, 60+ shadcn/ui primitives, drag-and-drop itinerary builder, recharts dashboards, AI buttons wired to the backend, server-side PDF download, Web Share API.

This branch was rebased onto `main` and merged. The work is now integrated into [main](../../tree/main); this branch is preserved for authorship traceability.

---

## 📦 Deliverables

### 16 file-based routes (TanStack Router)

| Route | Page | Highlight |
|---|---|---|
| `/` | Landing | Hero with gradient text + CTA |
| `/login` | Sign in | JWT auth, redirects to `/dashboard` |
| `/register` | Create account | First/last name + city/country + phone, Zod-validated |
| `/_app/dashboard` | Dashboard | Greeting, hero banner, "Trending destinations" from real catalog, recent trips |
| `/_app/trips` | My Trips | Three tabs: Ongoing / Upcoming / Completed (status from backend) |
| `/_app/trips/new` | Plan a Trip | Form + **"Suggest with AI"** button → `/ai/generate-itinerary` → bulk-creates sections + activities |
| `/_app/trips/$tripId/overview` | Trip overview | Cover, stats, completeness score, day-by-day stages |
| `/_app/trips/$tripId/builder` | **Itinerary Builder** | dnd-kit drag-drop sections; inline edit; activity drawer |
| `/_app/trips/$tripId/itinerary` | Read-only itinerary | Day-grouped flowchart with arrows + sticky budget bar |
| `/_app/trips/$tripId/budget` | Budget tracker | Real expenses + Add Expense + **Sync from Activities** + pie/bar charts |
| `/_app/trips/$tripId/invoice` | Invoice | Live preview + Download PDF (server-side) + Mark as Paid |
| `/_app/trips/$tripId/packing` | Packing list | Categorised, progress bar, **AI Suggestions** button |
| `/_app/trips/$tripId/notes` | Trip notes | Per-trip and per-day notes |
| `/_app/trips/$tripId/settings` | Trip settings | Edit dates/budget/cover; danger-zone delete |
| `/_app/explore` | Explore | Two tabs (Destinations + Activities) with real catalog search/filter |
| `/_app/community` | Community | Rich composer (title/story/images/tags/trip), inline comments, optimistic likes |
| `/_app/analytics` | Analytics | Per-user trip stats + admin section gated by `user.is_admin` |
| `/_app/profile` | Profile | Editable profile, preplanned vs previous trips |

### Reusable infrastructure

- `lib/api.ts` — typed `fetch` wrapper with JWT injection, `ApiError` class, query-string builder, FormData support
- `lib/use-auth.ts` — TanStack Query-backed auth state with login/register/logout helpers
- `components/app-shell.tsx` — sticky header, mobile-friendly nav, theme toggle, sign-out
- `components/trip-sub-nav.tsx` — per-trip tab strip
- `components/trip-card.tsx` — typed card consuming the schema
- `components/ui/*` — 60+ shadcn primitives (button, card, dialog, sheet, dropdown, table, sidebar, calendar, command, ...)

### Forms & state
- **React Hook Form + Zod** on every form (login, register, new trip, expense, post composer, trip settings)
- **TanStack Query** for all server reads (with optimistic mutations on likes)
- No `useState` for global state — auth lives in localStorage + Query cache; everything else is server state

---

## 🏗️ Decisions

- **Why TanStack Start instead of plain Vite?** Server-side rendering at the edge: every page is server-rendered on the first request, hydrated on the client. Login, register, and landing pages have full content in the initial HTML, which means SEO and instant first paint. Cloudflare Workers deployment is a one-line change.
- **Why TanStack Router instead of React Router?** Type-safe routes with the file-based convention (`_app.trips.$tripId.builder.tsx`). Route params are typed end-to-end; `Link to="/trips/$tripId/builder"` requires `params={{ tripId }}` to compile. Catches 404s at build time, not runtime.
- **Why shadcn/ui instead of Material/Chakra?** Components are copy-pasted into the project, not imported from a versioned package. Each one is editable, themeable via Tailwind variables, and tree-shakes naturally. 60+ primitives, all consistent.
- **Why TanStack Query for likes/comments?** Optimistic mutations: clicking the heart shows the filled state and incremented count immediately, rolls back if the server call fails, and reconciles on success. No `useState` ping-pong.
- **Why Tailwind 4 alpha-ish?** New utilities (`text-balance`, `oklch()` colour space, container queries built-in), zero-config Vite plugin, and `@tailwindcss/vite` for hot CSS reloads.

---

## 📍 Files added on this branch

```
frontend/
├─ src/
│  ├─ components/
│  │  ├─ ui/              60+ shadcn primitives
│  │  ├─ app-shell.tsx    sticky header + nav + sign-out
│  │  ├─ trip-card.tsx    typed card consuming /trips schema
│  │  ├─ trip-sub-nav.tsx per-trip tab strip
│  │  └─ theme-toggle.tsx
│  ├─ hooks/use-mobile.tsx
│  ├─ lib/
│  │  ├─ api.ts           fetch wrapper + JWT + ApiError
│  │  ├─ use-auth.ts      auth state via TanStack Query
│  │  ├─ utils.ts         cn() + class helpers
│  │  ├─ error-capture.ts SSR error trapping
│  │  └─ error-page.ts    branded 500 page
│  ├─ routes/             16 .tsx files (TanStack file-based routing)
│  ├─ router.tsx          QueryClient + router setup
│  ├─ server.ts           TanStack Start fetch handler
│  ├─ start.ts            client entry
│  └─ styles.css          Tailwind 4 + custom CSS variables
├─ components.json         shadcn config
├─ eslint.config.js
├─ package.json            61 deps, 14 dev-deps
├─ tsconfig.json
├─ vite.config.ts          @cloudflare/vite-plugin + tanstack
└─ wrangler.jsonc          Cloudflare Workers config
```

---

## 🤝 Coordination with the team

- **Frozen contract respected** — all forms validate against the same shapes the backend's Pydantic schemas accept (`name`, `cover_photo_url`, `total_budget`, `is_packed`, `order_index`, `expense_date`, etc.)
- **No backend changes** — every data call goes through `lib/api.ts` to one of the existing FastAPI endpoints; no new routes invented client-side
- **JWT auth, not Supabase** — `lib/api.ts` injects `Authorization: Bearer <token>` from `localStorage.traveloop.access_token`; no third-party auth provider involved
- **`VITE_API_URL` env var** — defaults to `http://localhost:8000`; deploys override via Cloudflare env

---

## 🚀 Run the frontend locally

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

Make sure the backend is running at `localhost:8000` first; otherwise the `useAuth` hook gets a 401 and bounces you to `/login` immediately.

---

<div align="center">

[← Back to main](../../tree/main) · [Author commits](../../commits/feat/frontend?author=wahulaniket66)

</div>
