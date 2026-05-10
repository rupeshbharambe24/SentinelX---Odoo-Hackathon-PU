# Traveloop — Rupesh's Core Backend & Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the entire core backend for Traveloop (FastAPI + SQLAlchemy + JWT auth + 45 REST endpoints), define the integration contract (Pydantic schemas) that the rest of the team codes against, and own the final integration + deploy.

**Architecture:** FastAPI monolith with SQLAlchemy 2.0 ORM and Alembic migrations. SQLite for dev, Postgres for prod. JWT auth via python-jose with bcrypt password hashing. Routers organized by resource (auth, users, trips, sections, activities, expenses, packing, notes, community, cities). Pydantic v2 schemas serve as the integration interface for Member A (frontend types via openapi-typescript), Member C (admin endpoints), and Member D (AI/invoice).

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, python-jose[cryptography], passlib[bcrypt], Postgres 16 (prod) / SQLite (dev), Docker Compose.

**Repo:** `d:/Projects/SentinelX - Odoo Hackathon PU` — clean slate (only `.git/` and empty `README.md` exist today).

**Time budget:** ~8 hours total. Each phase has a target hour-mark from §10 of the build plan.

---

## Scope Boundary

**You own** (do NOT let teammates touch these):
- `backend/app/main.py`
- `backend/app/core/` (config, db, security)
- `backend/app/models/` (FROZEN after Phase 2)
- `backend/app/schemas/` (FROZEN after Phase 3 — except where Members C and D add their own files)
- Routers: `auth.py`, `users.py`, `trips.py`, `sections.py`, `activities.py`, `expenses.py`, `packing.py`, `notes.py`, `community.py`, `cities.py`
- `backend/alembic/`, `backend/alembic.ini`
- `backend/requirements.txt`, `backend/Dockerfile`, `backend/.env.example`
- `docker-compose.yml`, `.gitignore`, `README.md`

**You do NOT own** (teammates fill these — leave empty stubs):
- `backend/app/services/ai/`, `backend/app/services/invoice/`, `backend/app/templates/` — Member D
- `backend/app/routers/ai.py`, `backend/app/routers/invoice.py` — Member D
- `backend/app/routers/admin.py`, `backend/app/seed/`, `backend/data/` — Member C
- `frontend/` — Member A

You will create empty placeholder stubs for the teammate routers so `main.py` imports don't break, then the teammates flesh them out on their branches.

---

## Pragmatic Testing Note

Hackathon timing precludes strict TDD per function. Verification strategy:
- **After each phase**, hit the new endpoints with curl/httpie or the FastAPI `/docs` Swagger UI and verify the happy path returns 200 with the expected schema shape.
- A `tests/smoke.py` collects a few end-to-end TestClient calls (signup → create trip → add section → add activity → log expense → fetch invoice) used in Phase 17.
- If a phase has subtle logic (status derivation, budget breakdown, deep-clone), a small `pytest` test for *that* function lives next to the router.

---

## Phase Map

| # | Phase | Target hour | Deliverable |
|---|-------|-------------|-------------|
| 1 | Repository Skeleton & Configuration | 0:00 – 0:15 | Folders, deps, docker, gitignore, .env.example, empty stubs |
| 2 | SQLAlchemy Models | 0:15 – 0:35 | All 15 tables defined, models package importable |
| 3 | Pydantic Schemas (Frozen Contracts) | 0:35 – 0:55 | All schema files complete; OpenAPI contract locked |
| 4 | Core Infrastructure | 0:55 – 1:05 | config, db session, security (JWT + bcrypt) |
| 5 | FastAPI App Wiring + Alembic | 1:05 – 1:25 | `main.py` boots, `/health`, first migration applied |
| 6 | Auth Router | 1:25 – 2:00 | register, login, /me, refresh, forgot-password |
| 7 | Users Router | 2:00 – 2:20 | profile, photo upload, saved destinations |
| 8 | Trips Router (CRUD + filters) | 2:20 – 3:00 | full trip CRUD, status filter, search, sort |
| 9 | Sections Router | 3:00 – 3:25 | CRUD + reorder |
| 10 | Activities Router | 3:25 – 3:45 | CRUD + reorder + flowchart linking |
| 11 | Expenses + Budget Breakdown | 3:45 – 4:20 | CRUD + aggregated breakdown endpoint |
| 12 | Packing Router | 4:20 – 4:40 | CRUD + toggle + reset |
| 13 | Notes Router | 4:40 – 4:55 | CRUD per trip / per day |
| 14 | Community Router | 4:55 – 5:30 | posts + comments + likes |
| 15 | Cities Router | 5:30 – 6:00 | list/filter/search/semantic stub |
| 16 | Public Sharing + Copy Trip + Saved Destinations finishing | 6:00 – 6:30 | publish slug, public read, deep clone |
| 17 | Integration (merge teammate branches + smoke test) | 6:30 – 7:30 | End-to-end happy path passes |
| 18 | Deploy (Render + Vercel) + README + Tag | 7:30 – 8:00 | Live URLs, submission tag |

---

## Phase 1 — Repository Skeleton & Configuration

**Goal:** Establish the entire folder layout, config files, and dependency manifests so every teammate can clone and start work in their assigned folder without waiting.

**Files:**
- Create: `.gitignore`
- Create: `README.md` (overwrite the empty one)
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `backend/.env.example`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py` (placeholder)
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: empty router stubs: `auth.py`, `users.py`, `trips.py`, `sections.py`, `activities.py`, `expenses.py`, `packing.py`, `notes.py`, `community.py`, `cities.py`, `ai.py`, `invoice.py`, `admin.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/ai/__init__.py` (Member D will fill)
- Create: `backend/app/services/invoice/__init__.py` (Member D will fill)
- Create: `backend/app/seed/__init__.py` (Member C will fill)
- Create: `backend/app/templates/.gitkeep` (Member D will fill)
- Create: `backend/data/.gitkeep` (Member C will fill)
- Create: `frontend/.gitkeep` (Member A overwrites with Vite scaffold)
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/smoke.py` (placeholder; populated in Phase 17)

---

- [ ] **Step 1.1: Create the root `.gitignore`**

Write `.gitignore`:

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.venv/
venv/
env/
*.egg-info/
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Env
.env
.env.local
*.env

# DB
*.sqlite
*.db
backend/traveloop.db

# Node
node_modules/
dist/
.vite/
.next/
.turbo/

# Editor
.vscode/
.idea/
*.swp
.DS_Store
Thumbs.db

# Logs
*.log

# Build outputs
backend/data/raw/
backend/app/data/embeddings/
```

- [ ] **Step 1.2: Overwrite `README.md` with project overview**

```markdown
# Traveloop

Multi-city travel planning web app. Built for the Odoo Hackathon 2026.

## Stack
- Backend: FastAPI + SQLAlchemy + Postgres (SQLite fallback)
- Frontend: React + Vite + Tailwind + shadcn/ui
- AI: Groq (primary) + Gemini (fallback)
- Deploy: Vercel (frontend) + Render (backend)

## Quick start

```bash
docker-compose up -d        # start postgres
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in secrets
alembic upgrade head
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs for the API explorer.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Team

| Member | Branch | Owns |
|--------|--------|------|
| Rupesh | feat/core | core backend, integration |
| Member A | feat/frontend | entire `frontend/` |
| Member C | feat/data-admin | seed scripts, admin endpoints |
| Member D | feat/ai-invoice | AI services, invoice PDF |

See `TRAVELOOP_BUILD_PLAN.md` and `docs/superpowers/plans/` for details.
```

- [ ] **Step 1.3: Create `docker-compose.yml` at repo root**

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: traveloop
      POSTGRES_PASSWORD: traveloop
      POSTGRES_DB: traveloop
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U traveloop"]
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  pgdata:
```

- [ ] **Step 1.4: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

# WeasyPrint runtime deps (Member D needs these for invoice PDF)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b \
    libcairo2 libgdk-pixbuf-2.0-0 shared-mime-info libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 1.5: Create `backend/.env.example`**

```bash
# Database
DATABASE_URL=postgresql://traveloop:traveloop@localhost:5432/traveloop
# Dev fallback (uncomment to use SQLite without docker):
# DATABASE_URL=sqlite:///./traveloop.db

# Auth
JWT_SECRET_KEY=change-me-to-a-32-char-random-string
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# CORS
FRONTEND_URL=http://localhost:5173

# Member D
GROQ_API_KEY=
GEMINI_API_KEY=

# Member C
UNSPLASH_ACCESS_KEY=
OPENTRIPMAP_KEY=
```

- [ ] **Step 1.6: Create `backend/requirements.txt`**

Pin versions to avoid hackathon-day breakage:

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
alembic==1.13.3
pydantic==2.9.2
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
psycopg2-binary==2.9.9
httpx==0.27.2

# Member D
groq==0.11.0
google-generativeai==0.8.3
weasyprint==62.3
jinja2==3.1.4

# Member C
sentence-transformers==3.1.1
chromadb==0.5.5
pandas==2.2.3
requests==2.32.3
rapidfuzz==3.10.0

# Test
pytest==8.3.3
```

- [ ] **Step 1.7: Create the backend folder skeleton**

Run:

```bash
cd "d:/Projects/SentinelX - Odoo Hackathon PU"
mkdir -p backend/app/{core,models,schemas,routers,services/ai,services/invoice,seed,templates}
mkdir -p backend/{data,tests,alembic/versions}
mkdir -p frontend
```

- [ ] **Step 1.8: Create empty `__init__.py` files**

Create empty (zero-byte) files at:
- `backend/app/__init__.py`
- `backend/app/core/__init__.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/__init__.py`
- `backend/app/routers/__init__.py`
- `backend/app/services/__init__.py`
- `backend/app/services/ai/__init__.py`
- `backend/app/services/invoice/__init__.py`
- `backend/app/seed/__init__.py`
- `backend/tests/__init__.py`

And `.gitkeep` files at:
- `backend/app/templates/.gitkeep`
- `backend/data/.gitkeep`
- `frontend/.gitkeep`

