# Traveloop

Multi-city travel planning web app. Built for the Odoo Hackathon 2026.

## Stack

- **Backend:** FastAPI + SQLAlchemy 2.0 + PostgreSQL 16
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **AI:** Groq (primary) + Gemini (fallback)
- **Deploy:** Vercel (frontend) + Render (backend)

PostgreSQL is the only supported database. `docker-compose up -d` starts the Postgres container required for local dev.

## Quick start

```bash
# Start Postgres
docker-compose up -d

# Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1                  # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                      # then edit JWT_SECRET_KEY + AI keys
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
| Aniket | `feat/frontend` | entire `frontend/` |
| Harshal | `feat/data-admin` | seed scripts, admin endpoints |
| Onkar | `feat/ai-invoice` | AI services, invoice PDF |
