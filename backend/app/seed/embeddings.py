"""
seed/embeddings.py — Generates 384-dim sentence-transformer embeddings for
cities and activity_templates, storing them as FLOAT8[] in Postgres.

Cosine similarity is computed in Python/NumPy at query time (~50-100ms for 25k rows).
No pgvector extension required.

Model: all-MiniLM-L6-v2 (~80 MB download on first run)
Run standalone: python -m app.seed.embeddings
"""
import json
import os

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.db import SessionLocal
from app.models import ActivityTemplate, City

MODEL_NAME = "all-MiniLM-L6-v2"
BATCH_SIZE = 256
COMMIT_EVERY = 500  # rows between DB commits to avoid huge transactions


def _encode_in_batches(model: SentenceTransformer, texts: list[str]) -> np.ndarray:
    """Encode a list of texts and return a 2-D numpy array (N, 384)."""
    return model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=False,
    )


def run_embeddings() -> None:
    print(f"[embeddings] Loading model {MODEL_NAME} …")
    model = SentenceTransformer(MODEL_NAME)

    db = SessionLocal()
    try:
        # ── Cities ────────────────────────────────────────────────────────────
        cities = db.query(City).filter(City.embedding.is_(None)).all()
        print(f"[embeddings] Embedding {len(cities):,} cities …")

        if cities:
            texts = [
                f"{c.name}, {c.country or ''}: {c.description or c.name}"
                for c in cities
            ]
            vectors = _encode_in_batches(model, texts)  # shape (N, 384)

            for i, (city, vec) in enumerate(zip(cities, vectors), 1):
                city.embedding = json.dumps(vec.tolist())
                db.add(city)
                if i % COMMIT_EVERY == 0:
                    db.commit()
                    print(f"  committed {i:,}/{len(cities):,} cities …")

            db.commit()
            embedded_cities = db.query(City).filter(City.embedding.isnot(None)).count()
            print(f"[embeddings] Cities done — {embedded_cities:,} rows have embedding")

        # ── Activity Templates ────────────────────────────────────────────────
        acts = (
            db.query(ActivityTemplate)
            .filter(ActivityTemplate.embedding.is_(None))
            .all()
        )
        print(f"[embeddings] Embedding {len(acts):,} activity templates …")

        if acts:
            texts = [
                f"{a.name}: {a.description or a.category or a.name}"
                for a in acts
            ]
            vectors = _encode_in_batches(model, texts)

            for i, (act, vec) in enumerate(zip(acts, vectors), 1):
                act.embedding = json.dumps(vec.tolist())
                db.add(act)
                if i % COMMIT_EVERY == 0:
                    db.commit()
                    print(f"  committed {i:,}/{len(acts):,} activities …")

            db.commit()
            embedded_acts = (
                db.query(ActivityTemplate)
                .filter(ActivityTemplate.embedding.isnot(None))
                .count()
            )
            print(f"[embeddings] Activities done — {embedded_acts:,} rows have embedding")

        print("[embeddings] Done")
    finally:
        db.close()


if __name__ == "__main__":
    run_embeddings()
