import pathlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import (
    activities,
    admin,
    ai,
    auth,
    cities,
    community,
    expenses,
    invoice,
    notes,
    packing,
    sections,
    trips,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    pathlib.Path("uploads/avatars").mkdir(parents=True, exist_ok=True)
    pathlib.Path("uploads/covers").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Traveloop API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static for user-uploaded avatars + trip cover photos.
pathlib.Path("uploads/avatars").mkdir(parents=True, exist_ok=True)
pathlib.Path("uploads/covers").mkdir(parents=True, exist_ok=True)
app.mount("/static/avatars", StaticFiles(directory="uploads/avatars"), name="avatars")
app.mount("/static/covers", StaticFiles(directory="uploads/covers"), name="covers")

# Resource-clean routers — single prefix.
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(trips.router, prefix="/trips", tags=["trips"])
app.include_router(sections.router, prefix="/sections", tags=["sections"])
app.include_router(activities.router, prefix="/activities", tags=["activities"])
app.include_router(community.router, prefix="/community", tags=["community"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

# Mixed-path routers — full paths defined inside each router.
app.include_router(expenses.router, tags=["expenses"])
app.include_router(packing.router, tags=["packing"])
app.include_router(notes.router, tags=["notes"])
app.include_router(cities.router, tags=["cities"])
app.include_router(invoice.router, tags=["invoice"])


@app.get("/health")
def health():
    return {"status": "ok"}