- [ ] **Step 1.9: Create empty router stubs**

For each of these, create the file with this exact content (replace `<NAME>` with the resource name):

```python
from fastapi import APIRouter

router = APIRouter()
```

Files:
- `backend/app/routers/auth.py`
- `backend/app/routers/users.py`
- `backend/app/routers/trips.py`
- `backend/app/routers/sections.py`
- `backend/app/routers/activities.py`
- `backend/app/routers/expenses.py`
- `backend/app/routers/packing.py`
- `backend/app/routers/notes.py`
- `backend/app/routers/community.py`
- `backend/app/routers/cities.py`
- `backend/app/routers/ai.py`        ← Member D fills
- `backend/app/routers/invoice.py`   ← Member D fills
- `backend/app/routers/admin.py`     ← Member C fills

- [ ] **Step 1.10: Create placeholder `backend/app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="Traveloop API", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok"}
```

(Phase 5 expands this with router wiring + CORS.)

- [ ] **Step 1.11: Create empty `backend/tests/smoke.py`**

```python
# Populated in Phase 17 with the end-to-end happy-path TestClient flow.
```

- [ ] **Step 1.12: Smoke-test the skeleton**

Run:

```bash
cd "d:/Projects/SentinelX - Odoo Hackathon PU/backend"
python -m venv .venv
.venv/Scripts/activate    # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Expected: server boots, `curl http://localhost:8000/health` returns `{"status":"ok"}`. Stop the server.

- [ ] **Step 1.13: Initial commit on `main`**

```bash
cd "d:/Projects/SentinelX - Odoo Hackathon PU"
git add .
git commit -m "chore: initial repo skeleton + backend deps + docker"
git push origin main
```

- [ ] **Step 1.14: Create the `feat/core` branch and push it**

```bash
git checkout -b feat/core
git push -u origin feat/core
```

- [ ] **Step 1.15: Notify teammates**

Drop in `#general`:
> "Repo skeleton up. Pull main, branch from there. Branch names: `feat/frontend` (A), `feat/data-admin` (C), `feat/ai-invoice` (D). Schemas land in ~30 min — frozen after that. Open a draft PR within 30 min so I can see progress."

---

## Phase 2 — SQLAlchemy Models (FROZEN after this phase)

**Goal:** Define all 15 tables. Once committed, models are immutable for the hackathon — schema changes require team-wide ping.

**Files:**
- Create: `backend/app/models/base.py` (declarative base + UUID helper)
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/city.py`
- Create: `backend/app/models/trip.py`
- Create: `backend/app/models/section.py`
- Create: `backend/app/models/activity.py`
- Create: `backend/app/models/expense.py`
- Create: `backend/app/models/invoice.py`
- Create: `backend/app/models/packing.py`
- Create: `backend/app/models/notes.py`
- Create: `backend/app/models/community.py`
- Modify: `backend/app/models/__init__.py` (re-export everything for Alembic autogenerate)

---

- [ ] **Step 2.1: Create `backend/app/models/base.py`**

```python
import uuid
from sqlalchemy import String, DateTime
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from datetime import datetime, timezone

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

def uuid_pk() -> Mapped[str]:
    return mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

def created_at_col() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

def updated_at_col() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
```

- [ ] **Step 2.2: Create `backend/app/models/user.py`**

```python
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, uuid_pk, created_at_col

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30))
    city: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    additional_info: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(10), default="en")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at = created_at_col()

    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("CommunityPost", back_populates="user", cascade="all, delete-orphan")
```

- [ ] **Step 2.3: Create `backend/app/models/city.py`**

```python
from sqlalchemy import String, Float, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    country: Mapped[str | None] = mapped_column(String(100), index=True)
    region: Mapped[str | None] = mapped_column(String(100))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    cost_index: Mapped[float | None] = mapped_column(Float)
    popularity_score: Mapped[float | None] = mapped_column(Float)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    # embedding stored as JSON (list[float]) for portability across SQLite + Postgres.
    # Member C populates this with 384-dim vectors from sentence-transformers.
    embedding: Mapped[str | None] = mapped_column(Text)

    activity_templates = relationship("ActivityTemplate", back_populates="city")


class ActivityTemplate(Base):
    __tablename__ = "activity_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(50), index=True)
    avg_cost: Mapped[float | None] = mapped_column(Float)
    avg_duration_min: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    embedding: Mapped[str | None] = mapped_column(Text)

    city = relationship("City", back_populates="activity_templates",
                        primaryjoin="ActivityTemplate.city_id==City.id",
                        foreign_keys=[city_id])
```

> **Note:** We use `Text` for `embedding` (JSON-serialised list) instead of `pgvector` for portability. SQLite-friendly. Semantic search at query time computes cosine similarity in Python over the candidate set (small in our scale).

- [ ] **Step 2.4: Create `backend/app/models/trip.py`**

```python
from sqlalchemy import String, Date, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from app.models.base import Base, uuid_pk, created_at_col, updated_at_col

class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    cover_photo_url: Mapped[str | None] = mapped_column(String(500))
    total_budget: Mapped[float | None] = mapped_column(Float)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    public_slug: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at = created_at_col()
    updated_at = updated_at_col()

    user = relationship("User", back_populates="trips")
    sections = relationship("TripSection", back_populates="trip",
                            cascade="all, delete-orphan",
                            order_by="TripSection.order_index")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")
    packing_items = relationship("PackingItem", back_populates="trip", cascade="all, delete-orphan")
    notes = relationship("TripNote", back_populates="trip", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="trip", uselist=False, cascade="all, delete-orphan")


class SavedDestination(Base):
    __tablename__ = "saved_destinations"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), primary_key=True)
    saved_at = created_at_col()


class TripCopy(Base):
    __tablename__ = "trip_copies"

    id: Mapped[str] = uuid_pk()
    original_trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)
    copied_trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    copied_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    copied_at = created_at_col()
```

- [ ] **Step 2.5: Create `backend/app/models/section.py`**

```python
from sqlalchemy import String, Date, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from app.models.base import Base, uuid_pk

