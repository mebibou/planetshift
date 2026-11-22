"""Observed global mean surface temperature: HadCRUT5 and Berkeley Earth, annual, vs 1850–1900."""

import io
from pathlib import Path

import numpy as np
import pandas as pd

from ..cache import fetched

HADCRUT_VERSION = "5.2.0.0"
HADCRUT_BASE = (
    "https://www.metoffice.gov.uk/hadobs/hadcrut5/data/HadCRUT.5.2.0.0/analysis/diagnostics/"
    "HadCRUT.5.2.0.0.analysis.summary_series.global."
)
HADCRUT_ANNUAL = HADCRUT_BASE + "annual.csv"
HADCRUT_MONTHLY = HADCRUT_BASE + "monthly.csv"
HADCRUT_LICENCE = "Open Government Licence v3"

BERKELEY_URL = (
    "https://storage.googleapis.com/berkeley-earth-temperature/Global/Land_and_Ocean_summary.txt"
)
BERKELEY_LICENCE = "CC BY-NC 4.0"

PREINDUSTRIAL = (1850, 1900)


def rebaselined(years: np.ndarray, values: np.ndarray) -> np.ndarray:
    """Anomalies shifted so their 1850–1900 mean is zero."""
    window = (years >= PREINDUSTRIAL[0]) & (years <= PREINDUSTRIAL[1])
    return values - values[window].mean()


def complete_years(monthly: pd.DataFrame) -> set[int]:
    counts = monthly["Time"].str[:4].astype(int).value_counts()
    return set(counts[counts == 12].index)


def hadcrut5(cache_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    """Years and anomalies of the HadCRUT5 analysis global annual series, complete years only."""
    annual = pd.read_csv(fetched(cache_dir / "temperature", HADCRUT_ANNUAL))
    monthly = pd.read_csv(fetched(cache_dir / "temperature", HADCRUT_MONTHLY))
    kept = annual[annual["Time"].isin(complete_years(monthly))]
    years = kept["Time"].to_numpy(dtype=int)
    return years, rebaselined(years, kept["Anomaly (deg C)"].to_numpy(dtype=float))


def parse_berkeley(text: str) -> pd.DataFrame:
    """Year and the annual anomaly with air temperatures over sea ice (Berkeley's preferred)."""
    lines = [line for line in text.splitlines() if line.strip() and not line.startswith("%")]
    table = pd.read_csv(io.StringIO("\n".join(lines)), sep=r"\s+", header=None)
    return pd.DataFrame({"year": table[0].astype(int), "anomaly": table[1].astype(float)})


def berkeley(cache_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    path = fetched(cache_dir / "temperature", BERKELEY_URL)
    table = parse_berkeley(path.read_text(encoding="latin-1")).dropna()
    years = table["year"].to_numpy()
    return years, rebaselined(years, table["anomaly"].to_numpy())
