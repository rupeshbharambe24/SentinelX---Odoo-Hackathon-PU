# Traveloop — Complete Project Documentation

> **For teammates, AI assistants, and future contributors.**
> This document explains everything about the project: what it does, how it's structured, every file's role, and what has been built so far. You should be able to understand and continue work without reading a single line of source code.

---

## 1. Project Overview

**Traveloop** is a multi-city travel planner web application built for the Odoo Hackathon (8-hour build).

### What it does
- Users can register, log in, and create **trips**.
- A trip is broken into **sections** — one per city/destination.
- Each section can have **activities**, **expenses**, and **notes**.
- Users can discover cities by popularity, search semantically (AI-powered), and save favourite destinations.
- A **community feed** lets users share and comment on each other's trips.
- An **admin panel** provides analytics: user counts, trip trends, popular cities and activities.

### Tech Stack
| Layer | Technology |
|---|---|
| Backend API | Python 3.11 + FastAPI |
| Database | PostgreSQL 16 (Docker container) |
| ORM | SQLAlchemy 2.0 |
| Auth | JWT (python-jose + passlib/bcrypt) |
| AI / Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| PDF Generation | WeasyPrint + Jinja2 |
| LLM | Groq API / Google Gemini |
| Frontend | (separate — Vite/React, not covered here) |

---

## 2. Repository Structure

```
SentinelX---Odoo-Hackathon-PU/
├── docker-compose.yml          # Starts Postgres container on port 5433
├── PROJECT_DOCS.md             # This file
├── backend/
│   ├── .env                    # Secret keys and DB URL (never commit real secrets)
│   ├── .env.example            # Template for the above
│   ├── requirements.txt        # All Python dependencies
│   ├── data/
│   │   └── Cost_of_Living_Index_by_Country_2024.csv  # Numbeo dataset (country-level)
│   └── app/
│       ├── main.py             # FastAPI app entry point — mounts all routers
│       ├── core/
│       │   ├── config.py       # Pydantic settings — reads from .env
│       │   ├── db.py           # SQLAlchemy engine + SessionLocal + get_db()
│       │   └── security.py     # JWT creation, password hashing, get_admin_user()
│       ├── models/             # SQLAlchemy ORM models (one file per table group)
│       ├── schemas/            # Pydantic request/response schemas
│       ├── routers/            # FastAPI route handlers (one file per feature)
│       ├── services/           # Business logic (kept separate from routers)
│       ├── seed/               # One-time data population scripts
│       └── templates/          # Jinja2 HTML templates (for PDF invoices)
└── frontend/                   # React/Vite frontend (separate team)
```

---

## 3. How to Run Locally (Step by Step)

### Prerequisites
- Docker Desktop running
- Python 3.11 installed
- Git

### First-time setup
```powershell
# 1. Clone the repo and enter backend folder
cd backend

# 2. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment file and fill in your keys
cp .env.example .env
```

### Configure `.env`
```env
DATABASE_URL=postgresql://traveloop:traveloop@127.0.0.1:5433/traveloop

JWT_SECRET_KEY=any-random-string-you-choose
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

FRONTEND_URL=http://localhost:5173

OPENTRIPMAP_KEY=your_key_here         # free at opentripmap.io
PEXELS_API_KEY=your_key_here          # free at pexels.com/api
GROQ_API_KEY=your_key_here            # free at console.groq.com
GEMINI_API_KEY=your_key_here          # free at aistudio.google.com
```

> **Why port 5433?** Windows often has a local PostgreSQL running on 5432. Our Docker container maps to 5433 to avoid conflict.

### Start the database
```powershell
# Run from the repo ROOT (not backend/)
docker-compose up -d

# Verify it's running
docker ps    # should show "sentinelx---odoo-hackathon-pu-db-1" as healthy
```

### Run database migrations
```powershell
# From the backend/ folder
alembic upgrade head
```

### Seed the database (data engineering — run once)
```powershell
# From the backend/ folder (in order!)
python -m app.seed.cities        # ~33,000 world cities from GeoNames
python -m app.seed.cost_index    # cost-of-living index per country
python -m app.seed.activities    # ~4,000 activities from OpenTripMap API
python -m app.seed.photos        # city photos from Pexels API (top 200 cities)
python -m app.seed.embeddings    # AI embeddings for semantic search
```

### Start the API server
```powershell
uvicorn app.main:app --reload
```

Visit **http://localhost:8000/docs** to see the full interactive API documentation.

