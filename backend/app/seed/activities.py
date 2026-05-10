"""
seed/activities.py — Fetches activity places from OpenTripMap for top 100 cities
and inserts them into activity_templates.

Requires env var: OPENTRIPMAP_KEY
Free tier: 5 req/sec → we sleep 0.25s between requests.

Run standalone: python -m app.seed.activities
"""
import os
import time
from typing import Any, Optional

import requests
from sqlalchemy.dialects.postgresql import insert

from app.core.db import SessionLocal
from app.models import ActivityTemplate, City

OTM_KEY = os.environ.get("OPENTRIPMAP_KEY", "")
OTM_RADIUS_URL = "https://api.opentripmap.com/0.1/en/places/radius"
OTM_DETAIL_URL = "https://api.opentripmap.com/0.1/en/places/xid/{xid}"

TOP_CITIES_LIMIT = 100
RADIUS_METERS = 10_000
PLACES_PER_CITY = 50
SLEEP_BETWEEN_REQUESTS = 0.25  # seconds — stays under 5 req/sec

# Famous-tourist cities that population-rank doesn't capture. Always seeded
# even if they don't crack the top 100. Names + countries match GeoNames.
TOURIST_CITIES: list[tuple[str, str]] = [
    ("Paris", "France"), ("Rome", "Italy"), ("Kyoto", "Japan"),
    ("Venice", "Italy"), ("Barcelona", "Spain"), ("Amsterdam", "Netherlands"),
    ("Prague", "Czechia"), ("Vienna", "Austria"), ("Florence", "Italy"),
    ("Athens", "Greece"), ("Lisbon", "Portugal"), ("Madrid", "Spain"),
    ("Marrakesh", "Morocco"), ("Cape Town", "South Africa"),
    ("Buenos Aires", "Argentina"), ("Rio de Janeiro", "Brazil"),
    ("Edinburgh", "United Kingdom"), ("Dublin", "Ireland"),
    ("Stockholm", "Sweden"), ("Copenhagen", "Denmark"),
    ("Mexico City", "Mexico"), ("Cusco", "Peru"),
    ("Reykjavík", "Iceland"), ("Sydney", "Australia"),
    ("Auckland", "New Zealand"), ("Singapore", "Singapore"),
    ("Hong Kong", "Hong Kong"), ("Berlin", "Germany"),
    ("Munich", "Germany"), ("Budapest", "Hungary"),
]

# OpenTripMap 'kinds' → estimated avg cost (USD)
KINDS_COST_MAP: dict[str, float] = {
    "museums":                      15.0,
    "art_galleries":                12.0,
    "historic":                     10.0,
    "archaeology":                   8.0,
    "architecture":                  0.0,
    "natural":                       0.0,
    "gardens_and_parks":             0.0,
    "beaches":                       0.0,
    "amusements":                   25.0,
    "theatres_and_entertainments":  20.0,
    "cinemas":                      12.0,
    "sport":                        10.0,
    "zoos":                         18.0,
    "religion":                      0.0,
    "monasteries":                   5.0,
    "cultural":                      5.0,
    "shopping":                     30.0,
    "foods":                        15.0,
    "restaurants":                  20.0,
    "cafes":                         8.0,
    "nightlife":                    25.0,
}

# OpenTripMap kinds → simplified category for our schema.
#
# Order matters: this dict is iterated and the first key matching as a
# substring of the place's kinds CSV wins. So put MORE SPECIFIC categories
# before "sightseeing", otherwise a restaurant tagged "foods,restaurants,
# interesting_places" would match nothing food-related and fall through.
KINDS_CATEGORY_MAP: dict[str, str] = {
    # food (must be checked first — overlaps with sightseeing tags)
    "foods":                        "food",
    "restaurants":                  "food",
    "cafes":                        "food",
    # shopping
    "shopping":                     "shopping",
    "marketplaces":                 "shopping",
    # nightlife
    "nightlife":                    "nightlife",
    "pubs":                         "nightlife",
    "bars":                         "nightlife",
    # relaxation
    "beaches":                      "relaxation",
    "gardens_and_parks":            "relaxation",
    "spa":                          "relaxation",
    # adventure
    "sport":                        "adventure",
    "natural":                      "adventure",
    # everything else → sightseeing
    "museums":                      "sightseeing",
    "art_galleries":                "sightseeing",
    "historic":                     "sightseeing",
    "archaeology":                  "sightseeing",
    "architecture":                 "sightseeing",
    "amusements":                   "sightseeing",
    "theatres_and_entertainments":  "sightseeing",
    "cinemas":                      "sightseeing",
    "zoos":                         "sightseeing",
    "religion":                     "sightseeing",
    "cultural":                     "sightseeing",
}

# Average duration (minutes) by category — varies more than a flat 60.
DURATION_BY_CATEGORY: dict[str, int] = {
    "food":         90,
    "shopping":     90,
    "nightlife":   180,
    "relaxation":  120,
    "adventure":   180,
    "sightseeing": 90,
}