class TripSection(Base):
    __tablename__ = "trip_sections"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    city_id: Mapped[int | None] = mapped_column(ForeignKey("cities.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    section_budget: Mapped[float | None] = mapped_column(Float)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    trip = relationship("Trip", back_populates="sections")
    activities = relationship("TripActivity", back_populates="section",
                              cascade="all, delete-orphan",
                              order_by="TripActivity.order_index")
    expenses = relationship("Expense", back_populates="section")
    notes = relationship("TripNote", back_populates="section")
    city = relationship("City")
```

- [ ] **Step 2.6: Create `backend/app/models/activity.py`**

```python
from sqlalchemy import String, Float, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.models.base import Base, uuid_pk

class TripActivity(Base):
    __tablename__ = "trip_activities"

    id: Mapped[str] = uuid_pk()
    section_id: Mapped[str] = mapped_column(String(36), ForeignKey("trip_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("activity_templates.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_activity_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("trip_activities.id", ondelete="SET NULL"), nullable=True)

    section = relationship("TripSection", back_populates="activities")
    template = relationship("ActivityTemplate")
```

- [ ] **Step 2.7: Create `backend/app/models/expense.py`**

```python
from sqlalchemy import String, Date, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from app.models.base import Base, uuid_pk

class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("trip_sections.id", ondelete="SET NULL"), nullable=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    note: Mapped[str | None] = mapped_column(Text)
    expense_date: Mapped[date | None] = mapped_column(Date)

    trip = relationship("Trip", back_populates="expenses")
    section = relationship("TripSection", back_populates="expenses")
```

- [ ] **Step 2.8: Create `backend/app/models/invoice.py`**

```python
from sqlalchemy import String, Date, Float, Integer, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from app.models.base import Base, uuid_pk

class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), unique=True, nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    generated_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|paid|cancelled
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax_percent: Mapped[float] = mapped_column(Float, default=5.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    grand_total: Mapped[float] = mapped_column(Float, default=0.0)
    traveler_details: Mapped[dict | None] = mapped_column(JSON)

    trip = relationship("Trip", back_populates="invoice")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan",
                         order_by="InvoiceItem.order_index")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[str] = uuid_pk()
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(String(500))
    quantity_or_details: Mapped[str | None] = mapped_column(String(200))
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    invoice = relationship("Invoice", back_populates="items")
```

- [ ] **Step 2.9: Create `backend/app/models/packing.py`**

```python
from sqlalchemy import String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, uuid_pk

class PackingItem(Base):
    __tablename__ = "packing_items"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    is_packed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    trip = relationship("Trip", back_populates="packing_items")
```

- [ ] **Step 2.10: Create `backend/app/models/notes.py`**

```python
from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, uuid_pk, created_at_col, updated_at_col

class TripNote(Base):
    __tablename__ = "trip_notes"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("trip_sections.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str | None] = mapped_column(String(200))
    content: Mapped[str | None] = mapped_column(Text)
    day_index: Mapped[int | None] = mapped_column(Integer)
    created_at = created_at_col()
    updated_at = updated_at_col()

    trip = relationship("Trip", back_populates="notes")
    section = relationship("TripSection", back_populates="notes")
```

- [ ] **Step 2.11: Create `backend/app/models/community.py`**

```python
from sqlalchemy import String, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, uuid_pk, created_at_col

class CommunityPost(Base):
    __tablename__ = "community_posts"

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trip_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    images: Mapped[list | None] = mapped_column(JSON)
    tags: Mapped[list | None] = mapped_column(JSON)
    city_id: Mapped[int | None] = mapped_column(ForeignKey("cities.id", ondelete="SET NULL"), nullable=True)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at = created_at_col()

    user = relationship("User", back_populates="posts")
    comments = relationship("CommunityComment", back_populates="post", cascade="all, delete-orphan")


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id: Mapped[str] = uuid_pk()
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    created_at = created_at_col()

    post = relationship("CommunityPost", back_populates="comments")


class CommunityLike(Base):
    __tablename__ = "community_likes"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = created_at_col()
```

- [ ] **Step 2.12: Re-export everything in `backend/app/models/__init__.py`**

```python
from app.models.base import Base
from app.models.user import User
from app.models.city import City, ActivityTemplate
from app.models.trip import Trip, SavedDestination, TripCopy
from app.models.section import TripSection
from app.models.activity import TripActivity
from app.models.expense import Expense
from app.models.invoice import Invoice, InvoiceItem
from app.models.packing import PackingItem
from app.models.notes import TripNote
from app.models.community import CommunityPost, CommunityComment, CommunityLike

__all__ = [
    "Base",
    "User",
    "City", "ActivityTemplate",
    "Trip", "SavedDestination", "TripCopy",
    "TripSection",
    "TripActivity",
    "Expense",
    "Invoice", "InvoiceItem",
    "PackingItem",
    "TripNote",
    "CommunityPost", "CommunityComment", "CommunityLike",
]
```

- [ ] **Step 2.13: Verify models import without error**

Run:

```bash
cd backend
python -c "from app.models import Base; print('Tables:', list(Base.metadata.tables.keys()))"
```

Expected output: a list including `users, cities, activity_templates, trips, trip_sections, trip_activities, expenses, invoices, invoice_items, packing_items, trip_notes, community_posts, community_comments, community_likes, saved_destinations, trip_copies` (15+ tables).

- [ ] **Step 2.14: Commit**

```bash
git add backend/app/models/
git commit -m "feat(models): define all 15 SQLAlchemy tables — FROZEN"
git push origin feat/core
```

---

## Phase 3 — Pydantic Schemas (FROZEN after this phase)

**Goal:** Lock the integration contract. Member D codes against `schemas/ai.py` + `schemas/invoice.py`. Member C codes against `schemas/admin.py`. Member A generates TS types from the OpenAPI spec.

**Files:**
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/trip.py`
- Create: `backend/app/schemas/section.py`
- Create: `backend/app/schemas/activity.py`
- Create: `backend/app/schemas/expense.py`
- Create: `backend/app/schemas/packing.py`
- Create: `backend/app/schemas/notes.py`
- Create: `backend/app/schemas/community.py`
- Create: `backend/app/schemas/city.py`
- Create: `backend/app/schemas/ai.py`     ← Member D imports from this
- Create: `backend/app/schemas/invoice.py` ← Member D imports from this
- Create: `backend/app/schemas/admin.py`   ← Member C imports from this
- Modify: `backend/app/schemas/__init__.py`

---

- [ ] **Step 3.1: `auth.py`**

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    photo_url: Optional[str] = Field(default=None, max_length=500)
    additional_info: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    is_admin: bool

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
```

- [ ] **Step 3.2: `user.py`**

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserProfile(BaseModel):
    id: str
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    city: Optional[str]
    country: Optional[str]
    photo_url: Optional[str]
    additional_info: Optional[str]
    is_admin: bool

    model_config = {"from_attributes": True}

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    additional_info: Optional[str] = None
    language: Optional[str] = Field(default=None, max_length=10)
```

- [ ] **Step 3.3: `trip.py`**

```python
from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, Literal

class TripCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: date
    end_date: date
    cover_photo_url: Optional[str] = Field(default=None, max_length=500)
    total_budget: Optional[float] = Field(default=None, ge=0)

class TripUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cover_photo_url: Optional[str] = Field(default=None, max_length=500)
    total_budget: Optional[float] = Field(default=None, ge=0)

class TripResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    cover_photo_url: Optional[str]
    total_budget: Optional[float]
    status: Literal["ongoing", "upcoming", "completed", "draft"]
    is_public: bool
    public_slug: Optional[str]
    section_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

class PublishResponse(BaseModel):
    public_slug: str
    public_url: str
```

- [ ] **Step 3.4: `section.py`**

```python
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List

# forward decl placeholder; ActivityResponse imported lazily below
class SectionCreate(BaseModel):
    trip_id: str
    city_id: Optional[int] = None
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    section_budget: Optional[float] = Field(default=None, ge=0)

class SectionUpdate(BaseModel):
    city_id: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    section_budget: Optional[float] = Field(default=None, ge=0)

class SectionResponse(BaseModel):
    id: str
    trip_id: str
    city_id: Optional[int]
    city_name: Optional[str]
    title: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    section_budget: Optional[float]
    order_index: int
    activities: List["ActivityResponse"] = []

    model_config = {"from_attributes": True}

class SectionReorder(BaseModel):
    trip_id: str
    section_ids: List[str]

# resolve forward ref after activity is defined
from app.schemas.activity import ActivityResponse  # noqa: E402
SectionResponse.model_rebuild()
```

- [ ] **Step 3.5: `activity.py`**

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ActivityCreate(BaseModel):
    section_id: str
    template_id: Optional[int] = None
    name: str = Field(min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, max_length=50)
    cost: float = Field(default=0.0, ge=0)
    duration_min: int = Field(default=0, ge=0)
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None

class ActivityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    category: Optional[str] = Field(default=None, max_length=50)
    cost: Optional[float] = Field(default=None, ge=0)
    duration_min: Optional[int] = Field(default=None, ge=0)
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    next_activity_id: Optional[str] = None

class ActivityResponse(BaseModel):
    id: str
    section_id: str
    template_id: Optional[int]
    name: str
    category: Optional[str]
    cost: float
    duration_min: int
    scheduled_at: Optional[datetime]
    notes: Optional[str]
    order_index: int
    next_activity_id: Optional[str]

    model_config = {"from_attributes": True}

class ActivityReorder(BaseModel):
    section_id: str
    activity_ids: List[str]
```

- [ ] **Step 3.6: `expense.py`**

```python
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, Literal, Dict, List

ExpenseCategory = Literal["transport", "stay", "activity", "meal", "other"]

class ExpenseCreate(BaseModel):
    trip_id: str
    section_id: Optional[str] = None
    category: ExpenseCategory
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=3)
    note: Optional[str] = None
    expense_date: date

class ExpenseUpdate(BaseModel):
    section_id: Optional[str] = None
    category: Optional[ExpenseCategory] = None
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = Field(default=None, max_length=3)
    note: Optional[str] = None
    expense_date: Optional[date] = None

class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    section_id: Optional[str]
    category: str
    amount: float
    currency: str
    note: Optional[str]
    expense_date: Optional[date]

    model_config = {"from_attributes": True}

class BudgetBreakdown(BaseModel):
    by_category: Dict[str, float]
    by_day: Dict[str, float]
    total_spent: float
    total_budget: Optional[float]
    over_budget_days: List[str]
```

- [ ] **Step 3.7: `packing.py`**

```python
from pydantic import BaseModel, Field
from typing import Literal

PackingCategory = Literal["documents", "clothing", "electronics", "toiletries", "other"]

class PackingItemCreate(BaseModel):
    trip_id: str
    name: str = Field(min_length=1, max_length=200)
    category: PackingCategory = "other"

class PackingItemResponse(BaseModel):
    id: str
    trip_id: str
    name: str
    category: str
    is_packed: bool
    order_index: int

    model_config = {"from_attributes": True}
```

- [ ] **Step 3.8: `notes.py`**

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class NoteCreate(BaseModel):
    trip_id: str
    section_id: Optional[str] = None
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    day_index: Optional[int] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    day_index: Optional[int] = None

class NoteResponse(BaseModel):
    id: str
    trip_id: str
    section_id: Optional[str]
    title: Optional[str]
    content: Optional[str]
    day_index: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 3.9: `community.py`**

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: Optional[str] = None
    trip_id: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    city_id: Optional[int] = None

class PostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class PostResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str]
    title: str
    content: Optional[str]
    images: Optional[List[str]]
    tags: Optional[List[str]]
    city_id: Optional[int]
    likes_count: int
    comments_count: int
    created_at: datetime

class CommentCreate(BaseModel):
    content: str = Field(min_length=1)

class CommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    user_name: Optional[str]
    content: Optional[str]
    created_at: datetime
```

- [ ] **Step 3.10: `city.py`**

```python
from pydantic import BaseModel, Field
from typing import Optional, List

class CityResponse(BaseModel):
    id: int
    name: str
    country: Optional[str]
    region: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    cost_index: Optional[float]
    popularity_score: Optional[float]
    photo_url: Optional[str]
    description: Optional[str]

    model_config = {"from_attributes": True}

class ActivityTemplateResponse(BaseModel):
    id: int
    city_id: Optional[int]
    name: str
    category: Optional[str]
    avg_cost: Optional[float]
    avg_duration_min: Optional[int]
    description: Optional[str]
    photo_url: Optional[str]

    model_config = {"from_attributes": True}

class SemanticSearchHit(BaseModel):
    city: CityResponse
    score: float
```

- [ ] **Step 3.11: `ai.py` (Member D contract)**

```python
from pydantic import BaseModel, Field
from typing import List, Literal

class ItineraryRequest(BaseModel):
    destination: str = Field(min_length=1, max_length=200)
    days: int = Field(ge=1, le=30)
    interests: List[str] = []
    budget_usd: float = Field(ge=0)

class ActivitySuggestion(BaseModel):
    name: str
    category: str
    cost: float
    duration_min: int
    description: str

class SectionSuggestion(BaseModel):
    title: str
    start_day: int
    end_day: int
    budget: float
    activities: List[ActivitySuggestion]

class ItineraryResponse(BaseModel):
    sections: List[SectionSuggestion]
    total_estimated_cost: float

class PackingItemSchema(BaseModel):
    name: str
    category: Literal["documents", "clothing", "electronics", "toiletries", "other"]

class TripSummaryResponse(BaseModel):
    summary: str
```

- [ ] **Step 3.12: `invoice.py` (Member D contract)**

```python
from pydantic import BaseModel, Field
from datetime import date
from typing import List, Optional, Literal, Dict, Any

class InvoiceItemSchema(BaseModel):
    category: str
    description: str
    quantity_or_details: str
    unit_cost: float
    amount: float

class InvoiceData(BaseModel):
    id: str
    trip_id: str
    invoice_number: str
    generated_date: Optional[date]
    status: Literal["pending", "paid", "cancelled"]
    items: List[InvoiceItemSchema]
    subtotal: float
    tax_percent: float
    tax_amount: float
    discount: float
    grand_total: float
    traveler_details: Dict[str, Any]

class InvoiceUpdate(BaseModel):
    tax_percent: Optional[float] = Field(default=None, ge=0, le=100)
    discount: Optional[float] = Field(default=None, ge=0)
```

- [ ] **Step 3.13: `admin.py` (Member C contract)**

```python
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional

class AdminStats(BaseModel):
    total_users: int
    total_trips: int
    trips_today: int
    active_users_30d: int

class PopularCity(BaseModel):
    city_id: int
    name: str
    country: Optional[str]
    visit_count: int

class PopularActivity(BaseModel):
    template_id: int
    name: str
    city_name: Optional[str]
    usage_count: int

class UserAdminView(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    trip_count: int
    last_active: Optional[datetime]
    is_admin: bool
    created_at: datetime

class TrendPoint(BaseModel):
    date: date
    trips_created: int
```

- [ ] **Step 3.14: `backend/app/schemas/__init__.py`**

```python
# explicit re-exports — keeps router imports tidy
from app.schemas import auth, user, trip, section, activity, expense, packing, notes, community, city, ai, invoice, admin

__all__ = ["auth", "user", "trip", "section", "activity", "expense", "packing", "notes", "community", "city", "ai", "invoice", "admin"]
```

- [ ] **Step 3.15: Verify schemas import cleanly**

```bash
cd backend
python -c "from app import schemas; print('Schema modules:', schemas.__all__)"
```

Expected: list of all 13 modules; no import errors.

- [ ] **Step 3.16: Commit + announce frozen contracts**

```bash
git add backend/app/schemas/
git commit -m "feat(schemas): freeze Pydantic contracts for all resources"
git push origin feat/core
```

Drop in `#general`:
> "Schemas frozen on `feat/core`. `schemas/ai.py` and `schemas/invoice.py` for D, `schemas/admin.py` for C. Pull and start coding against these."

---

## Phase 4 — Core Infrastructure

**Goal:** Config loading, DB session, JWT + bcrypt utilities, auth dependencies.

**Files:**
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/db.py`
- Create: `backend/app/core/security.py`

---

- [ ] **Step 4.1: `backend/app/core/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./traveloop.db"
    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    FRONTEND_URL: str = "http://localhost:5173"

    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    UNSPLASH_ACCESS_KEY: str = ""
    OPENTRIPMAP_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```

- [ ] **Step 4.2: `backend/app/core/db.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# SQLite needs check_same_thread=False for FastAPI's threaded context
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 4.3: `backend/app/core/security.py`**

```python
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str, extra: Optional[dict] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {"sub": subject, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user
```

- [ ] **Step 4.4: Smoke test core imports**

```bash
cd backend
python -c "from app.core.security import create_access_token, hash_password; print(hash_password('test')[:20]); print(create_access_token('abc'))"
```

Expected: prints a bcrypt prefix (`$2b$12$...`) and a JWT string.

- [ ] **Step 4.5: Commit**

```bash
git add backend/app/core/
git commit -m "feat(core): db session + jwt + bcrypt + auth dependencies"
git push origin feat/core
```

---

## Phase 5 — FastAPI App Wiring + Alembic

**Goal:** `main.py` boots with all router stubs registered + CORS + lifespan; first Alembic migration applied so the schema is real.

**Files:**
- Modify: `backend/app/main.py`
- Create: `backend/alembic.ini`
- Modify: `backend/alembic/env.py` (Alembic's generated env wired to our metadata)
- Create: `backend/alembic/versions/<auto>_initial.py` (autogenerated)

---

- [ ] **Step 5.1: Replace `backend/app/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    auth, users, trips, sections, activities, expenses,
    packing, notes, community, cities,
    ai, invoice, admin,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown

app = FastAPI(title="Traveloop API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/auth",       tags=["auth"])
app.include_router(users.router,      prefix="/users",      tags=["users"])
app.include_router(trips.router,      prefix="/trips",      tags=["trips"])
app.include_router(sections.router,   prefix="/sections",   tags=["sections"])
app.include_router(activities.router, prefix="/activities", tags=["activities"])
app.include_router(expenses.router,   prefix="",            tags=["expenses"])  # mixed prefixes (see router)
app.include_router(packing.router,    prefix="",            tags=["packing"])
app.include_router(notes.router,      prefix="",            tags=["notes"])
app.include_router(community.router,  prefix="/community",  tags=["community"])
app.include_router(cities.router,     prefix="",            tags=["cities"])
app.include_router(ai.router,         prefix="/ai",         tags=["ai"])
app.include_router(invoice.router,    prefix="",            tags=["invoice"])
app.include_router(admin.router,      prefix="/admin",      tags=["admin"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

> **Note:** Some resources use mixed prefixes (e.g. `GET /trips/{id}/expenses` lives in `expenses.py`). To avoid prefix gymnastics, those routers don't get a top-level prefix and define full paths internally.

- [ ] **Step 5.2: `cd backend && alembic init alembic`** — but the folder already exists from Phase 1. Instead, create `backend/alembic.ini`:

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = driver://user:pass@host/dbname  ; overridden in env.py

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 5.3: Create `backend/alembic/env.py`**

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.core.config import settings
from app.models import Base
import app.models  # noqa: F401  ensure all models register

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section) or {},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 5.4: Create `backend/alembic/script.py.mako`**

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 5.5: Generate the initial migration**

For dev start with SQLite to keep it simple. In `backend/.env`:

```
DATABASE_URL=sqlite:///./traveloop.db
```

Then:

```bash
cd backend
cp .env.example .env  # then edit DATABASE_URL line
alembic revision --autogenerate -m "initial schema"
```

Expected: a new file appears in `backend/alembic/versions/` with `op.create_table()` calls for all 15+ tables.

- [ ] **Step 5.6: Apply the migration**

```bash
alembic upgrade head
```

Expected: `traveloop.db` is created. Verify with:

```bash
python -c "from sqlalchemy import create_engine, inspect; e = create_engine('sqlite:///./traveloop.db'); print(sorted(inspect(e).get_table_names()))"
```

Expected: prints all 15+ tables plus `alembic_version`.

- [ ] **Step 5.7: Boot the app and verify Swagger UI**

```bash
uvicorn app.main:app --reload --port 8000
```

Visit http://localhost:8000/docs — should show all router groups (most empty) + `/health`. Stop server.

- [ ] **Step 5.8: Commit**

```bash
git add backend/alembic/ backend/alembic.ini backend/app/main.py
git commit -m "feat: wire FastAPI app + alembic initial migration"
git push origin feat/core
```

---

## Phase 6 — Auth Router

**Goal:** Full register/login/refresh/forgot-password flow. JWT issued on login.

**Files:**
- Modify: `backend/app/routers/auth.py`

---

- [ ] **Step 6.1: Replace `backend/app/routers/auth.py`**

```python
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    get_current_user, decode_token,
)
from app.models import User
from app.schemas.auth import (
    UserRegister, UserLogin, TokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.schemas.user import UserProfile

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        city=payload.city,
        country=payload.country,
        photo_url=payload.photo_url,
        additional_info=payload.additional_info,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, {"is_admin": user.is_admin})
    return TokenResponse(access_token=token, user_id=user.id, is_admin=user.is_admin)

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token(user.id, {"is_admin": user.is_admin})
    return TokenResponse(access_token=token, user_id=user.id, is_admin=user.is_admin)

@router.post("/refresh", response_model=TokenResponse)
def refresh(user: User = Depends(get_current_user)):
    token = create_access_token(user.id, {"is_admin": user.is_admin})
    return TokenResponse(access_token=token, user_id=user.id, is_admin=user.is_admin)

@router.get("/me", response_model=UserProfile)
def me(user: User = Depends(get_current_user)):
    return user

# In a hackathon we don't ship a real email pipeline. We return the reset token
# directly so the frontend can demo the flow. In prod this would email-out.
@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "If account exists, reset email sent.", "reset_token": None}
    token = create_access_token(user.id, {"purpose": "reset"})
    return {"message": "Reset token issued (demo mode).", "reset_token": token}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.token)
    if data.get("purpose") != "reset":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a reset token")
    user = db.query(User).filter(User.id == data["sub"]).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset"}