---

## 4. Database Schema — All 16 Tables

### Core Tables

| Table | Description |
|---|---|
| `users` | Registered users. Has `is_admin` flag. |
| `cities` | ~33,000 world cities. Has `lat`, `lng`, `cost_index`, `popularity_score`, `photo_url`, `embedding` (JSON string). |
| `activity_templates` | ~4,000 seeded activities linked to cities. Has `category`, `avg_cost`, `embedding`. |
| `trips` | A user's travel plan. Has `name`, `start_date`, `end_date`, `total_budget`, `is_public`. |
| `trip_sections` | One city-stay within a trip. Linked to a `city_id`. Has `start_date`, `end_date`, `section_budget`. |
| `trip_activities` | A specific activity booked within a section. Has `template_id` (FK to activity_templates), `cost`, `scheduled_at`. |
| `expenses` | Per-trip or per-section expense records. Has `category`, `amount`, `currency`. |
| `invoices` | PDF invoice per trip. Generated by the invoice router. |
| `invoice_items` | Line items within an invoice. |
| `packing_items` | Checklist items for a trip. Has `is_packed` toggle. |
| `trip_notes` | Freeform notes attached to a trip or section. |
| `community_posts` | Public posts shared by users. Can reference a trip and a city. |
| `community_comments` | Comments on community posts. |
| `community_likes` | Likes on community posts (composite PK: user_id + post_id). |
| `saved_destinations` | Cities saved/bookmarked by a user (composite PK). |
| `trip_copies` | Records when a user copies a public trip template. |

### Key Column Rules (Frozen Contracts)
> These exact names are used in both the ORM models AND the API schemas. Never rename them.

| Column | Table | Type | Notes |
|---|---|---|---|
| `country` | `cities` | `String(100)` | Full country name e.g. "India". NOT `country_code`. |
| `embedding` | `cities`, `activity_templates` | `Text` | JSON string: `json.dumps([0.1, 0.2, ...])`. NOT a vector type. |
| `template_id` | `trip_activities` | FK → `activity_templates.id` | NOT `activity_template_id`. |
| `id` | `users`, `trips`, `trip_sections`, `trip_activities` | `String(36)` (UUID) | NOT integer. |
| `id` | `cities`, `activity_templates` | `Integer` (auto) | NOT UUID. |
| `is_admin` | `users` | `Boolean` | No `last_active` column exists. |

---

## 5. Models — What Each File Does

All models live in `backend/app/models/`. Each file maps to a group of database tables.

### `models/base.py`
Defines shared SQLAlchemy base class and helper column factories:
- `Base` — all models inherit from this
- `uuid_pk()` — auto-generates a UUID primary key
- `created_at_col()` — auto-sets timestamp on insert
- `updated_at_col()` — auto-updates timestamp on every update

### `models/user.py` → `User`
Fields: `id` (UUID str), `email`, `password_hash`, `first_name`, `last_name`, `phone`, `city`, `country`, `photo_url`, `additional_info`, `language`, `is_admin`, `created_at`

### `models/city.py` → `City`, `ActivityTemplate`
**City** fields: `id` (int), `name`, `country`, `region`, `lat`, `lng`, `cost_index`, `popularity_score`, `photo_url`, `description`, `embedding` (Text/JSON)

**ActivityTemplate** fields: `id` (int), `city_id`, `name`, `category`, `avg_cost`, `avg_duration_min`, `description`, `photo_url`, `embedding` (Text/JSON)

### `models/trip.py` → `Trip`, `SavedDestination`, `TripCopy`
**Trip** fields: `id` (UUID), `user_id`, `name`, `description`, `start_date`, `end_date`, `cover_photo_url`, `total_budget`, `is_public`, `public_slug`, `is_template`, `created_at`, `updated_at`

### `models/section.py` → `TripSection`
Fields: `id` (UUID), `trip_id`, `city_id`, `title`, `description`, `start_date`, `end_date`, `section_budget`, `order_index`

### `models/activity.py` → `TripActivity`
Fields: `id` (UUID), `section_id`, `template_id`, `name`, `category`, `cost`, `duration_min`, `scheduled_at`, `notes`, `order_index`

### `models/expense.py` → `Expense`
Fields: `id` (UUID), `trip_id`, `section_id`, `category`, `description`, `amount`, `currency`, `paid_at`

### `models/invoice.py` → `Invoice`, `InvoiceItem`
Stores generated invoice data and its line items.

