# Traveloop

Multi-city travel planning web app. Built for the Odoo Hackathon 2026.

## Stack

- **Backend:** FastAPI + SQLAlchemy 2.0 + Postgres (SQLite fallback for dev)
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **AI:** Groq (primary) + Gemini (fallback)
- **Deploy:** Vercel (frontend) + Render (backend)

## Quick start

```bash
# Backend
docker-compose up -d                        # start postgres
cd backend
python -m venv .venv
.venv\Scripts\activate                      # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env                      # then edit DATABASE_URL + secrets
alembic upgrade head
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs for the API explorer.

```bash
# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Team

| Member | Branch | Owns |
|--------|--------|------|
| Rupesh | `feat/core` | core backend, integration |
| Member A | `feat/frontend` | entire `frontend/` |
| Member C | `feat/data-admin` | seed scripts, admin endpoints |
| Member D | `feat/ai-invoice` | AI services, invoice PDF |

See [TRAVELOOP_BUILD_PLAN.md](TRAVELOOP_BUILD_PLAN.md) and [docs/superpowers/plans/](docs/superpowers/plans/) for details.
