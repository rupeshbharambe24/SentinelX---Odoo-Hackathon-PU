"""
backend/app/services/invoice/pdf.py
-------------------------------------
Renders an InvoiceData object to a PDF byte string using
WeasyPrint + Jinja2.

Public API
----------
    render_invoice_pdf(invoice: InvoiceData) -> bytes

Note: The template is looked up in backend/app/templates/invoice.html first,
      then falls back to app/templates/invoice.html (the root app/ folder).
"""
from __future__ import annotations

import logging
import os

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.schemas.invoice import InvoiceData

logger = logging.getLogger(__name__)

# Path to templates directory — searches backend templates first, then root app/
_TEMPLATE_DIRS = [
    os.path.join(os.path.dirname(__file__), "..", "..", "templates"),
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "app", "templates"),
    "app/templates",
    "templates",
]


def _get_jinja_env() -> Environment:
    # Find first directory that actually contains invoice.html
    for tdir in _TEMPLATE_DIRS:
        candidate = os.path.join(tdir, "invoice.html")
        if os.path.isfile(candidate):
            logger.debug("Using invoice template from: %s", tdir)
            return Environment(
                loader=FileSystemLoader(tdir),
                autoescape=select_autoescape(["html"]),
            )
    raise FileNotFoundError(
        "invoice.html template not found. "
        f"Searched: {_TEMPLATE_DIRS}"
    )


def render_invoice_pdf(invoice: InvoiceData) -> bytes:
    """
    1. Load invoice.html Jinja2 template.
    2. Render with invoice data.
    3. Convert to PDF via WeasyPrint.

    Returns raw PDF bytes suitable for streaming to client.
    """
    try:
        from weasyprint import HTML  # lazy import — heavy dependency
    except ImportError as exc:
        raise ImportError(
            "WeasyPrint not installed. Run: pip install weasyprint\n"
            "System deps (Ubuntu): apt install libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0\n"
            "System deps (Mac):    brew install pango"
        ) from exc

    env = _get_jinja_env()
    template = env.get_template("invoice.html")

    # Build a flattened invoice dict for template compatibility
    td = invoice.traveler_details or {}
    html_str = template.render(
        invoice=invoice,
        invoice_dict=invoice.model_dump(),
        traveler_name=td.get("name", "Traveler"),
        traveler_email=td.get("email", ""),
        trip_name=td.get("trip_name", ""),
        destination=td.get("destination", ""),
        travel_dates=td.get("travel_dates", ""),
    )

    logger.info("Rendering PDF for invoice %s", invoice.invoice_number)
    pdf_bytes: bytes = HTML(string=html_str).write_pdf()
    logger.info(
        "PDF rendered: %d bytes for invoice %s",
        len(pdf_bytes),
        invoice.invoice_number,
    )
    return pdf_bytes