### `models/packing.py` → `PackingItem`
Fields: `id` (UUID), `trip_id`, `name`, `category` (one of: documents/clothing/electronics/toiletries/other), `is_packed`, `order_index`

### `models/notes.py` → `TripNote`
Fields: `id` (UUID), `trip_id`, `section_id`, `title`, `content`, `day_index`

### `models/community.py` → `CommunityPost`, `CommunityComment`, `CommunityLike`
Posts can reference a trip and city. Likes use composite PK.

---

## 6. Routers — All API Endpoints

All routers live in `backend/app/routers/`. Prefix is set in `main.py`.

### `auth.py` → prefix `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create new user account |
| POST | `/auth/login` | Login, returns JWT access token |
| GET | `/auth/me` | Get current logged-in user profile |

### `users.py` → prefix `/users`
| Method | Path | Description |
|---|---|---|
| GET | `/users/{id}` | Get user profile by ID |
| PATCH | `/users/{id}` | Update profile (name, photo, etc.) |

### `trips.py` → prefix `/trips`
| Method | Path | Description |
|---|---|---|
| GET | `/trips` | List all trips for current user |
| POST | `/trips` | Create a new trip |
| GET | `/trips/{id}` | Get full trip details |
| PATCH | `/trips/{id}` | Update trip metadata |
| DELETE | `/trips/{id}` | Delete a trip |
| POST | `/trips/{id}/copy` | Copy a public trip template |
| GET | `/trips/public/{slug}` | Get a public trip by its slug |

### `sections.py` → prefix `/sections`
| Method | Path | Description |
|---|---|---|
| GET | `/trips/{trip_id}/sections` | List sections of a trip |
| POST | `/trips/{trip_id}/sections` | Add a new city section to a trip |
| PATCH | `/sections/{id}` | Update section (dates, budget, title) |
| DELETE | `/sections/{id}` | Delete a section |

### `activities.py` → prefix `/activities`
| Method | Path | Description |
|---|---|---|
| GET | `/sections/{section_id}/activities` | List activities in a section |
| POST | `/sections/{section_id}/activities` | Add activity to a section |
| PATCH | `/activities/{id}` | Update an activity |
| DELETE | `/activities/{id}` | Remove an activity |

### `cities.py` → prefix `/cities` (no prefix — full path inside)
| Method | Path | Description |
|---|---|---|
| GET | `/cities` | List/filter/search cities (name, country, pagination) |
| GET | `/cities/{id}` | Get single city details |
| GET | `/cities/recommended` | Top cities by popularity_score |
| POST | `/cities/semantic-search` | Semantic search using embedding similarity |

### `expenses.py` → no prefix (full paths inside)
| Method | Path | Description |
|---|---|---|
| GET | `/trips/{trip_id}/expenses` | List all expenses for a trip |
| POST | `/trips/{trip_id}/expenses` | Add expense |
| PATCH | `/expenses/{id}` | Update expense |
| DELETE | `/expenses/{id}` | Delete expense |

### `packing.py` → no prefix
| Method | Path | Description |
|---|---|---|
| GET | `/trips/{trip_id}/packing` | Get packing list |
| POST | `/trips/{trip_id}/packing` | Add item |
| PATCH | `/packing/{id}` | Toggle is_packed / update item |
| DELETE | `/packing/{id}` | Remove item |
| DELETE | `/trips/{trip_id}/packing` | Reset entire list |

### `notes.py` → no prefix
| Method | Path | Description |
|---|---|---|
| GET | `/trips/{trip_id}/notes` | List notes |
| POST | `/trips/{trip_id}/notes` | Create note |
| PATCH | `/notes/{id}` | Update note |
| DELETE | `/notes/{id}` | Delete note |

### `community.py` → prefix `/community`
| Method | Path | Description |
|---|---|---|
| GET | `/community/posts` | List public posts (feed) |
| POST | `/community/posts` | Create a post |
| GET | `/community/posts/{id}` | Get single post with comments |
| POST | `/community/posts/{id}/comments` | Add comment |
| POST | `/community/posts/{id}/like` | Toggle like on a post |

### `invoice.py` → no prefix
| Method | Path | Description |
|---|---|---|
| GET | `/trips/{trip_id}/invoice` | Get or generate PDF invoice for a trip |

### `ai.py` → prefix `/ai`
| Method | Path | Description |
|---|---|---|
| POST | `/ai/suggest` | AI trip suggestions using Groq/Gemini |

