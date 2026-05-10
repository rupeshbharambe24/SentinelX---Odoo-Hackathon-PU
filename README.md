<div align="center">

<img src="https://api.iconify.design/lucide:sparkles.svg?color=%23F55036&width=72" width="72" alt="ai" />

# Traveloop · `feat/ai-invoice`

### AI itinerary generation + server-side invoice PDFs

Branch owner: **Onkar Kalyankar** ([onkarkalyankar11@gmail.com](mailto:onkarkalyankar11@gmail.com))
Final integrated state: [**`main`**](../../tree/main)

[![Branch](https://img.shields.io/badge/branch-feat%2Fai--invoice-714B67)]()
[![Merged](https://img.shields.io/badge/merged_to-main-success)]()
[![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-F55036)]()
[![Gemini](https://img.shields.io/badge/Gemini-2.5_flash-4285F4?logo=google&logoColor=white)]()
[![WeasyPrint](https://img.shields.io/badge/WeasyPrint-62.3-black)]()

</div>

---

## What this branch contains

The two "AI feels real" pieces of Traveloop:

1. **AI services** — Groq + Gemini fallback client, structured-JSON itinerary generator, context-aware packing list, two-sentence trip summary
2. **Invoice services** — server-side PDF rendering via WeasyPrint, full lifecycle from draft → paid

This branch was rebased onto `main` and merged. The work is now integrated into [main](../../tree/main); this branch is preserved for authorship traceability.

---

## 📦 Deliverables

### 1. Unified LLM client — `services/ai/client.py`

A single `llm_call(prompt, json_mode=False) -> str` that:
- Tries Groq's `llama-3.3-70b-versatile` first (fast, free tier, ~1.5s)
- Falls back to Google Gemini `gemini-2.5-flash` on any error
- Surfaces a clean `RuntimeError` when both providers fail (router translates to HTTP 503)
- Supports both free-text and JSON-mode (Groq: `response_format={"type": "json_object"}`; Gemini: prompt-suffix instruction)

### 2. Three AI generators

| Endpoint | Service | Returns |
|---|---|---|
| `POST /ai/generate-itinerary` | `services/ai/itinerary.py` | `ItineraryResponse` — multi-day sections with activities, costs, durations, descriptions |
| `POST /ai/generate-packing/{trip_id}` | `services/ai/packing.py` | `List[PackingItemSchema]` — 15-20 items categorised into documents/clothing/electronics/toiletries/other |
| `POST /ai/summarize/{trip_id}` | `services/ai/summary.py` | `TripSummaryResponse` — two-sentence summary for the public share view |

All three:
- Respect the frozen `app/schemas/ai.py` contract from Rupesh
- Use `app.core.db.get_db` + `app.core.security.get_current_user`
- Enforce ownership (e.g., packing-list generation rejects trips owned by another user)
- Have a 3-attempt JSON-parse retry loop in `itinerary.py` with markdown-fence stripping

### 3. Invoice pipeline — 5 endpoints + WeasyPrint PDF

| Endpoint | What it does |
|---|---|
| `GET /trips/{id}/invoice` | Auto-generates an invoice from `expenses` if one doesn't exist, returns `InvoiceData` |
| `POST /trips/{id}/invoice/generate` | Recomputes the invoice from latest expenses |
| `PUT /trips/{id}/invoice` | Updates `tax_percent` and/or `discount`, recomputes |
| `POST /invoices/{id}/mark-paid` | Flips status to `paid`, persists |
| `GET /invoices/{id}/pdf` | Streams a real PDF (WeasyPrint + Jinja2 template) — content-type `application/pdf` |

`services/invoice/builder.py`:
- Groups expenses by category → one line item per category
- Computes subtotal, tax_amount, grand_total with discount clamping
- Detects mixed currencies and raises `ValueError` (router → HTTP 400)
- Generates deterministic invoice numbers like `INV-2026-29AF83`

`services/invoice/pdf.py`:
- Loads `app/templates/invoice.html` via Jinja2 with autoescape
- Renders to PDF via WeasyPrint
- Searches multiple template directories so it works in dev and packaged builds

`app/templates/invoice.html` (~430 lines):
- Header with Traveloop branding + invoice number + date
- Billed-to block + trip details
- Line items table
- Subtotal / Tax / Discount / Grand Total
- PAID/PENDING status stamp

---

## 🏗️ Decisions

- **Why Groq primary, Gemini fallback?** Groq's free tier is fast and generous (`llama-3.3-70b-versatile` ~1.5s response). Gemini `2.5-flash` is the safety net — different provider, different rate limit, different failure mode. If both fail (extremely rare), the router returns 503 instead of crashing.
- **Why JSON-mode + retry loop?** LLMs occasionally wrap JSON in ```json fences or add chatter. The itinerary generator strips fences, parses, validates against `ItineraryResponse`, and retries up to 3 times before giving up. Net: structured output reliability without flaky demos.
- **Why server-side PDFs (WeasyPrint) instead of client-side jspdf?** Two reasons: (1) the template can use real CSS layout — flexbox, grid, page breaks — which jspdf can't; (2) bytes are streamed as `application/pdf` so the browser handles "Save as" natively, no canvas → blob → URL dance.
- **Why deterministic invoice numbers?** `INV-YYYY-<last 6 hex of trip uuid>` is stable, human-readable, and unique per trip. Re-generating an invoice for the same trip gives the same number, which is what users expect.

---

## 📍 Files added on this branch

```
backend/app/services/ai/
├─ client.py        108 lines · Groq+Gemini unified caller
├─ itinerary.py     128 lines · structured JSON itinerary + retry loop + 1h cache
├─ packing.py       130 lines · context-aware packing-list generator
└─ summary.py        78 lines · two-sentence trip summary

backend/app/services/invoice/
├─ builder.py       163 lines · Expense -> InvoiceData (category groupby, currency check, discount clamp)
└─ pdf.py            90 lines · WeasyPrint + Jinja2 with multi-dir template loader

backend/app/routers/ai.py        108 lines · 3 endpoints with ownership checks
backend/app/routers/invoice.py   263 lines · 5 endpoints + ORM<->Schema converters
backend/app/templates/invoice.html  427 lines · printable invoice
```

Total: **9 new files · ~1,500 lines** (Python + 1 Jinja template).

---

## 🤝 Coordination with the team

- **Frozen contract respected** — services write against `app/schemas/ai.py` and `app/schemas/invoice.py` (defined by Rupesh) without modification.
- **No model changes** — all queries use existing `Trip`, `Expense`, `Invoice`, `InvoiceItem`, `TripSection`, `User` tables.
- **`get_current_user` used everywhere**; `get_admin_user` not needed (these are user-level features).

---

<div align="center">

[← Back to main](../../tree/main) · [Author commits](../../commits/feat/ai-invoice?author=onkarkalyankar11)

</div>
