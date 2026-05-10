"""
seed/photos.py — Fetches city photos from Pexels API for top 200 cities.

Why Pexels instead of Unsplash:
  Unsplash free = 50 req/hr → 3200 activity photos = 64 hrs (impossible).
  Pexels free = 200 req/hr, no review → 200 cities in ~70 seconds.
  Activity photos are SKIPPED — frontend uses category SVG icons instead.

Requires env var: PEXELS_API_KEY  (get free key at https://www.pexels.com/api/)
Run standalone: python -m app.seed.photos
"""
import os
import time
from typing import Optional

import requests

from app.core.db import SessionLocal
from app.models import City

PEXELS_KEY = os.environ.get("PEXELS_API_KEY", "")
PEXELS_URL = "https://api.pexels.com/v1/search"
TOP_CITIES_LIMIT = 200
SLEEP_BETWEEN_REQUESTS = 0.35  # 200 req/hr limit → ~170/hr at this rate


def _fetch_pexels_url(query: str) -> Optional[str]:
    try:
        resp = requests.get(
            PEXELS_URL,
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            headers={"Authorization": PEXELS_KEY},
            timeout=15,
        )
        if resp.status_code == 200:
            photos = resp.json().get("photos", [])
            if photos:
                return photos[0]["src"]["large"]
        elif resp.status_code == 429:
            print("    Rate limited — sleeping 60s …")
            time.sleep(60)
        else:
            print(f"    Pexels status {resp.status_code}")
    except Exception as e:
        print(f"    Pexels error: {e}")
    return None


def run_photos() -> None:
    if not PEXELS_KEY:
        raise EnvironmentError(
            "PEXELS_API_KEY not set. Get free key at https://www.pexels.com/api/\n"
            "Add PEXELS_API_KEY=your_key to backend/.env"
        )

    print("[photos] Starting — top 200 cities …")
    db = SessionLocal()
    try:
        cities = (
            db.query(City)
            .filter(City.photo_url.is_(None))
            .order_by(City.popularity_score.desc())
            .limit(TOP_CITIES_LIMIT)
            .all()
        )
        total = len(cities)
        print(f"  {total} cities need photos")
        success = 0

        for i, city in enumerate(cities, 1):
            query = f"{city.name} {city.country or ''} city landscape"
            url = _fetch_pexels_url(query)
            if url:
                city.photo_url = url
                db.add(city)
                success += 1
            print(f"  [{i:3}/{total}] {city.name} → {'✓' if url else '✗'}")
            if i % 20 == 0:
                db.commit()
            time.sleep(SLEEP_BETWEEN_REQUESTS)

        db.commit()
        count = db.query(City).filter(City.photo_url.isnot(None)).count()
        print(f"[photos] Done — {count} cities with photo_url ({success}/{total} fetched this run)")
        print("[photos] Activity photos skipped — use category SVG icons in frontend")
    finally:
        db.close()


if __name__ == "__main__":
    run_photos()
