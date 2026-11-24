"""Ember's yearly electricity data: the carbon intensity of each country's grid and the world's.

One row per area, year and electricity source, the metrics as columns. The intensity is on the
"Total generation" row, in gCO₂e per kWh generated, life-cycle (Ember gives solar and nuclear
their own non-zero intensities)."""

import logging
from email.utils import parsedate_to_datetime
from pathlib import Path

import pandas as pd

from ..cache import fetched, record, recorded, session, today

log = logging.getLogger(__name__)

URL = (
    "https://files.ember-energy.org/public-downloads/generation/outputs/"
    "release_generation_yearly_global.csv"
)
FILE = "release_generation_yearly_global.csv"
PAGE = "https://ember-energy.org/data/yearly-electricity-data/"
LICENCE = "CC BY 4.0"
LICENCE_URL = "https://ember-energy.org/creative-commons/"
NAME = "Ember, Yearly electricity data"

#: Ember's columns, renamed.
COLUMNS = {
    "Area": "area",
    "ISO 3 code": "iso3",
    "Area type": "area_type",
    "Year": "year",
    "Electricity source": "source",
    "Emissions intensity (gCO2e/kWh)": "g_per_kwh",
}
TOTAL = "Total generation"
COUNTRY = "Country or economy"
WORLD = "World"
KG_PER_G = 1e-3


def release_name(released: str) -> str:
    """The cached file's name, keyed by the date Ember last changed it: a new release is a new
    file."""
    stem, dot, ext = FILE.rpartition(".")
    return f"{stem}_{released}{dot}{ext}" if released else FILE


def last_modified(header: str | None) -> str:
    """The date of an HTTP Last-Modified header (ISO), or '' without one."""
    return parsedate_to_datetime(header).date().isoformat() if header else ""


def released(cache_dir: Path) -> str:
    """The date Ember last changed the file, from the server's Last-Modified; asked once a day
    and kept in the cache, as FAOSTAT's listing is."""
    path = cache_dir / f"last-modified_{today()}.txt"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with session().head(URL, timeout=60, allow_redirects=True) as r:
            r.raise_for_status()
            path.write_text(last_modified(r.headers.get("Last-Modified")))
    return path.read_text().strip()


def path(cache_dir: Path) -> Path:
    """The cached file of Ember's current release, downloaded the first time it is asked for."""
    root = cache_dir / "ember"
    date = released(root)
    file = fetched(root, URL, release_name(date))
    if "released" not in recorded(file):
        record(file, released=date)
    return file


def cached(cache_dir: Path) -> Path | None:
    """The newest release already in the cache, without asking the server (None if none)."""
    files = sorted((cache_dir / "ember").glob(f"{FILE.rpartition('.')[0]}_*.csv"))
    return files[-1] if files else None


def totals(raw: pd.DataFrame) -> pd.DataFrame:
    """The total-generation rows: area, iso3, area_type, year and kg CO₂e per kWh (NaN where
    Ember gives no intensity)."""
    df = raw.rename(columns=COLUMNS)
    rows = df[df["source"] == TOTAL]
    return pd.DataFrame(
        {
            "area": rows["area"],
            "iso3": rows["iso3"],
            "area_type": rows["area_type"],
            "year": rows["year"].astype(int),
            "kg_per_kwh": pd.to_numeric(rows["g_per_kwh"], errors="coerce") * KG_PER_G,
        }
    ).reset_index(drop=True)


def read(file: Path) -> pd.DataFrame:
    return totals(pd.read_csv(file, dtype={"ISO 3 code": str}))


def latest(rows: pd.DataFrame) -> pd.DataFrame:
    """Each area's latest year with an intensity."""
    known = rows.dropna(subset=["kg_per_kwh"]).sort_values(["area", "year"])
    return known.groupby("area", sort=True).tail(1).reset_index(drop=True)


def is_iso3(codes: pd.Series) -> pd.Series:
    return codes.fillna("").str.fullmatch("[A-Z]{3}")


def countries(rows: pd.DataFrame) -> pd.DataFrame:
    """Each country's intensity in its latest year: iso3, year, kg_per_kwh. Ember's regions
    (continents, the EU, the OECD, the G20, the world…) are left out; countries are mapped by
    the ISO3 code Ember gives, and any without one is logged and left out."""
    own = rows[rows["area_type"] == COUNTRY]
    unmapped = sorted(own.loc[~is_iso3(own["iso3"]), "area"].unique())
    if unmapped:
        log.warning("Ember areas with no ISO3 code, left out: %s", unmapped)
    kept = latest(own[is_iso3(own["iso3"])])
    return kept[["iso3", "year", "kg_per_kwh"]].sort_values("iso3").reset_index(drop=True)


def world(rows: pd.DataFrame) -> tuple[int, float]:
    """The world's intensity in its latest year: (year, kg CO₂e per kWh)."""
    row = latest(rows[rows["area"] == WORLD]).iloc[0]
    return int(row["year"]), float(row["kg_per_kwh"])