### `admin.py` → prefix `/admin` ⭐ (our work)
| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Overall counts: users, trips, active users in 30d |
| GET | `/admin/popular/cities` | Top cities ranked by trip section count |
| GET | `/admin/popular/activities` | Top activities ranked by usage count |
| GET | `/admin/users` | Full user list with trip counts and last active date |
| GET | `/admin/trends` | Daily trip creation counts over N days |
| GET | `/admin/recent` | Most recently created trips |

> All `/admin/*` endpoints require `is_admin=True` on the authenticated user.

---

## 7. Seed Pipeline — What Each Script Does

These scripts in `backend/app/seed/` populate the database with real-world data. They are **idempotent** (safe to run multiple times — uses `ON CONFLICT DO NOTHING`).

### Order matters — run them in sequence:

```
cities → cost_index → activities → photos → embeddings
```

### `seed/cities.py`
- Downloads `cities15000.zip` from GeoNames (free, ~5MB)
- Parses 33,645 real world cities with population > 0
- Calculates `popularity_score` = `log(population) / log(max_population)` → value between 0 and 1
- Maps ISO country codes to full country names (e.g. "IN" → "India")
- Bulk inserts into `cities` table using chunked upserts (1,000 rows at a time)
- Caches the zip file in `backend/data/` so repeat runs don't re-download

### `seed/cost_index.py`
- Reads `backend/data/Cost_of_Living_Index_by_Country_2024.csv` (Numbeo dataset)
- Fuzzy-matches CSV country names to `cities.country` using `rapidfuzz`
- UPDATEs `cost_index` for all cities in each matched country
- Result: ~27,000 of 33,000 cities get a cost index value

### `seed/activities.py`
- Requires `OPENTRIPMAP_KEY` in `.env`
- Takes the top 100 cities by `popularity_score`
- For each city, calls OpenTripMap's radius API to fetch up to 50 nearby places
- Maps OpenTripMap "kinds" to our simplified categories: `sightseeing`, `adventure`, `relaxation`, `food`, `shopping`, `nightlife`
- Estimates `avg_cost` in USD based on the place type
- Inserts ~3,900 rows into `activity_templates`

### `seed/photos.py`
- Requires `PEXELS_API_KEY` in `.env`
- Takes top 200 cities by popularity
- Searches Pexels for a landscape photo of each city
- Updates `cities.photo_url` with the best result
- Rate-limited to stay within Pexels free tier

### `seed/embeddings.py`
- Downloads `all-MiniLM-L6-v2` model (~80 MB, cached after first run)
- Generates 384-dimension embeddings for all cities and activity templates
- Stores as `json.dumps([...])` in the `embedding` TEXT column
- Used by the `/cities/semantic-search` endpoint to find cities by natural language query

### `seed/run_all.py`
- Orchestrator that runs all 5 scripts in order
- `python -m app.seed.run_all`

---

## 8. Core Module — What Each File Does

### `core/config.py`
Reads all environment variables from `.env` using Pydantic `BaseSettings`. Exposes a single `settings` object imported everywhere:
```python
from app.core.config import settings
settings.DATABASE_URL  # etc.
```

### `core/db.py`
- Creates the SQLAlchemy `engine` using `settings.DATABASE_URL`
- Provides `SessionLocal` (session factory)
- Provides `get_db()` — FastAPI dependency that yields a DB session and closes it after each request
```python
# Usage in any router:
def my_endpoint(db: Session = Depends(get_db)):
    ...
```

### `core/security.py`
- `hash_password(plain)` — bcrypt hashes a password
- `verify_password(plain, hashed)` — checks a password
- `create_access_token(user_id)` — creates a signed JWT
- `get_current_user(token, db)` — FastAPI dependency, validates JWT, returns User
- `get_admin_user(user)` — dependency that raises 403 if `user.is_admin` is False

---

## 9. Authentication Flow

1. User POSTs to `/auth/register` with `email` + `password`
2. Server bcrypt-hashes the password, saves `User` row
3. User POSTs to `/auth/login` → server verifies password, returns `{"access_token": "...", "token_type": "bearer"}`
4. Client stores the token and sends it with every request as:
   ```
   Authorization: Bearer <token>
   ```
5. Protected routes use `Depends(get_current_user)` — FastAPI automatically validates the token

---

## 10. Schemas — Pydantic Request/Response Shapes

All schemas live in `backend/app/schemas/`. They define what the API accepts and returns.

