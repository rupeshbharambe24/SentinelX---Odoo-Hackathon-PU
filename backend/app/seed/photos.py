"""
seed/photos.py — Fetches city photos.

Two providers, used in this order:

1. Pexels (curated, beautiful, key-gated)
   - Free tier: 200 req/hr.
   - Quality: high. Used for the top ~1000 cities by popularity.
   - Set PEXELS_API_KEY in .env.

2. Wikimedia / Wikipedia REST (free, no key, mass coverage)
   - https://en.wikipedia.org/api/rest_v1/page/summary/{title}
   - Quality: variable. Used for the long tail of cities Pexels doesn't reach.
   - No rate-limit enforcement, but we sleep 0.05s to be polite.

Activity photos are SKIPPED — frontend uses category SVG icons instead.

Run standalone:  python -m app.seed.photos
                 python -m app.seed.photos --pexels-only
                 python -m app.seed.photos --wikimedia-only
                 python -m app.seed.photos --limit 5000
"""
import argparse
import os
import time
import urllib.parse
from typing import Optional

import requests

from app.core.db import SessionLocal
from app.models import City

PEXELS_KEY = os.environ.get("PEXELS_API_KEY", "")
PEXELS_URL = "https://api.pexels.com/v1/search"
WIKI_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/"
PEXELS_LIMIT = 200          # one Pexels run = at most this many calls
PEXELS_SLEEP = 0.35         # ~170 req/hr safe rate
WIKI_SLEEP = 0.05           # 20 req/sec, well under public-API guidance


# ── Pexels ──────────────────────────────────────────────────────────────────

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
            print("    Rate limited — sleeping 60s ...")
            time.sleep(60)
        else:
            print(f"    Pexels status {resp.status_code}")
    except Exception as e:
        print(f"    Pexels error: {e}")
    return None


def _run_pexels(limit: int = PEXELS_LIMIT) -> int:
    if not PEXELS_KEY:
        print("[photos:pexels] PEXELS_API_KEY not set — skipping Pexels step")
        return 0
    print(f"[photos:pexels] Top {limit} unphotographed cities by popularity ...")
    success = 0
    db = SessionLocal()
    try:
        cities = (
            db.query(City)
            .filter(City.photo_url.is_(None))
            .order_by(City.popularity_score.desc())
            .limit(limit)
            .all()
        )
        total = len(cities)
        print(f"  {total} candidates")
        for i, city in enumerate(cities, 1):
            query = f"{city.name} {city.country or ''} city landscape"
            url = _fetch_pexels_url(query)
            if url:
                city.photo_url = url
                db.add(city)
                success += 1
            mark = "ok" if url else "--"
            print(f"  [{i:4}/{total}] {city.name} -> {mark}")
            if i % 20 == 0:
                db.commit()
            time.sleep(PEXELS_SLEEP)
        db.commit()
    finally:
        db.close()
    print(f"[photos:pexels] {success}/{total} fetched")
    return success


# ── Wikimedia / Wikipedia ──────────────────────────────────────────────────

def _fetch_wiki_url(name: str, country: Optional[str]) -> Optional[str]:
    """Try '{Name},_{Country}' first; fall back to just '{Name}'."""
    candidates = []
    if country:
        candidates.append(f"{name},_{country}")
    candidates.append(name)
    for title in candidates:
        try:
            resp = requests.get(
                WIKI_URL + urllib.parse.quote(title.replace(" ", "_")),
                headers={"User-Agent": "TraveloopSeed/1.0 (hackathon)"},
                timeout=10,
            )
            if resp.status_code != 200:
                continue
            data = resp.json()
            # Skip disambiguation pages — they don't have meaningful images
            if data.get("type") == "disambiguation":
                continue
            img = data.get("originalimage") or data.get("thumbnail") or {}
            url = img.get("source")
            if url:
                return url
        except Exception as e:
            print(f"    Wiki error for '{title}': {e}")
    return None


def _run_wikimedia(limit: int) -> int:
    print(f"[photos:wiki] Top {limit} unphotographed cities by popularity ...")
    success = 0
    db = SessionLocal()
    try:
        cities = (
            db.query(City)
            .filter(City.photo_url.is_(None))
            .order_by(City.popularity_score.desc())
            .limit(limit)
            .all()
        )
        total = len(cities)
        print(f"  {total} candidates")
        for i, city in enumerate(cities, 1):
            url = _fetch_wiki_url(city.name, city.country)
            if url:
                city.photo_url = url
                db.add(city)
                success += 1
            mark = "ok" if url else "--"
            if i % 50 == 0 or i == total:
                print(f"  [{i:4}/{total}] {city.name} -> {mark}  (success={success})")
                db.commit()
            time.sleep(WIKI_SLEEP)
        db.commit()
    finally:
        db.close()
    print(f"[photos:wiki] {success}/{total} fetched")
    return success


# ── Orchestrator ────────────────────────────────────────────────────────────

def run_photos(pexels: bool = True, wikimedia: bool = True, limit: int = 5000) -> None:
    """Run Pexels first (curated quality for the top), then Wikimedia for the long tail."""
    if pexels:
        _run_pexels(limit=PEXELS_LIMIT)
    if wikimedia:
        _run_wikimedia(limit=limit)
    db = SessionLocal()
    try:
        count = db.query(City).filter(City.photo_url.isnot(None)).count()
    finally:
        db.close()
    print(f"[photos] Done. Total cities with photo_url: {count}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pexels-only", action="store_true")
    parser.add_argument("--wikimedia-only", action="store_true")
    parser.add_argument(
        "--limit",
        type=int,
        default=5000,
        help="Max cities for the Wikimedia step (default 5000)",
    )
    args = parser.parse_args()

    if args.pexels_only:
        run_photos(pexels=True, wikimedia=False, limit=args.limit)
    elif args.wikimedia_only:
        run_photos(pexels=False, wikimedia=True, limit=args.limit)
    else:
        run_photos(limit=args.limit)
