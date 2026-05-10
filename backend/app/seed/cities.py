"""
seed/cities.py — Downloads GeoNames cities15000 and bulk-inserts ~25k rows into `cities`.

Run standalone: python -m app.seed.cities
"""
import io
import math
import os
import zipfile

import pandas as pd
import requests
from sqlalchemy.dialects.postgresql import insert

from app.core.db import SessionLocal
from app.models import City

GEONAMES_URL = "https://download.geonames.org/export/dump/cities15000.zip"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

# GeoNames cities15000.txt column order (tab-separated, no header)
COLUMNS = [
    "id", "name", "asciiname", "alternatenames",
    "lat", "lng",
    "feature_class", "feature_code",
    "country_code", "cc2",
    "region", "admin2", "admin3", "admin4",
    "population", "elevation", "dem",
    "timezone", "modification_date",
]

# ISO 3166-1 alpha-2 → full country name (top countries; fallback to code)
COUNTRY_NAMES: dict[str, str] = {
    "IN": "India", "US": "United States", "CN": "China", "BR": "Brazil",
    "RU": "Russia", "DE": "Germany", "FR": "France", "GB": "United Kingdom",
    "JP": "Japan", "AU": "Australia", "CA": "Canada", "MX": "Mexico",
    "ID": "Indonesia", "NG": "Nigeria", "PK": "Pakistan", "BD": "Bangladesh",
    "PH": "Philippines", "EG": "Egypt", "VN": "Vietnam", "TR": "Turkey",
    "IR": "Iran", "TH": "Thailand", "ET": "Ethiopia", "KE": "Kenya",
    "CO": "Colombia", "AR": "Argentina", "UA": "Ukraine", "ES": "Spain",
    "KR": "South Korea", "IT": "Italy", "SA": "Saudi Arabia", "MY": "Malaysia",
    "GH": "Ghana", "TZ": "Tanzania", "ZA": "South Africa", "PL": "Poland",
    "DZ": "Algeria", "MA": "Morocco", "PE": "Peru", "IQ": "Iraq",
    "NL": "Netherlands", "PT": "Portugal", "SE": "Sweden", "NO": "Norway",
    "FI": "Finland", "CZ": "Czech Republic", "RO": "Romania", "HU": "Hungary",
    "AT": "Austria", "BE": "Belgium", "CH": "Switzerland", "GR": "Greece",
}


def _download_geonames() -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    zip_path = os.path.join(DATA_DIR, "cities15000.zip")
    if not os.path.exists(zip_path):
        print("  Downloading GeoNames cities15000.zip …")
        r = requests.get(GEONAMES_URL, stream=True, timeout=120)
        r.raise_for_status()
        with open(zip_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                f.write(chunk)
        print(f"  Saved → {zip_path}")
    else:
        print(f"  Found cache → {zip_path}")
    return zip_path


def _parse_geonames(zip_path: str) -> pd.DataFrame:
    print("  Parsing TSV …")
    with zipfile.ZipFile(zip_path) as z:
        with z.open("cities15000.txt") as f:
            df = pd.read_csv(
                f, sep="\t", header=None, names=COLUMNS,
                low_memory=False, dtype=str,
            )

    # Keep only populated places
    df = df[df["feature_class"] == "P"].copy()
    df["population"] = (
        pd.to_numeric(df["population"], errors="coerce").fillna(0).astype(int)
    )
    df = df[df["population"] > 0].copy()

    # Numeric coords
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lng"] = pd.to_numeric(df["lng"], errors="coerce")

    # Popularity score: log(pop) / log(max_pop) → [0, 1]
    max_pop = df["population"].max()
    df["popularity_score"] = df["population"].apply(
        lambda p: round(math.log(p) / math.log(max_pop), 6) if p > 1 else 0.0
    )

    # Denormalized country name
    df["country"] = df["country_code"].map(COUNTRY_NAMES).fillna(df["country_code"])

    print(f"  Parsed {len(df):,} populated places")
    return df


def run_cities() -> None:
    print("[cities] Starting …")
    zip_path = _download_geonames()
    df = _parse_geonames(zip_path)

    rows = [
        {
            "id":               int(row.id),
            "name":             str(row.name)[:150],
            "country":          str(row.country)[:100] if row.country else None,
            "region":           str(row.region)[:100] if isinstance(row.region, str) else None,
            "lat":              float(row.lat) if row.lat == row.lat else None,  # NaN check
            "lng":              float(row.lng) if row.lng == row.lng else None,
            "popularity_score": row.popularity_score,
        }
        for row in df.itertuples()
    ]

    print(f"  Inserting {len(rows):,} rows (ON CONFLICT DO NOTHING) …")
    db = SessionLocal()
    try:
        # Chunk to avoid hitting Postgres parameter limits
        chunk_size = 1000
        for i in range(0, len(rows), chunk_size):
            chunk = rows[i : i + chunk_size]
            stmt = insert(City).values(chunk)
            stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
            db.execute(stmt)
        db.commit()
        count = db.query(City).count()
        print(f"[cities] ✅ Done — {count:,} rows in cities table")
    finally:
        db.close()


if __name__ == "__main__":
    run_cities()