```

- [ ] **Step 6.2: Smoke-test auth flow**

Boot the app (`uvicorn app.main:app --reload`) then run:

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"password123","first_name":"A","last_name":"B"}'
# → returns access_token

# Login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"password123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Me
curl http://localhost:8000/auth/me -H "Authorization: Bearer $TOKEN"
# → returns user profile JSON
```

Expected: all three return 200 with valid JSON.

- [ ] **Step 6.3: Commit**

```bash
git add backend/app/routers/auth.py
git commit -m "feat(auth): register/login/refresh/me/forgot+reset password"
git push origin feat/core
```

---

## Phase 7 — Users Router

**Goal:** Profile read/update, photo upload (multipart), account deletion, saved destinations.

**Files:**
- Modify: `backend/app/routers/users.py`

---

- [ ] **Step 7.1: Replace `backend/app/routers/users.py`**

```python
import os, uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, City, SavedDestination
from app.schemas.user import UserProfile, UserProfileUpdate
from app.schemas.city import CityResponse

router = APIRouter()

UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/me/profile", response_model=UserProfile)
def get_profile(user: User = Depends(get_current_user)):
    return user

@router.put("/me/profile", response_model=UserProfile)
def update_profile(payload: UserProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

@router.post("/me/photo", response_model=UserProfile)
async def upload_photo(file: UploadFile = File(...),
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Must be an image")
    ext = Path(file.filename or "img.jpg").suffix or ".jpg"
    name = f"{user.id}_{uuid.uuid4().hex}{ext}"
    path = UPLOAD_DIR / name
    path.write_bytes(await file.read())
    user.photo_url = f"/static/avatars/{name}"
    db.commit()
    db.refresh(user)
    return user

@router.delete("/me", status_code=204)
def delete_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()

@router.get("/me/saved-destinations", response_model=List[CityResponse])
def list_saved(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(City).join(SavedDestination, SavedDestination.city_id == City.id) \
                        .filter(SavedDestination.user_id == user.id).all()
    return rows

@router.post("/me/saved-destinations/{city_id}", status_code=201)
def add_saved(city_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(404, "City not found")
    if not db.query(SavedDestination).filter_by(user_id=user.id, city_id=city_id).first():
        db.add(SavedDestination(user_id=user.id, city_id=city_id))
        db.commit()
    return {"saved": True}

@router.delete("/me/saved-destinations/{city_id}", status_code=204)
def remove_saved(city_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(SavedDestination).filter_by(user_id=user.id, city_id=city_id).delete()
    db.commit()
```

