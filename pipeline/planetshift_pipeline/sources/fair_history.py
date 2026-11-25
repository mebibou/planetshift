"""The emissions history FaIR's calibration 1.4.1 was constrained on, to 2022.

FaIR v2.2.5 publishes it with the calibration's example scenarios, which share it to 2022. Its
land-use CO₂ is GCP-based (245 GtC over 1750–2019, against RCMIP's 190) and its 1750 methane and
N₂O are the calibration's pre-industrial levels, which RCMIP's history does not start from. The
SSPs then come from RCMIP, joined with an offset that fades out, so that a series crossing zero
(land-use CO₂ in SSP1-2.6) keeps its sign.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from ..cache import fetched

URL = (
    "https://raw.githubusercontent.com/OMS-NetZero/FAIR/v2.2.5/examples/data/"
    "calibrated_constrained_ensemble/extensions_1750-2500.csv"
)
SCENARIO = "medium-extension"
LAST_YEAR = 2022
FADE_YEARS = 15


def load(cache_dir: Path) -> pd.DataFrame:
    """Each specie's emissions to LAST_YEAR, in FaIR's units (index specie, columns years)."""
    rows = pd.read_csv(fetched(Path(cache_dir) / "fair", URL))
    history = rows[rows["scenario"] == SCENARIO].set_index("variable")
    columns = [c for c in history.columns if c[:1].isdigit() and float(c) - 0.5 <= LAST_YEAR]
    return history[columns].astype(float).rename(columns=lambda c: int(float(c) - 0.5))


def joined(
    scenario: np.ndarray, past: pd.Series, scenario_at_last: float, years: np.ndarray
) -> np.ndarray:
    """`past` up to LAST_YEAR, then `scenario` plus the gap at LAST_YEAR fading to none over
    FADE_YEARS."""
    gap = float(past[LAST_YEAR]) - scenario_at_last
    fade = np.clip(1 - (years - LAST_YEAR) / FADE_YEARS, 0, 1)
    return np.where(years <= LAST_YEAR, past.reindex(years).to_numpy(), scenario + gap * fade)
