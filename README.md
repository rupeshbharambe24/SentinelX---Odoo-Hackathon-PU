# Traveloop 🌍

> Multi-city travel planning web app — built for the **Odoo Hackathon 2026** (8-hour build).

[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.11-009688?style=flat-square)](https://fastapi.tiangolo.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?style=flat-square)](https://postgresql.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TypeScript-61DAFB?style=flat-square)](https://vitejs.dev/)

---

## What It Does

- 🗺️ Create **multi-city trips** broken into city sections with dates and budgets
- 🎯 Add **activities** to each section (sightseeing, food, adventure, etc.)
- 💸 Track **expenses** and generate **PDF invoices**
- 🤖 **AI-powered** city recommendations and trip planning via Groq/Gemini
- 🔍 **Semantic search** — find cities by natural language query using embeddings
- 🌐 **Community feed** — share trips, comment, and like
- 🛡️ **Admin analytics** — user stats, popular cities/activities, trends dashboard

---

## Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.11 + FastAPI |
| Database | PostgreSQL 16 (Docker) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Auth | JWT (python-jose + passlib/bcrypt) |
| AI / Embeddings | sentence-transformers `all-MiniLM-L6-v2` |
| LLM | Groq (primary) + Google Gemini (fallback) |
| PDF | WeasyPrint + Jinja2 |
| Frontend | React + Vite + TypeScript + Tailwind + shadcn/ui |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Quick Start

### Prerequisites
- Docker Desktop running
- Python 3.11
- Node.js 18+

### Backend

```powershell
# 1. Start Postgres container (port 5433 to avoid Windows conflicts)
docker-compose up -d

# 2. Setup Python environment
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env              # then edit keys (see below)

# 4. Apply database schema
alembic upgrade head

# 5. Seed the database (run once, in order)
python -m app.seed.cities           # 33,000+ world cities
python -m app.seed.cost_index       # cost of living data
python -m app.seed.activities       # ~4,000 activities via OpenTripMap
python -m app.seed.photos           # city photos via Pexels
python -m app.seed.embeddings       # AI embeddings for semantic search

# 6. Start the API server
uvicorn app.main:app --reload
```

Open **http://localhost:8000/docs** for the interactive API explorer.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

---

## Environment Variables

Copy `.env.example` → `.env` and fill in:

| Variable | Required | Where to get |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://traveloop:traveloop@127.0.0.1:5433/traveloop` |
| `JWT_SECRET_KEY` | ✅ | Any random string |
| `OPENTRIPMAP_KEY` | Seed | [opentripmap.io](https://opentripmap.io/product) — free |
| `PEXELS_API_KEY` | Seed | [pexels.com/api](https://www.pexels.com/api/) — free |
| `GROQ_API_KEY` | AI | [console.groq.com](https://console.groq.com) — free |
| `GEMINI_API_KEY` | AI | [aistudio.google.com](https://aistudio.google.com) — free |

---

## API Endpoints Overview

| Prefix | Router | Description |
|---|---|---|
| `/auth` | auth.py | Register, login, get current user |
| `/users` | users.py | User profile management |
| `/trips` | trips.py | Full trip CRUD + copy + public slug |
| `/sections` | sections.py | Trip sections (one per city) |
| `/activities` | activities.py | Activities within a section |
| `/cities` | cities.py | Browse, filter, semantic search |
| `/expenses` | expenses.py | Expense tracking per trip/section |
| `/packing` | packing.py | Packing checklist with toggle |
| `/notes` | notes.py | Notes per trip/section |
| `/community` | community.py | Posts, comments, likes |
| `/ai` | ai.py | AI suggestions (Groq/Gemini) |
| `/invoice` | invoice.py | PDF invoice generation |
| `/admin` | admin.py | Analytics dashboard (admin only) |

---

## Database — 16 Tables

`users` · `cities` · `activity_templates` · `trips` · `trip_sections` · `trip_activities` · `expenses` · `invoices` · `invoice_items` · `packing_items` · `trip_notes` · `community_posts` · `community_comments` · `community_likes` · `saved_destinations` · `trip_copies`

> 📖 Full schema, column names, and frozen contracts are documented in **[PROJECT_DOCS.md](./PROJECT_DOCS.md)**

---

## Team & Contributions

| Member | Branch | Owns | Status |
|---|---|---|---|
| Rupesh | `feat/core` | Core backend, all models, auth, trips, sections, activities, community, expenses, packing, notes, cities | ✅ Done |
| Aniket | `feat/frontend` | Entire `frontend/` — React UI | 🔄 In Progress |
| Harshal / Onkar | `feat/data-admin` | Seed pipeline (5 scripts, 33k+ cities, 4k activities, AI embeddings) + Admin analytics API (6 endpoints) | ✅ Done |
| Onkar | `feat/ai-invoice` | AI trip suggestions, PDF invoice generation | 🔄 In Progress |

### Branch rules
- ✅ All changes go through Pull Requests into `main`
- ❌ Never push directly to `main`
- ❌ Never commit `.env` files

---

## What's Been Built (Harshal/Onkar — `feat/data-admin`)

### Phase 1 — Data Engineering
- `backend/app/seed/cities.py` — Downloads GeoNames, seeds 33,645 cities with popularity scores
- `backend/app/seed/cost_index.py` — Fuzzy-matches Numbeo CSV to update 27,866 cities with cost index
- `backend/app/seed/activities.py` — Fetches 3,929 activities from OpenTripMap API
- `backend/app/seed/photos.py` — Gets city photos for top 200 cities via Pexels API
- `backend/app/seed/embeddings.py` — Generates 384-dim AI vectors for all cities and activities
- `backend/data/Cost_of_Living_Index_by_Country_2024.csv` — Numbeo country-level dataset

### Phase 2 — Admin Analytics
- `backend/app/routers/admin.py` — 6 endpoints: `/stats`, `/popular/cities`, `/popular/activities`, `/users`, `/trends`, `/recent`

---

## Documentation

For a complete guide covering every file, every endpoint, the database schema, frozen column contracts, common errors, and the full git workflow — see:

### 📖 [PROJECT_DOCS.md](./PROJECT_DOCS.md)

---

*Built with ❤️ for Odoo Hackathon 2026*