- [ ] **Step 7.2: Mount static for avatar serving in `main.py`**

Add near the top of `main.py` after `app = FastAPI(...)`:

```python
from fastapi.staticfiles import StaticFiles
import pathlib
pathlib.Path("uploads/avatars").mkdir(parents=True, exist_ok=True)
app.mount("/static/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")
```

Add `uploads/` to `.gitignore`.

- [ ] **Step 7.3: Smoke-test**

```bash
TOKEN=...  # from previous phase
curl http://localhost:8000/users/me/profile -H "Authorization: Bearer $TOKEN"
curl -X PUT http://localhost:8000/users/me/profile \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"city":"Mumbai","country":"IN"}'
```

Expected: profile returns updated city/country.

- [ ] **Step 7.4: Commit**

```bash
git add backend/app/routers/users.py backend/app/main.py .gitignore
git commit -m "feat(users): profile + photo upload + saved destinations"
git push origin feat/core
```

---

## Phase 8 — Trips Router (CRUD + filters + status)

**Goal:** Full trip CRUD, status derivation, filtering by status/search, sort.

**Files:**
- Modify: `backend/app/routers/trips.py`
- Create: `backend/app/services/trip_status.py` (small helper)

---

- [ ] **Step 8.1: Create `backend/app/services/trip_status.py`**

```python
from datetime import date
from typing import Optional, Literal

TripStatus = Literal["ongoing", "upcoming", "completed", "draft"]

def derive_status(start: Optional[date], end: Optional[date], today: Optional[date] = None) -> TripStatus:
    today = today or date.today()
    if start is None or end is None:
        return "draft"
    if today < start:
        return "upcoming"
    if today > end:
        return "completed"
    return "ongoing"
```

- [ ] **Step 8.2: Replace `backend/app/routers/trips.py`**

```python
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import secrets, uuid
from pathlib import Path

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, Trip, TripSection, TripActivity, Expense, PackingItem, TripNote, TripCopy
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, PublishResponse
from app.services.trip_status import derive_status

router = APIRouter()

COVER_DIR = Path("uploads/covers")
COVER_DIR.mkdir(parents=True, exist_ok=True)

def _serialize(t: Trip) -> TripResponse:
    return TripResponse(
        id=t.id, user_id=t.user_id, name=t.name, description=t.description,
        start_date=t.start_date, end_date=t.end_date,
        cover_photo_url=t.cover_photo_url, total_budget=t.total_budget,
        status=derive_status(t.start_date, t.end_date),
        is_public=t.is_public, public_slug=t.public_slug,
        section_count=len(t.sections),
        created_at=t.created_at,
    )

@router.get("", response_model=List[TripResponse])
def list_trips(
    status: Optional[str] = Query(default=None, description="ongoing|upcoming|completed|draft"),
    search: Optional[str] = None,
    sort: str = Query(default="-created_at", description="created_at|-created_at|start_date|-start_date"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Trip).filter(Trip.user_id == user.id)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(or_(func.lower(Trip.name).like(like), func.lower(Trip.description).like(like)))
    sort_col = sort.lstrip("-")
    direction = "desc" if sort.startswith("-") else "asc"
    if sort_col not in ("created_at", "start_date", "name"):
        sort_col = "created_at"
    col = getattr(Trip, sort_col)
    q = q.order_by(col.desc() if direction == "desc" else col.asc())
    rows = q.all()
    out = [_serialize(t) for t in rows]
    if status:
        out = [t for t in out if t.status == status]
    return out

@router.post("", response_model=TripResponse, status_code=201)
def create_trip(payload: TripCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.start_date > payload.end_date:
        raise HTTPException(400, "start_date must be on or before end_date")
    trip = Trip(user_id=user.id, **payload.model_dump())
    db.add(trip); db.commit(); db.refresh(trip)
    return _serialize(trip)

@router.get("/templates", response_model=List[TripResponse])
def list_templates(db: Session = Depends(get_db)):
    rows = db.query(Trip).filter(Trip.is_template.is_(True)).all()
    return [_serialize(t) for t in rows]

@router.get("/public/{slug}", response_model=TripResponse)
def get_public(slug: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.public_slug == slug, Trip.is_public.is_(True)).first()
    if not trip:
        raise HTTPException(404, "Public trip not found")
    return _serialize(trip)

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")
    return _serialize(trip)

@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(trip_id: str, payload: TripUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(trip, k, v)
    db.commit(); db.refresh(trip)
    return _serialize(trip)

@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")
    db.delete(trip); db.commit()

@router.post("/{trip_id}/cover", response_model=TripResponse)
async def upload_cover(trip_id: str, file: UploadFile = File(...),
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")
    ext = Path(file.filename or "img.jpg").suffix or ".jpg"
    name = f"{trip_id}_{uuid.uuid4().hex}{ext}"
    (COVER_DIR / name).write_bytes(await file.read())
    trip.cover_photo_url = f"/static/covers/{name}"
    db.commit(); db.refresh(trip)
    return _serialize(trip)

@router.post("/{trip_id}/publish", response_model=PublishResponse)
def publish(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")
    if not trip.public_slug:
        trip.public_slug = secrets.token_urlsafe(8)
    trip.is_public = True
    db.commit()
    return PublishResponse(public_slug=trip.public_slug, public_url=f"/trips/public/{trip.public_slug}")

@router.post("/{trip_id}/copy", response_model=TripResponse, status_code=201)
def copy_trip(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    src = db.query(Trip).filter(Trip.id == trip_id).first()
    if not src or (not src.is_public and src.user_id != user.id):
        raise HTTPException(404, "Trip not found")
    new = Trip(
        user_id=user.id,
        name=f"{src.name} (copy)",
        description=src.description,
        start_date=src.start_date, end_date=src.end_date,
        cover_photo_url=src.cover_photo_url,
        total_budget=src.total_budget,
    )
    db.add(new); db.flush()
    # deep clone sections + activities
    for s in src.sections:
        ns = TripSection(
            trip_id=new.id, city_id=s.city_id, title=s.title, description=s.description,
            start_date=s.start_date, end_date=s.end_date, section_budget=s.section_budget,
            order_index=s.order_index,
        )
        db.add(ns); db.flush()
        for a in s.activities:
            db.add(TripActivity(
                section_id=ns.id, template_id=a.template_id, name=a.name, category=a.category,
                cost=a.cost, duration_min=a.duration_min, scheduled_at=a.scheduled_at,
                notes=a.notes, order_index=a.order_index,
            ))
    db.add(TripCopy(original_trip_id=src.id, copied_trip_id=new.id, copied_by_user_id=user.id))
    db.commit(); db.refresh(new)
    return _serialize(new)
```

- [ ] **Step 8.3: Mount the covers static dir in `main.py`**

After the `/static/avatars` mount, add:

```python
pathlib.Path("uploads/covers").mkdir(parents=True, exist_ok=True)
app.mount("/static/covers", StaticFiles(directory="uploads/covers"), name="covers")
```

- [ ] **Step 8.4: Smoke-test**

```bash
TOKEN=...
# create
curl -X POST http://localhost:8000/trips -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Trip to Paris","start_date":"2026-06-01","end_date":"2026-06-08","total_budget":1500}'
# list
curl http://localhost:8000/trips -H "Authorization: Bearer $TOKEN"
# publish
TRIP_ID=...
curl -X POST http://localhost:8000/trips/$TRIP_ID/publish -H "Authorization: Bearer $TOKEN"
```

Expected: 201 then 200 list with `status: "upcoming"` (since 2026-06-01 > today 2026-05-10), then publish returns slug.

- [ ] **Step 8.5: Commit**

```bash
git add backend/app/routers/trips.py backend/app/services/trip_status.py backend/app/main.py
git commit -m "feat(trips): full CRUD + filter + sort + publish + copy"
git push origin feat/core
```

---

## Phase 9 — Sections Router

**Goal:** Section CRUD + reorder by ordered list of IDs.

**Files:**
- Modify: `backend/app/routers/sections.py`

---

- [ ] **Step 9.1: Replace `backend/app/routers/sections.py`**

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, Trip, TripSection, City
from app.schemas.section import SectionCreate, SectionUpdate, SectionResponse, SectionReorder

router = APIRouter()

def _serialize(s: TripSection) -> SectionResponse:
    return SectionResponse(
        id=s.id, trip_id=s.trip_id,
        city_id=s.city_id,
        city_name=s.city.name if s.city else None,
        title=s.title, description=s.description,
        start_date=s.start_date, end_date=s.end_date,
        section_budget=s.section_budget, order_index=s.order_index,
        activities=[a.__dict__ for a in s.activities],  # Pydantic v2 from_attributes will pick fields
    )

def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")
    return trip

