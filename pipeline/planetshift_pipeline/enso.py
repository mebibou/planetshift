"""enso.json: NOAA's Oceanic Niño Index (ONI) as one value a year and the year's phase, El Niño,
La Niña or neutral, for marking the observed years on the temperature chart.

A year's value is the mean of the twelve overlapping three-month seasons centred from the
previous October to September (SON of the year before to ASO): the global mean surface
temperature follows the tropical Pacific by about three months, so this is the ENSO state the
calendar year's temperature feels. The year is El Niño when that mean is at least +0.5 °C, La
Niña when it is at most −0.5 °C, NOAA's threshold for a season, here held for the year as a
whole (see docs/methodology/en/climate.md)."""

from pathlib import Path

import pandas as pd

from .cache import fetched

ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
ONI_PAGE = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/"
THRESHOLD = 0.5
#: The seasons of a year's window, each with the year it is labelled with relative to the year
#: classified (-1 for the autumn before): centred on October of the year before to September.
WINDOW = (
    ("SON", -1),
    ("OND", -1),
    ("NDJ", -1),
    ("DJF", 0),
    ("JFM", 0),
    ("FMA", 0),
    ("MAM", 0),
    ("AMJ", 0),
    ("MJJ", 0),
    ("JJA", 0),
    ("JAS", 0),
    ("ASO", 0),
)

SOURCE = (
    "NOAA Climate Prediction Center, Oceanic Niño Index (ONI): three-month running means of "
    "ERSSTv6 sea surface temperature anomalies in the Niño 3.4 region (centred 30-year base "
    "periods)"
)
SOURCES = [
    {
        "id": "noaa-oni",
        "name": "NOAA CPC, Oceanic Niño Index (ERSSTv6 Niño 3.4, three-month running means)",
        "version": "ONI on ERSSTv6, seasons from DJF 1950",
        "url": ONI_PAGE,
        "licence": "Public domain (US Government work)",
    },
]


def read_oni(cache_dir: Path) -> pd.DataFrame:
    """The ONI table: season, year (as NOAA labels it) and anomaly in °C."""
    return parse_oni(fetched(cache_dir / "noaa", ONI_URL).read_text())


def parse_oni(text: str) -> pd.DataFrame:
    rows = [line.split() for line in text.splitlines()[1:] if line.strip()]
    return pd.DataFrame(
        {
            "season": [r[0] for r in rows],
            "year": [int(r[1]) for r in rows],
            "anomaly": [float(r[3]) for r in rows],
        }
    )


def annual(oni: pd.DataFrame) -> pd.Series:
    """Each year's mean ONI over its WINDOW, for the years whose twelve seasons are all there."""
    by_key = oni.set_index(["season", "year"])["anomaly"]

    def window(year: int) -> list[float] | None:
        keys = [(season, year + offset) for season, offset in WINDOW]
        return [float(by_key[k]) for k in keys] if all(k in by_key.index for k in keys) else None

    years = range(int(oni["year"].min()), int(oni["year"].max()) + 1)
    values = {y: w for y in years if (w := window(y)) is not None}
    return pd.Series({y: sum(w) / len(w) for y, w in values.items()}, dtype=float)


def phase(value: float) -> str:
    return "elNino" if value >= THRESHOLD else "laNina" if value <= -THRESHOLD else "neutral"


def enso_json(oni: pd.DataFrame) -> dict:
    values = annual(oni).round(2)
    return {
        "years": [int(y) for y in values.index],
        "oni": [float(v) for v in values],
        "phase": [phase(v) for v in values],
        "threshold": THRESHOLD,
        "source": SOURCE,
    }
