"""
seed/cost_index.py — Applies Numbeo cost-of-living index to cities.

Works with a COUNTRY-LEVEL CSV (what you already have):
    backend/data/Cost_of_Living_Index_by_Country_2024.csv

Strategy:
    - Fuzzy-match CSV country names → cities.country (denormalized full name)
    - UPDATE all cities in that country SET cost_index = <value>
    - This covers all ~25k cities with ~122 country data points

CSV columns used:
    Country, Cost of Living Index

Run standalone: python -m app.seed.cost_index
"""
import os

import pandas as pd
from rapidfuzz import fuzz, process
from sqlalchemy import update

from app.core.db import SessionLocal
from app.models import City

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

# Accepted CSV filenames (tries each in order)
CSV_CANDIDATES = [
    "Cost_of_Living_Index_by_Country_2024.csv",
    "cost_of_living.csv",
    "cost_of_living_2024.csv",
]

SCORE_CUTOFF = 75  # fuzzy match threshold (0-100)


def _find_csv() -> str:
    for name in CSV_CANDIDATES:
        path = os.path.join(DATA_DIR, name)
        if os.path.exists(path):
            print(f"  Found CSV: {path}")
            return path
    raise FileNotFoundError(
        f"No cost-of-living CSV found in {DATA_DIR}.\n"
        f"Tried: {CSV_CANDIDATES}"
    )


def _load_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]

    # Auto-detect country column
    country_col = next(
        (c for c in df.columns if "country" in c.lower()), None
    )
    # Auto-detect cost index column
    cost_col = next(
        (c for c in df.columns
         if "cost of living index" in c.lower() or c.lower() == "cost_index"),
        None,
    )

    if not country_col:
        raise ValueError(f"Cannot find country column. Columns: {list(df.columns)}")
    if not cost_col:
        raise ValueError(f"Cannot find cost index column. Columns: {list(df.columns)}")

    df = df[[country_col, cost_col]].copy()
    df.columns = ["country", "cost_index"]
    df["country"] = df["country"].astype(str).str.strip()
    df["cost_index"] = pd.to_numeric(df["cost_index"], errors="coerce")
    df = df.dropna()
    print(f"  Loaded {len(df)} country rows from CSV")
    return df


def run_cost_index() -> None:
    print("[cost_index] Starting (country-level CSV → all cities in each country) …")

    path = _find_csv()
    df = _load_csv(path)

    db = SessionLocal()
    try:
        # Get the distinct country names already stored in cities table
        country_rows = (
            db.query(City.country)
            .filter(City.country.isnot(None))
            .distinct()
            .all()
        )
        if not country_rows:
            print("[cost_index] ⚠ cities table is empty — run cities seed first")
            return

        db_countries = [r.country for r in country_rows if r.country]
        print(f"  {len(db_countries)} distinct countries in cities table")

        matched_countries = 0
        total_cities_updated = 0
        unmatched: list[str] = []

        for _, row in df.iterrows():
            csv_country = str(row["country"])
            cost_val = float(row["cost_index"])

            # Fuzzy-match the CSV country name against countries in our DB
            result = process.extractOne(
                csv_country,
                db_countries,
                scorer=fuzz.WRatio,
                score_cutoff=SCORE_CUTOFF,
            )

            if result:
                best_match, score, _ = result
                # UPDATE all cities in this country
                updated = (
                    db.query(City)
                    .filter(City.country == best_match, City.cost_index.is_(None))
                    .update({"cost_index": round(cost_val, 2)}, synchronize_session=False)
                )
                total_cities_updated += updated
                matched_countries += 1
                print(f"  ✓ {csv_country!r:35} → {best_match!r:25} (score={score:.0f}) — {updated} cities")
            else:
                unmatched.append(csv_country)

        db.commit()

        # Verify
        covered = db.query(City).filter(City.cost_index.isnot(None)).count()
        total = db.query(City).count()
        print(
            f"\n[cost_index] ✅ Done:\n"
            f"  Countries matched : {matched_countries}/{len(df)}\n"
            f"  Cities updated    : {total_cities_updated:,}\n"
            f"  DB coverage       : {covered:,}/{total:,} cities have cost_index"
        )
        if unmatched:
            print(f"  Unmatched countries ({len(unmatched)}): {unmatched[:10]}")
    finally:
        db.close()


if __name__ == "__main__":
    run_cost_index()