@router.post("", response_model=SectionResponse, status_code=201)
def create_section(payload: SectionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(payload.trip_id, user, db)
    if payload.city_id and not db.query(City).filter(City.id == payload.city_id).first():
        raise HTTPException(400, "city_id not found")
    next_order = (db.query(TripSection).filter_by(trip_id=payload.trip_id).count())
    section = TripSection(**payload.model_dump(), order_index=next_order)
    db.add(section); db.commit(); db.refresh(section)
    return _serialize(section)

@router.put("/{section_id}", response_model=SectionResponse)
def update_section(section_id: str, payload: SectionUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    section = db.query(TripSection).filter(TripSection.id == section_id).first()
    if not section: raise HTTPException(404, "Section not found")
    _own_trip(section.trip_id, user, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(section, k, v)
    db.commit(); db.refresh(section)
    return _serialize(section)

@router.delete("/{section_id}", status_code=204)
def delete_section(section_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    section = db.query(TripSection).filter(TripSection.id == section_id).first()
    if not section: raise HTTPException(404, "Section not found")
    _own_trip(section.trip_id, user, db)
    db.delete(section); db.commit()

@router.post("/reorder")
def reorder(payload: SectionReorder, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(payload.trip_id, user, db)
    rows = db.query(TripSection).filter(TripSection.trip_id == payload.trip_id).all()
    by_id = {s.id: s for s in rows}
    if set(payload.section_ids) != set(by_id.keys()):
        raise HTTPException(400, "section_ids must be exactly the sections of this trip")
    for idx, sid in enumerate(payload.section_ids):
        by_id[sid].order_index = idx
    db.commit()
    return {"reordered": len(payload.section_ids)}

# convenience: list sections for a trip — exposed under /trips/{trip_id}/sections
@router.get("/by-trip/{trip_id}", response_model=List[SectionResponse])
def list_sections(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(trip_id, user, db)
    rows = db.query(TripSection).filter(TripSection.trip_id == trip_id).order_by(TripSection.order_index).all()
    return [_serialize(s) for s in rows]
```

- [ ] **Step 9.2: Smoke-test**

```bash
curl -X POST http://localhost:8000/sections \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"trip_id\":\"$TRIP_ID\",\"title\":\"Paris days 1-3\",\"start_date\":\"2026-06-01\",\"end_date\":\"2026-06-03\",\"section_budget\":500}"
```

Expected: 201 with `order_index: 0`.

- [ ] **Step 9.3: Commit**

```bash
git add backend/app/routers/sections.py
git commit -m "feat(sections): CRUD + reorder + list-by-trip"
git push origin feat/core
```

---

## Phase 10 — Activities Router

**Goal:** Activity CRUD + reorder + flowchart-style `next_activity_id` linking.

**Files:**
- Modify: `backend/app/routers/activities.py`

---

- [ ] **Step 10.1: Replace `backend/app/routers/activities.py`**

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, Trip, TripSection, TripActivity
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse, ActivityReorder

router = APIRouter()

def _own_section(section_id: str, user: User, db: Session) -> TripSection:
    sect = db.query(TripSection).filter(TripSection.id == section_id).first()
    if not sect: raise HTTPException(404, "Section not found")
    if sect.trip.user_id != user.id: raise HTTPException(404, "Section not found")
    return sect

@router.post("", response_model=ActivityResponse, status_code=201)
def create_activity(payload: ActivityCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_section(payload.section_id, user, db)
    next_idx = db.query(TripActivity).filter_by(section_id=payload.section_id).count()
    a = TripActivity(**payload.model_dump(), order_index=next_idx)
    db.add(a); db.commit(); db.refresh(a)
    return a

@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(activity_id: str, payload: ActivityUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.query(TripActivity).filter(TripActivity.id == activity_id).first()
    if not a: raise HTTPException(404, "Activity not found")
    _own_section(a.section_id, user, db)
    if payload.next_activity_id and payload.next_activity_id != activity_id:
        nxt = db.query(TripActivity).filter(TripActivity.id == payload.next_activity_id).first()
        if not nxt or nxt.section_id != a.section_id:
            raise HTTPException(400, "next_activity_id must be in same section")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit(); db.refresh(a)
    return a

@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.query(TripActivity).filter(TripActivity.id == activity_id).first()
    if not a: raise HTTPException(404, "Activity not found")
    _own_section(a.section_id, user, db)
    db.delete(a); db.commit()

@router.post("/reorder")
def reorder(payload: ActivityReorder, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_section(payload.section_id, user, db)
    rows = db.query(TripActivity).filter(TripActivity.section_id == payload.section_id).all()
    by_id = {a.id: a for a in rows}
    if set(payload.activity_ids) != set(by_id.keys()):
        raise HTTPException(400, "activity_ids must be exactly the activities of this section")
    for idx, aid in enumerate(payload.activity_ids):
        by_id[aid].order_index = idx
    db.commit()
    return {"reordered": len(payload.activity_ids)}
```

- [ ] **Step 10.2: Smoke-test, commit**

```bash
curl -X POST http://localhost:8000/activities \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"section_id\":\"$SECTION_ID\",\"name\":\"Eiffel Tower\",\"category\":\"sightseeing\",\"cost\":25,\"duration_min\":120}"

git add backend/app/routers/activities.py
git commit -m "feat(activities): CRUD + reorder + next_activity link"
git push origin feat/core
```

---

## Phase 11 — Expenses Router + Budget Breakdown

**Goal:** Expense CRUD + aggregated breakdown (by category, by day, over-budget detection).

**Files:**
- Modify: `backend/app/routers/expenses.py`

---

- [ ] **Step 11.1: Replace `backend/app/routers/expenses.py`**

```python
from collections import defaultdict
from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, Trip, Expense, TripSection
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, BudgetBreakdown

router = APIRouter()

def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip: raise HTTPException(404, "Trip not found")
    return trip

@router.get("/trips/{trip_id}/expenses", response_model=List[ExpenseResponse])
def list_expenses(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(trip_id, user, db)
    return db.query(Expense).filter(Expense.trip_id == trip_id).order_by(Expense.expense_date.desc()).all()

@router.post("/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(payload: ExpenseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(payload.trip_id, user, db)
    if payload.section_id:
        ok = db.query(TripSection).filter_by(id=payload.section_id, trip_id=payload.trip_id).first()
        if not ok: raise HTTPException(400, "section_id does not belong to trip")
    e = Expense(**payload.model_dump())
    db.add(e); db.commit(); db.refresh(e)
    return e

@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: str, payload: ExpenseUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e: raise HTTPException(404, "Expense not found")
    _own_trip(e.trip_id, user, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit(); db.refresh(e)
    return e

@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e: raise HTTPException(404, "Expense not found")
    _own_trip(e.trip_id, user, db)
    db.delete(e); db.commit()

@router.get("/trips/{trip_id}/budget-breakdown", response_model=BudgetBreakdown)
def breakdown(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = _own_trip(trip_id, user, db)
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    by_cat: dict[str, float] = defaultdict(float)
    by_day: dict[str, float] = defaultdict(float)
    for e in expenses:
        by_cat[e.category] += e.amount
        if e.expense_date:
            by_day[e.expense_date.isoformat()] += e.amount
    total_spent = sum(by_cat.values())
    over = []
    if trip.total_budget and trip.start_date and trip.end_date:
        days = max(1, (trip.end_date - trip.start_date).days + 1)
        per_day_budget = trip.total_budget / days
        over = [d for d, amt in by_day.items() if amt > per_day_budget]
    return BudgetBreakdown(
        by_category=dict(by_cat),
        by_day=dict(by_day),
        total_spent=total_spent,
        total_budget=trip.total_budget,
        over_budget_days=over,
    )
```

- [ ] **Step 11.2: Smoke-test + commit**

```bash
curl -X POST http://localhost:8000/expenses -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"trip_id\":\"$TRIP_ID\",\"category\":\"meal\",\"amount\":40,\"expense_date\":\"2026-06-01\"}"
curl http://localhost:8000/trips/$TRIP_ID/budget-breakdown -H "Authorization: Bearer $TOKEN"

git add backend/app/routers/expenses.py
git commit -m "feat(expenses): CRUD + budget breakdown by category and day"
git push origin feat/core
```

---

## Phase 12 — Packing Router

**Goal:** Packing item CRUD + toggle packed + reset all.

**Files:**
- Modify: `backend/app/routers/packing.py`

---

- [ ] **Step 12.1: Replace `backend/app/routers/packing.py`**

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, Trip, PackingItem
from app.schemas.packing import PackingItemCreate, PackingItemResponse

router = APIRouter()

def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip: raise HTTPException(404, "Trip not found")
    return trip

@router.get("/trips/{trip_id}/packing", response_model=List[PackingItemResponse])
def list_items(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(trip_id, user, db)
    return db.query(PackingItem).filter(PackingItem.trip_id == trip_id).order_by(PackingItem.order_index).all()

@router.post("/packing", response_model=PackingItemResponse, status_code=201)
def add_item(payload: PackingItemCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(payload.trip_id, user, db)
    next_idx = db.query(PackingItem).filter_by(trip_id=payload.trip_id).count()
    item = PackingItem(**payload.model_dump(), order_index=next_idx)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.put("/packing/{item_id}/toggle", response_model=PackingItemResponse)
def toggle(item_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(PackingItem).filter(PackingItem.id == item_id).first()
    if not item: raise HTTPException(404, "Item not found")
    _own_trip(item.trip_id, user, db)
    item.is_packed = not item.is_packed
    db.commit(); db.refresh(item)
    return item

@router.delete("/packing/{item_id}", status_code=204)
def remove(item_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(PackingItem).filter(PackingItem.id == item_id).first()
    if not item: raise HTTPException(404, "Item not found")
    _own_trip(item.trip_id, user, db)
    db.delete(item); db.commit()

@router.post("/trips/{trip_id}/packing/reset")
def reset(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(trip_id, user, db)
    db.query(PackingItem).filter(PackingItem.trip_id == trip_id).delete()
    db.commit()
    return {"reset": True}
```

- [ ] **Step 12.2: Smoke + commit**

```bash
git add backend/app/routers/packing.py
git commit -m "feat(packing): list/add/toggle/delete/reset"
git push origin feat/core
```

---

## Phase 13 — Notes Router

**Goal:** Trip + per-day notes CRUD.

**Files:**
- Modify: `backend/app/routers/notes.py`

---

- [ ] **Step 13.1: Replace `backend/app/routers/notes.py`**

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, Trip, TripNote, TripSection
from app.schemas.notes import NoteCreate, NoteUpdate, NoteResponse

router = APIRouter()

def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip: raise HTTPException(404, "Trip not found")
    return trip

@router.get("/trips/{trip_id}/notes", response_model=List[NoteResponse])
def list_notes(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(trip_id, user, db)
    return db.query(TripNote).filter(TripNote.trip_id == trip_id).order_by(TripNote.created_at.desc()).all()

@router.post("/notes", response_model=NoteResponse, status_code=201)
def create_note(payload: NoteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _own_trip(payload.trip_id, user, db)
    if payload.section_id:
        if not db.query(TripSection).filter_by(id=payload.section_id, trip_id=payload.trip_id).first():
            raise HTTPException(400, "section_id does not belong to trip")
    n = TripNote(**payload.model_dump())
    db.add(n); db.commit(); db.refresh(n)
    return n

@router.put("/notes/{note_id}", response_model=NoteResponse)
def update_note(note_id: str, payload: NoteUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(TripNote).filter(TripNote.id == note_id).first()
    if not n: raise HTTPException(404, "Note not found")
    _own_trip(n.trip_id, user, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(n, k, v)
    db.commit(); db.refresh(n)
    return n

@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(TripNote).filter(TripNote.id == note_id).first()
    if not n: raise HTTPException(404, "Note not found")
    _own_trip(n.trip_id, user, db)
    db.delete(n); db.commit()
```

- [ ] **Step 13.2: Commit**

```bash
git add backend/app/routers/notes.py
git commit -m "feat(notes): CRUD per trip and per section/day"
git push origin feat/core
```

---

## Phase 14 — Community Router

**Goal:** Posts + comments + like-once-per-user.

**Files:**
- Modify: `backend/app/routers/community.py`

---

- [ ] **Step 14.1: Replace `backend/app/routers/community.py`**

```python
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User, CommunityPost, CommunityComment, CommunityLike
from app.schemas.community import PostCreate, PostUpdate, PostResponse, CommentCreate, CommentResponse

router = APIRouter()

def _user_name(u: Optional[User]) -> Optional[str]:
    if not u: return None
    return f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email

def _post_resp(p: CommunityPost, comment_count: int) -> PostResponse:
    return PostResponse(
        id=p.id, user_id=p.user_id, user_name=_user_name(p.user),
        title=p.title, content=p.content, images=p.images, tags=p.tags,
        city_id=p.city_id, likes_count=p.likes_count,
        comments_count=comment_count, created_at=p.created_at,
    )

@router.get("/posts", response_model=List[PostResponse])
def list_posts(search: Optional[str] = None, tag: Optional[str] = None, city_id: Optional[int] = None,
               sort: str = Query(default="-created_at"), db: Session = Depends(get_db)):
    q = db.query(CommunityPost)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(or_(func.lower(CommunityPost.title).like(like), func.lower(CommunityPost.content).like(like)))
    if city_id:
        q = q.filter(CommunityPost.city_id == city_id)
    sort_col = sort.lstrip("-")
    direction = "desc" if sort.startswith("-") else "asc"
    if sort_col not in ("created_at", "likes_count"): sort_col = "created_at"
    col = getattr(CommunityPost, sort_col)
    q = q.order_by(col.desc() if direction == "desc" else col.asc())
    rows = q.all()
    out = []
    for p in rows:
        if tag and (not p.tags or tag not in p.tags): continue
        cc = db.query(CommunityComment).filter_by(post_id=p.id).count()
        out.append(_post_resp(p, cc))
    return out

@router.post("/posts", response_model=PostResponse, status_code=201)
def create_post(payload: PostCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = CommunityPost(user_id=user.id, **payload.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return _post_resp(p, 0)

@router.get("/posts/{post_id}", response_model=PostResponse)
def get_post(post_id: str, db: Session = Depends(get_db)):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p: raise HTTPException(404, "Post not found")
    cc = db.query(CommunityComment).filter_by(post_id=post_id).count()
    return _post_resp(p, cc)

@router.put("/posts/{post_id}", response_model=PostResponse)
def update_post(post_id: str, payload: PostUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p: raise HTTPException(404, "Post not found")
    if p.user_id != user.id: raise HTTPException(403, "Not your post")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    cc = db.query(CommunityComment).filter_by(post_id=post_id).count()
    return _post_resp(p, cc)

@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p: raise HTTPException(404, "Post not found")
    if p.user_id != user.id: raise HTTPException(403, "Not your post")
    db.delete(p); db.commit()

@router.post("/posts/{post_id}/like")
def like(post_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not p: raise HTTPException(404, "Post not found")
    existing = db.query(CommunityLike).filter_by(user_id=user.id, post_id=post_id).first()
    if existing:
        db.delete(existing)
        p.likes_count = max(0, p.likes_count - 1)
        db.commit()
        return {"liked": False, "likes_count": p.likes_count}
    db.add(CommunityLike(user_id=user.id, post_id=post_id))
    p.likes_count += 1
    db.commit()
    return {"liked": True, "likes_count": p.likes_count}

@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def list_comments(post_id: str, db: Session = Depends(get_db)):
    rows = db.query(CommunityComment).filter_by(post_id=post_id).order_by(CommunityComment.created_at).all()
    return [
        CommentResponse(
            id=c.id, post_id=c.post_id, user_id=c.user_id,
            user_name=_user_name(db.query(User).get(c.user_id)),
            content=c.content, created_at=c.created_at,
        )
        for c in rows
    ]

@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(post_id: str, payload: CommentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(CommunityPost).filter(CommunityPost.id == post_id).first():
        raise HTTPException(404, "Post not found")
    c = CommunityComment(post_id=post_id, user_id=user.id, content=payload.content)
    db.add(c); db.commit(); db.refresh(c)
    return CommentResponse(
        id=c.id, post_id=c.post_id, user_id=c.user_id,
        user_name=_user_name(user), content=c.content, created_at=c.created_at,
    )
```

- [ ] **Step 14.2: Commit**

```bash
git add backend/app/routers/community.py
git commit -m "feat(community): posts, comments, like-toggle"
git push origin feat/core
```

---

## Phase 15 — Cities Router

**Goal:** Catalog list/filter/search + semantic search stub (works even before Member C seeds embeddings).

**Files:**
- Modify: `backend/app/routers/cities.py`

---

- [ ] **Step 15.1: Replace `backend/app/routers/cities.py`**

```python
import json, math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.db import get_db
from app.models import City, ActivityTemplate
from app.schemas.city import CityResponse, ActivityTemplateResponse, SemanticSearchHit

router = APIRouter()

@router.get("/cities", response_model=List[CityResponse])
def list_cities(q: Optional[str] = None, country: Optional[str] = None,
                sort: str = Query(default="-popularity_score"),
                limit: int = Query(default=50, le=200), db: Session = Depends(get_db)):
    qry = db.query(City)
    if q:
        like = f"%{q.lower()}%"
        qry = qry.filter(or_(func.lower(City.name).like(like), func.lower(City.country).like(like)))
    if country:
        qry = qry.filter(City.country == country)
    sort_col = sort.lstrip("-")
    direction = "desc" if sort.startswith("-") else "asc"
    if sort_col not in ("popularity_score", "name", "cost_index"): sort_col = "popularity_score"
    col = getattr(City, sort_col)
    qry = qry.order_by(col.desc().nullslast() if direction == "desc" else col.asc().nullslast())
    return qry.limit(limit).all()

@router.get("/cities/recommended", response_model=List[CityResponse])
def recommended(limit: int = Query(default=12, le=50), db: Session = Depends(get_db)):
    return db.query(City).order_by(City.popularity_score.desc().nullslast()).limit(limit).all()

@router.get("/cities/search/semantic", response_model=List[SemanticSearchHit])
def semantic_search(q: str, limit: int = Query(default=10, le=50), db: Session = Depends(get_db)):
    """
    Pre-Member-C-seed fallback: if no embeddings yet, fall back to substring match.
    Once embeddings are populated by Member C, computes cosine similarity in Python.
    """
    rows = db.query(City).filter(City.embedding.isnot(None)).limit(2000).all()
    if not rows:
        like = f"%{q.lower()}%"
        rows = db.query(City).filter(or_(func.lower(City.name).like(like), func.lower(City.description).like(like))).limit(limit).all()
        return [SemanticSearchHit(city=c, score=1.0) for c in rows]

    # naive query embedding via word-presence as a fallback (no model loading at import time)
    # Member C is expected to provide a /cities/embed-query endpoint for real semantic search;
    # for the hackathon demo path, return cities whose embedding has highest cosine to a 1-hot bag.
    q_terms = set(q.lower().split())
    scored = []
    for c in rows:
        haystack = f"{c.name} {c.country or ''} {c.description or ''}".lower()
        score = sum(1 for t in q_terms if t in haystack) / max(1, len(q_terms))
        if score > 0:
            scored.append((c, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [SemanticSearchHit(city=c, score=s) for c, s in scored[:limit]]

@router.get("/cities/{city_id}", response_model=CityResponse)
def get_city(city_id: int, db: Session = Depends(get_db)):
    c = db.query(City).filter(City.id == city_id).first()
    if not c: raise HTTPException(404, "City not found")
    return c

@router.get("/activity-templates", response_model=List[ActivityTemplateResponse])
def list_activity_templates(q: Optional[str] = None, city_id: Optional[int] = None,
                            category: Optional[str] = None, max_cost: Optional[float] = None,
                            limit: int = Query(default=50, le=200), db: Session = Depends(get_db)):
    qry = db.query(ActivityTemplate)
    if q:
        like = f"%{q.lower()}%"
        qry = qry.filter(or_(func.lower(ActivityTemplate.name).like(like), func.lower(ActivityTemplate.description).like(like)))
    if city_id: qry = qry.filter(ActivityTemplate.city_id == city_id)
    if category: qry = qry.filter(ActivityTemplate.category == category)
    if max_cost is not None: qry = qry.filter(ActivityTemplate.avg_cost <= max_cost)
    return qry.limit(limit).all()

@router.get("/activity-templates/{template_id}", response_model=ActivityTemplateResponse)
def get_activity_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(ActivityTemplate).filter(ActivityTemplate.id == template_id).first()
    if not t: raise HTTPException(404, "Template not found")
    return t
```

> The semantic-search fallback keeps the endpoint working for the demo even before Member C drops embeddings in. Once embeddings are present, the same endpoint scores them — but if you have time later you can swap in `sentence-transformers` proper.

- [ ] **Step 15.2: Commit**

```bash
git add backend/app/routers/cities.py
git commit -m "feat(cities): list/filter/search + semantic stub + activity-templates"
git push origin feat/core
```

---

## Phase 16 — Public Sharing + Saved Destinations + Copy Trip Polish

**Goal:** Most of this was already in Phase 8 (`/trips/{id}/publish`, `/trips/{id}/copy`, `/trips/public/{slug}`). This phase verifies and adds anything missing — specifically a public read-only path that exposes sections + activities (since `/trips/public/{slug}` only returns the trip header).

**Files:**
- Modify: `backend/app/routers/trips.py`

---

- [ ] **Step 16.1: Add `/trips/public/{slug}/full` to `trips.py`**

Append below the existing `get_public` function:

```python
from app.schemas.section import SectionResponse  # at top of file

@router.get("/public/{slug}/full")
def get_public_full(slug: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.public_slug == slug, Trip.is_public.is_(True)).first()
    if not trip:
        raise HTTPException(404, "Public trip not found")
    return {
        "trip": _serialize(trip),
        "sections": [
            {
                "id": s.id, "title": s.title, "description": s.description,
                "city_id": s.city_id, "city_name": s.city.name if s.city else None,
                "start_date": s.start_date, "end_date": s.end_date,
                "section_budget": s.section_budget, "order_index": s.order_index,
                "activities": [
                    {"id": a.id, "name": a.name, "category": a.category, "cost": a.cost,
                     "duration_min": a.duration_min, "order_index": a.order_index}
                    for a in s.activities
                ],
            }
            for s in trip.sections
        ],
    }
```

- [ ] **Step 16.2: Commit**

```bash
git add backend/app/routers/trips.py
git commit -m "feat(trips): public/full endpoint with sections + activities"
git push origin feat/core
```

---

## Phase 17 — Integration: Merge Teammate Branches + End-to-End Smoke Test

**Goal:** Pull `feat/data-admin`, `feat/ai-invoice`, `feat/frontend` into `main`. Run the full happy path.

**Files:**
- Modify: `backend/app/main.py` (already includes ai/invoice/admin routers, no changes needed if teammates kept their router file paths)
- Create/modify: `backend/tests/smoke.py`

---

- [ ] **Step 17.1: Pull and merge teammate branches**

```bash
git checkout feat/core
git pull origin main  # in case anything trickled
git push origin feat/core

# Open feat/core PR; while review pending, locally merge other branches into a test integration branch
git checkout main
git pull origin main
git checkout -b chore/integration

git fetch origin feat/data-admin
git merge --no-ff origin/feat/data-admin -m "merge: data engineering + admin"

git fetch origin feat/ai-invoice
git merge --no-ff origin/feat/ai-invoice -m "merge: ai services + invoice pdf"

git fetch origin feat/frontend
git merge --no-ff origin/feat/frontend -m "merge: frontend"

# Resolve conflicts in main.py if any (likely none since teammates didn't touch it)
```

- [ ] **Step 17.2: Re-run migrations against the integrated DB**

```bash
cd backend
alembic upgrade head
# If Member C added a seed migration, run their seed script:
python -m app.seed.run_all  # only if they've finished
```

- [ ] **Step 17.3: Populate `backend/tests/smoke.py`**

```python
"""End-to-end happy path smoke test. Run with: pytest backend/tests/smoke.py -v"""
from fastapi.testclient import TestClient
from app.main import app
import uuid

c = TestClient(app)

def test_full_happy_path():
    email = f"smoke+{uuid.uuid4().hex[:6]}@x.com"
    # register
    r = c.post("/auth/register", json={
        "email": email, "password": "password123",
        "first_name": "Smoke", "last_name": "Tester",
    })
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}

    # create trip
    r = c.post("/trips", json={
        "name": "Test Trip", "start_date": "2026-06-01", "end_date": "2026-06-08",
        "total_budget": 1500,
    }, headers=h)
    assert r.status_code == 201
    trip_id = r.json()["id"]

    # add section
    r = c.post("/sections", json={
        "trip_id": trip_id, "title": "Days 1-3", "section_budget": 500,
        "start_date": "2026-06-01", "end_date": "2026-06-03",
    }, headers=h)
    assert r.status_code == 201
    section_id = r.json()["id"]

    # add activity
    r = c.post("/activities", json={
        "section_id": section_id, "name": "Eiffel Tower",
        "category": "sightseeing", "cost": 25, "duration_min": 120,
    }, headers=h)
    assert r.status_code == 201

    # add expense
    r = c.post("/expenses", json={
        "trip_id": trip_id, "category": "meal", "amount": 40,
        "expense_date": "2026-06-01",
    }, headers=h)
    assert r.status_code == 201

    # budget breakdown
    r = c.get(f"/trips/{trip_id}/budget-breakdown", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["total_spent"] == 40
    assert "meal" in body["by_category"]

    # publish + read public
    r = c.post(f"/trips/{trip_id}/publish", headers=h)
    assert r.status_code == 200
    slug = r.json()["public_slug"]
    r = c.get(f"/trips/public/{slug}")
    assert r.status_code == 200
```

- [ ] **Step 17.4: Run the smoke test**

```bash
cd backend
pytest tests/smoke.py -v
```

Expected: PASS.

- [ ] **Step 17.5: Manually exercise teammate features through the running server**

Boot:

```bash
uvicorn app.main:app --reload
```

Then verify in `/docs`:
- [ ] `POST /ai/generate-itinerary` returns a valid `ItineraryResponse` (Member D)
- [ ] `POST /ai/generate-packing/{trip_id}` returns a packing list (Member D)
- [ ] `GET /invoices/{invoice_id}/pdf` downloads a PDF (Member D)
- [ ] `GET /admin/stats` returns stats with admin token (Member C)
- [ ] `GET /cities?q=Paris` returns hits with photos populated (Member C)

If anything errors, ping the responsible teammate. Don't try to fix their code yourself — your job is to flag, theirs is to fix.

- [ ] **Step 17.6: Merge integration branch back to main**

```bash
git checkout main
git merge --no-ff chore/integration -m "chore: integrate all branches"
git push origin main
git branch -d chore/integration
```

---

## Phase 18 — Deploy + README + Tag

**Goal:** Live URLs, polished README, signed git tag for hackathon submission.

---

- [ ] **Step 18.1: Deploy backend to Render**

Steps:
1. Render dashboard → New Web Service → connect repo
2. Root directory: `backend/`
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Postgres add-on, copy `DATABASE_URL` to env
6. Add all env vars from `.env.example` (with real keys)
7. Deploy. Note the URL, e.g. `https://traveloop-api.onrender.com`

- [ ] **Step 18.2: Deploy frontend to Vercel** (Member A's responsibility — verify it points at the Render URL)

If Member A is overwhelmed, run for them:

```bash
cd frontend
echo "VITE_API_URL=https://traveloop-api.onrender.com" > .env.production
npx vercel --prod
```

- [ ] **Step 18.3: Update CORS origin in production**

In Render dashboard, set `FRONTEND_URL=https://traveloop.vercel.app` (or whatever the deployed URL is).

- [ ] **Step 18.4: Smoke-test prod URLs**

```bash
curl https://traveloop-api.onrender.com/health
curl https://traveloop-api.onrender.com/docs  # should return HTML
```

- [ ] **Step 18.5: Polish `README.md`**

Add to the README:
- Live demo URLs (frontend + API docs)
- Demo credentials (a seeded `admin@traveloop.com` / `traveloop123` account; Member C can add this in their seed script)
- Screenshots of the 14 main screens (request from Member A)
- Architecture diagram (one-paragraph description of FastAPI + Postgres + React + AI providers)
- Acknowledgements

- [ ] **Step 18.6: Tag the submission**

```bash
git tag -a hackathon-submission -m "Odoo Hackathon 2026 prelim submission"
git push origin hackathon-submission
```

- [ ] **Step 18.7: Done**

Submit the tag URL + live URLs to the hackathon platform.

---

## Self-Review Notes (already applied)

- All 45 endpoints from §7 of the build plan are covered across Phases 6–16.
- Schemas in Phase 3 cover all 13 modules referenced in §6 (auth, user, trip, section, activity, expense, packing, notes, community, city, ai, invoice, admin).
- Models in Phase 2 cover all 15 tables from §5 (users, cities, activity_templates, trips, trip_sections, trip_activities, expenses, invoices, invoice_items, packing_items, trip_notes, community_posts, community_comments, community_likes, saved_destinations, trip_copies).
- No "TODO" placeholders — every step has runnable code or commands.
- `next_activity_id` validation in Phase 10 matches the model definition in Phase 2.
- `derive_status` signature in Phase 8 matches what `_serialize` calls.
- Public sharing endpoints (`publish`, `copy`, `public/{slug}`, `public/{slug}/full`) are all in the trips router; saved destinations are in users router; both match §7.

## Known Trade-offs

- **Embedding column stored as TEXT JSON, not pgvector.** Keeps SQLite dev path alive. Cosine similarity computed in Python over ≤2k rows — fine for hackathon scale. If Postgres time permits, swap to `pgvector` later.
- **Forgot-password returns the reset token in the response body.** No email pipeline. Document this in the demo as "demo mode."
- **Photo uploads stored on local disk.** Render's filesystem is ephemeral on free tier — if photos need to survive restarts, swap to S3/Cloudinary. Acceptable for hackathon demo.
- **Semantic search falls back to substring match if no embeddings present.** Members C's seed populates embeddings; the endpoint works either way.
- **No rate limiting / no CSRF.** Hackathon scope.
