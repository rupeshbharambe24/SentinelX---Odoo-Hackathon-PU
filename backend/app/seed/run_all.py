"""
seed/run_all.py — Full pipeline orchestrator.

Usage:
    cd backend
    python -m app.seed.run_all

Each step is independently idempotent (ON CONFLICT DO NOTHING / NULL checks).
Re-running is safe at any point.
"""
import sys
import time


def _step(name: str, fn) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {name}")
    print(f"{'=' * 60}")
    t0 = time.time()
    try:
        fn()
    except Exception as exc:
        print(f"\n[ERROR] {name} failed: {exc}")
        print("Fix the error and re-run — previous steps are already committed.")
        sys.exit(1)
    elapsed = time.time() - t0
    print(f"  Completed in {elapsed:.1f}s")


if __name__ == "__main__":
    # Import here so env vars are loaded first (e.g. via python-dotenv or shell)
    from app.seed.cities import run_cities
    from app.seed.cost_index import run_cost_index
    from app.seed.activities import run_activities
    from app.seed.photos import run_photos
    from app.seed.embeddings import run_embeddings

    total_start = time.time()

    _step("Step 1/5 — Cities (GeoNames 33,645 rows)", run_cities)
    _step("Step 2/5 — Cost Index (Numbeo fuzzy match → 27,866 cities)", run_cost_index)
    _step("Step 3/5 — Activities (OpenTripMap top 100 cities → ~3,900 rows)", run_activities)
    _step("Step 4/5 — Photos (Pexels top 200 cities)", run_photos)
    _step("Step 5/5 — Embeddings (all-MiniLM-L6-v2 384-dim → all rows)", run_embeddings)

    total = time.time() - total_start
    print(f"\n{'=' * 60}")
    print(f"  Seed complete in {total / 60:.1f} min")
    print(f"{'=' * 60}")
