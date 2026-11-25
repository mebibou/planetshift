"""Observed global mean sea level: AR6's assessed tide-gauge record to 1992, then NASA's satellite
altimetry from 1993, joined on their 1995–2014 means."""

import io
from pathlib import Path

import numpy as np
import pandas as pd

from ..cache import fetched

NASA_VERSION = "2026-02-05"
NASA_URL = (
    "https://zenodo.org/api/records/18649998/files/GMSL_extrap_1993_2050.2026_02_05.txt/content"
)
NASA_DOI = "https://doi.org/10.5281/zenodo.7702314"
AR6_URL = (
    "https://dap.ceda.ac.uk/badc/ar6_wg1/data/ch_09/ch9_ccb9_1_fig1/v20230523/"
    "AR6_FGD_assessment_timeseries_GMSL_tide_gauge.csv"
)
AR6_DOI = "https://doi.org/10.5285/c622adfeb4cc4ae181dc4cca82c2311c"
LICENCE = "CC BY 4.0"
FIRST_SATELLITE_YEAR = 1993
BASE = (1995, 2014)
# The file's columns: decimal year, GMSL in cm (GIA not applied), then its fit and extrapolation;
# 99900 marks a missing value, and rows past the last observation are extrapolation only.
MISSING = 9000


def parse_nasa(text: str) -> pd.Series:
    """Annual means of the weekly GMSL, metres, complete years only."""
    rows = [
        line.split() for line in text.splitlines() if line.strip() and not line.startswith("HDR")
    ]
    table = pd.DataFrame(
        [(float(r[0]), float(r[1])) for r in rows if float(r[1]) < MISSING],
        columns=["time", "cm"],
    )
    table["year"] = table["time"].astype(int)
    counts = table.groupby("year")["cm"].count()
    complete = counts[counts >= 50].index
    annual = table.groupby("year")["cm"].mean().loc[complete] / 100
    return annual


def parse_ar6(text: str) -> pd.Series:
    """The tide-gauge central estimate, metres relative to 1995–2014, by year."""
    table = pd.read_csv(io.StringIO(text), skiprows=1)
    return pd.Series(
        table["Central Estimate"].to_numpy() / 1000, index=table["Year"].astype(int).to_numpy()
    )


def rebaselined(series: pd.Series) -> pd.Series:
    return series - series.loc[BASE[0] : BASE[1]].mean()


def joined(tide_gauge: pd.Series, satellite: pd.Series) -> pd.Series:
    """The tide gauges before 1993, the satellites from 1993, both relative to 1995–2014."""
    return pd.concat(
        [tide_gauge[tide_gauge.index < FIRST_SATELLITE_YEAR], rebaselined(satellite)]
    ).sort_index()


def observed(cache_dir: Path) -> tuple[np.ndarray, np.ndarray, float]:
    """Years and the level in metres above 1900's, and how far 1995–2014 sat above 1900."""
    nasa = fetched(cache_dir / "sea_level", NASA_URL, f"nasa_gmsl_{NASA_VERSION}.txt")
    ar6 = fetched(cache_dir / "sea_level", AR6_URL)
    series = joined(
        parse_ar6(ar6.read_text(encoding="utf-8")), parse_nasa(nasa.read_text(encoding="utf-8"))
    )
    above_1900 = -float(series.iloc[0])
    return series.index.to_numpy(dtype=int), series.to_numpy() + above_1900, above_1900
