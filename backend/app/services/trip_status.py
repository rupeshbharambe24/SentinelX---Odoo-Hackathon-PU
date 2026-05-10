from datetime import date
from typing import Literal, Optional


TripStatus = Literal["ongoing", "upcoming", "completed", "draft"]


def derive_status(start: Optional[date], end: Optional[date], today: Optional[date] = None) -> TripStatus:
    """Compute the ``status`` field for a trip given its dates.

    A trip with no start/end is ``draft``. Otherwise it is ``upcoming`` until
    its start date, ``completed`` after its end date, and ``ongoing`` in between.
    """
    today = today or date.today()
    if start is None or end is None:
        return "draft"
    if today < start:
        return "upcoming"
    if today > end:
        return "completed"
    return "ongoing"