def _estimate_cost(kinds: str) -> float:
    for key, cost in KINDS_COST_MAP.items():
        if key in kinds:
            return cost
    return 5.0


def _map_category(kinds: str) -> str:
    for key, cat in KINDS_CATEGORY_MAP.items():
        if key in kinds:
            return cat
    return "sightseeing"


# Union of OpenTripMap top-level groups we want. interesting_places is the
# default sightseeing bucket; foods adds restaurants/cafes; amusements adds
# zoos/theme parks; cultural adds museums/galleries that aren't in
# interesting_places.
OTM_KINDS = "interesting_places,foods,amusements,cultural"


def _fetch_places(lat: float, lng: float) -> list[dict[str, Any]]:
    """Call radius endpoint and return raw JSON list."""
    try:
        resp = requests.get(
            OTM_RADIUS_URL,
            params={
                "lat": lat,
                "lon": lng,
                "radius": RADIUS_METERS,
                "kinds": OTM_KINDS,
                "format": "json",
                "limit": PLACES_PER_CITY,
                "apikey": OTM_KEY,
            },
            timeout=20,
        )
        if resp.status_code == 200:
            return resp.json()
        print(f"    OTM status {resp.status_code}: {resp.text[:120]}")
    except Exception as e:
        print(f"    OTM request error: {e}")
    return []


def _safe_str(value: Any, max_len: int) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s[:max_len] if s else None


def run_activities() -> None:
    if not OTM_KEY:
        raise EnvironmentError(
            "OPENTRIPMAP_KEY is not set. Add it to backend/.env"
        )

    print("[activities] Starting …")
    db = SessionLocal()
    try:
        # Top N by popularity (raw population proxy)
        top_cities = (
            db.query(City)
            .order_by(City.popularity_score.desc())
            .limit(TOP_CITIES_LIMIT)
            .all()
        )

        # Hard-include the tourist list — population rank misses Paris/Rome/etc.
        tourist_rows: list[City] = []
        for name, country in TOURIST_CITIES:
            row = (
                db.query(City)
                .filter(City.name == name, City.country == country)
                .first()
            )
            if row:
                tourist_rows.append(row)

        # Union; dedupe by id while preserving order (top-pop first, then tourist tail)
        seen: set[int] = set()
        cities: list[City] = []
        for c in [*top_cities, *tourist_rows]:
            if c.id in seen:
                continue
            seen.add(c.id)
            cities.append(c)
        print(f"  {len(cities)} cities to process ({len(top_cities)} top-pop + {len(tourist_rows)} tourist; {len(cities) - len(top_cities)} new)")
        top_cities = cities

        all_rows: list[dict] = []
        seen_ids: set[int] = set()

        for idx, city in enumerate(top_cities, 1):
            print(f"  [{idx:3}/{len(top_cities)}] {city.name} ({city.country or ''})")
            places = _fetch_places(city.lat, city.lng)
            time.sleep(SLEEP_BETWEEN_REQUESTS)

            for place in places:
                try:
                    xid = place.get("xid", "")
                    # OpenTripMap xid is string like "N123456" — hash to get a stable int id
                    place_id = abs(hash(xid)) % (10 ** 9)
                    if place_id in seen_ids:
                        continue
                    seen_ids.add(place_id)

                    props = place.get("properties", {})
                    kinds = props.get("kinds", "")
                    coords = place.get("geometry", {}).get("coordinates", [None, None])
                    lng_val = coords[0] if coords[0] is not None else None
                    lat_val = coords[1] if coords[1] is not None else None

                    # Try to get description from wikipedia_extracts
                    extracts = props.get("wikipedia_extracts")
                    description = None
                    if isinstance(extracts, dict):
                        description = _safe_str(extracts.get("text"), 2000)

                    raw_name = props.get("name") or place.get("name", "")
                    if not raw_name:
                        continue  # skip unnamed places

                    category = _map_category(kinds)
                    all_rows.append({
                        "id":               place_id,
                        "city_id":          city.id,
                        "name":             _safe_str(raw_name, 200),
                        "category":         category,
                        "avg_cost":         _estimate_cost(kinds),
                        "avg_duration_min": DURATION_BY_CATEGORY.get(category, 60),
                        "description":      description,
                    })
                except Exception as e:
                    print(f"    ⚠ Skipping place: {e}")
                    continue

        print(f"  Inserting {len(all_rows):,} activity rows …")
        chunk_size = 500
        for i in range(0, len(all_rows), chunk_size):
            chunk = all_rows[i : i + chunk_size]
            stmt = insert(ActivityTemplate).values(chunk)
            stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
            db.execute(stmt)
        db.commit()

        count = db.query(ActivityTemplate).count()
        print(f"[activities] ✅ Done — {count:,} rows in activity_templates")
    finally:
        db.close()


if __name__ == "__main__":
    run_activities()
