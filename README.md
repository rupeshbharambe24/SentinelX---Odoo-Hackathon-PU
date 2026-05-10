<div align="center">

<img src="https://api.iconify.design/lucide:database-zap.svg?color=%2306b6d4&width=72" width="72" alt="data" />

# Traveloop · `feat/data-admin`

### Data engineering pipeline + admin analytics

Branch owner: **Harshal More** ([@HaRsH-2102](https://github.com/HaRsH-2102))
Final integrated state: [**`main`**](../../tree/main)

[![Branch](https://img.shields.io/badge/branch-feat%2Fdata--admin-714B67)]()
[![Merged](https://img.shields.io/badge/merged_to-main-success)]()
[![Cities seeded](https://img.shields.io/badge/cities-33%2C645-blue)]()
[![Activities seeded](https://img.shields.io/badge/activity_templates-5%2C053-blue)]()

</div>

---

## What this branch contains

The data layer and admin surface of Traveloop — what fills the otherwise-empty Postgres database with **real curated catalog data**, and exposes platform-wide analytics for admins.

This branch was rebased onto `main` and merged. The work is now integrated into [main](../../tree/main); this branch is preserved for authorship traceability.

---

## 📦 Deliverables

### 1. Seed pipeline — 5 idempotent scripts

| Script | Source | Output | Notes |
|---|---|---|---|
| `app/seed/cities.py` | GeoNames `cities15000.zip` | **33,645** rows in `cities` | Bulk insert with `ON CONFLICT DO NOTHING`; populates `name, country, lat/lng, popularity_score` |
| `app/seed/cost_index.py` | Numbeo Cost-of-Living-Index 2024 CSV | **27,866** cities (83%) updated with `cost_index` | RapidFuzz matches CSV country names to denormalised `cities.country` |
| `app/seed/activities.py` | OpenTripMap radius API | **5,053** rows in `activity_templates` | Top-100 cities by population + 30 hand-picked tourist cities, 4 OpenTripMap kinds (`interesting_places, foods, amusements, cultural`) |
| `app/seed/photos.py` | Pexels API + Wikipedia REST | **427** cities with `photo_url` | Pexels for top-200 (curated quality), Wikipedia fallback for the long tail with `ThreadPoolExecutor(8)` parallelism |
| `app/seed/embeddings.py` | sentence-transformers `all-MiniLM-L6-v2` | **38,698** vectors stored as JSON-encoded text | Cosine similarity computed in Python at query time |

Run it all:
```bash
python -m app.seed.run_all
```
Or step-by-step:
```bash
python -m app.seed.cities
python -m app.seed.cost_index
python -m app.seed.activities
python -m app.seed.photos          # accepts --pexels-only / --wikimedia-only / --limit N
python -m app.seed.embeddings
```

### 2. Cost-of-living dataset

`backend/data/Cost_of_Living_Index_by_Country_2024.csv` — 122 countries · 12 KB. Drives the country-level cost index that gets fuzzy-matched onto every city.

### 3. Admin endpoints — 6 routes

All gated by `Depends(get_admin_user)` (403 if non-admin):

| Endpoint | Purpose |
|---|---|
| `GET /admin/stats` | total_users · total_trips · trips_today · active_users_30d (active = created a trip in last 30d, since users.last_active doesn't exist) |
| `GET /admin/popular/cities?limit=` | Top cities by `COUNT(trip_sections)` group-by |
| `GET /admin/popular/activities?limit=` | Top activity templates by `COUNT(trip_activities)` |
| `GET /admin/users` | Per-user trip count + last_active = MAX(trip.created_at) |
| `GET /admin/trends?days=` | Trips created per day for the last N days |
| `GET /admin/recent` | Most recently created trips (free-form dict response) |

---

## 🏗️ Decisions

- **Why Pexels + Wikipedia for photos?** Pexels free tier is 200 req/hr → only the top-200 cities get curated quality. Wikipedia REST (`/api/rest_v1/page/summary/{title}`) has no rate limit and covers the long tail. The combo gives ~2× the coverage of Pexels-only.
- **Why store embeddings as JSON-text instead of `pgvector`?** Render's free Postgres tier doesn't have the `vector` extension. JSON-text in a `Text` column works on every Postgres deployment, and query-time cosine in Python is fast enough for our scale (~50ms over 2000 candidates).
- **Why fuzzy-match cost index on country name?** Numbeo only publishes a country-level index, not city-level. RapidFuzz with `score_cutoff=80` catches "USA"/"United States" and "South Korea"/"Korea, Republic of" without false positives.
- **Idempotency by design.** Every seed step uses `ON CONFLICT DO NOTHING` (Postgres) or filters by `IS NULL` for backfill. Re-running any step is safe.

---

## 📍 Files added on this branch

```
backend/app/seed/
├─ cities.py           137 lines · GeoNames downloader + bulk insert
├─ cost_index.py       149 lines · CSV fuzzy-match + UPDATE
├─ activities.py       205 lines · OpenTripMap + tourist cities + category mapping
├─ photos.py           181 lines · Pexels + parallel Wikipedia fallback
├─ embeddings.py       100 lines · sentence-transformers + batched commit
└─ run_all.py           49 lines · orchestrator with per-step timing

backend/app/routers/admin.py    183 lines · 6 endpoints (admin-gated)
backend/data/Cost_of_Living_Index_by_Country_2024.csv    122 rows
```

Total: **8 new files · ~1,000 lines of Python · 1 dataset**.

---

## 🤝 Coordination with the team

- **Frozen contract respected** — admin endpoints write against `app/schemas/admin.py` (defined by Rupesh) without modification: `AdminStats`, `PopularCity`, `PopularActivity`, `UserAdminView`, `TrendPoint`.
- **No model changes** — admin queries use the existing `User`, `Trip`, `TripSection`, `City`, `ActivityTemplate` tables. `last_active` is computed on the fly from `MAX(trip.created_at)` rather than added as a column, since that would have un-frozen the `users` schema.
- **No prefix double-up** — `admin.py` declares `APIRouter()` (no prefix); `main.py` adds `prefix="/admin"`.

---

<div align="center">

[← Back to main](../../tree/main) · [Author commits](../../commits/feat/data-admin?author=HaRsH-2102)

</div>