### `schemas/admin.py` (frozen — do not change field names)
```python
AdminStats:       total_users, total_trips, trips_today, active_users_30d
PopularCity:      city_id, name, country, visit_count
PopularActivity:  template_id, name, city_name, usage_count
UserAdminView:    id, email, first_name, last_name, trip_count, last_active, is_admin, created_at
TrendPoint:       date, trips_created
```

---

## 11. Git Workflow

### Branches
| Branch | Owner | Purpose |
|---|---|---|
| `main` | Rupesh | Integration branch — all PRs merge here |
| `feat/data-admin` | Harshal/Onkar | ✅ Complete — seed scripts + admin endpoints |
| `feat/core` | Rupesh/Aniket | Core models, auth, trips, sections, activities |
| `feat/frontend` | Frontend team | React/Vite UI |

### How to contribute
```powershell
# Always branch off main
git checkout main
git pull origin main
git checkout -b feat/your-feature

# Make changes, then:
git add .
git commit -m "feat(scope): description"
git push origin feat/your-feature

# Open a Pull Request on GitHub → Rupesh reviews and merges
```

### Never do
- ❌ Never push directly to `main`
- ❌ Never rename frozen column names (see Section 4)
- ❌ Never add your own `models/__init__.py` — it already exists
- ❌ Never commit your `.env` file (it's in `.gitignore`)

---

## 12. What Has Been Built — Status

### ✅ Completed (feat/data-admin — Harshal/Onkar)
- [x] `traveloop_schema.sql` — full 16-table schema (merged into main via alembic)
- [x] `seed/cities.py` — 33,645 cities seeded
- [x] `seed/cost_index.py` — 27,866 cities have cost index
- [x] `seed/activities.py` — 3,929 activity templates seeded
- [x] `seed/photos.py` — 200 city photos from Pexels
- [x] `seed/embeddings.py` — 384-dim vectors for all cities + activities
- [x] `routers/admin.py` — 6 analytics endpoints (`/stats`, `/popular/cities`, `/popular/activities`, `/users`, `/trends`, `/recent`)

### ✅ Completed (feat/core — Rupesh/Aniket)
- [x] All 16 SQLAlchemy ORM models (split into individual files)
- [x] Auth: register, login, JWT validation
- [x] Trips: full CRUD
- [x] Sections: full CRUD
- [x] Activities: full CRUD
- [x] Community: posts, comments, like toggle
- [x] Notes: CRUD per trip/section
- [x] Packing: list/add/toggle/delete/reset
- [x] Expenses: CRUD
- [x] Cities: list/filter/search/recommended/semantic-search stub

### 🔄 In Progress
- [ ] `routers/ai.py` — AI trip suggestions (Groq/Gemini)
- [ ] `routers/invoice.py` — PDF generation (WeasyPrint)
- [ ] Frontend integration

---

## 13. Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `password authentication failed for user "traveloop"` | Wrong port — local Postgres is on 5432, Docker is on 5433 | Set `DATABASE_URL` with port `5433` in `.env` |
| `No module named 'app.core.security'` | `security.py` doesn't exist yet | The file is in `core/security.py` — make sure it's on your branch |
| `UnicodeEncodeError: 'charmap'` | Windows terminal encoding | Run with `$env:PYTHONIOENCODING="utf-8"` prefix |
| `column "country_code" does not exist` | Using old column name | Use `country` not `country_code` in `cities` table |
| `column "last_active" does not exist` | Non-existent column | Use `MAX(Trip.created_at)` grouped by user instead |
| `column "activity_template_id" does not exist` | Wrong FK name | Use `template_id` in `trip_activities` table |

---

## 14. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full PostgreSQL connection string |
| `JWT_SECRET_KEY` | ✅ | Any random string for signing JWTs |
| `JWT_ALGORITHM` | ✅ | Always `HS256` |
| `JWT_EXPIRE_HOURS` | ✅ | Token expiry (use `24`) |
| `FRONTEND_URL` | ✅ | For CORS — `http://localhost:5173` |
| `OPENTRIPMAP_KEY` | Seed only | Free at opentripmap.io — needed for `seed/activities.py` |
| `PEXELS_API_KEY` | Seed only | Free at pexels.com/api — needed for `seed/photos.py` |
| `GROQ_API_KEY` | AI features | Free at console.groq.com |
| `GEMINI_API_KEY` | AI features | Free at aistudio.google.com |

---

*Last updated: 2026-05-10 by Harshal/Onkar — Data Engineering & Admin Analytics*
