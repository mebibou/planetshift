"""Food wasted after it reaches shops (retail, food service, household), kg per person per year,
from UNEP's Food Waste Index Report 2024 as published in the UN SDG Global Database (12.3.1b)."""

import json
import logging
from pathlib import Path
from statistics import median

import pandas as pd

from .cache import fetched

log = logging.getLogger(__name__)

SERIES = "AG_FOOD_WST_PC"
URL = (
    f"https://unstats.un.org/sdgs/UNSDGAPIV5/v1/sdg/Series/Data?seriesCode={SERIES}&pageSize=10000"
)
CACHE_NAME = f"sdg_{SERIES}.json"
REPORT = "Food Waste Index Report 2024"
PREFERRED = (REPORT, "Eurostat")
REPORT_URL = "https://wedocs.unep.org/20.500.11822/45230"

#: The SDG database's sector codes -> Waste fields.
SECTORS = {"RTL": "retail", "OOHC": "foodService", "HHS": "household"}
FIELDS = list(SECTORS.values())

#: Share of each sector's waste that is edible: the Index counts inedible parts (peels, bones,
#: shells) too, and only the edible part can be avoided. Household: about three quarters in the
#: UK (WRAP, Household Food and Drink Waste in the United Kingdom 2021/22), taken as 0.75 for
#: high-income countries and 0.5 elsewhere, where more food is prepared from raw produce.
#: Food service and retail: assumed, as no country-wide measure was found.
EDIBLE_SHARE = {
    True: {"retail": 0.85, "foodService": 0.75, "household": 0.75},
    False: {"retail": 0.85, "foodService": 0.75, "household": 0.5},
}

#: Edible waste after shops is at most this share of a country's FBS food supply; the Index
#: puts it at about a fifth of food available to consumers worldwide (all parts).
MAX_SHARE_OF_FOOD = 0.4

SOURCE = (
    f"UNEP {REPORT} (2022 estimates; Eurostat's 2022 figures for European countries), via the "
    "UN SDG Global Database, indicator 12.3.1(b); edible parts only"
)
LICENCE = (
    "UNEP: reproduction for educational or non-profit purposes with acknowledgement; "
    "SDG Global Database: free reuse with attribution"
)
SOURCES = [
    {
        "id": "unep-food-waste-index",
        "name": f"UNEP {REPORT}",
        "version": "2022 estimates (Eurostat 2022 for European countries), SDG indicator 12.3.1(b)",
        "url": REPORT_URL,
        "licence": LICENCE,
    }
]


def download(cache_dir: Path) -> list[dict]:
    return whole_series(json.loads(fetched(cache_dir, URL, CACHE_NAME).read_text()))


def whole_series(page: dict) -> list[dict]:
    """The rows of the one page asked for, checked to be the whole series."""
    rows, total = page["data"], page.get("totalElements")
    if total is None or len(rows) < total:
        raise ValueError(f"{SERIES}: {len(rows)} rows of {total}; raise pageSize in the URL")
    return rows


def report_table(rows: list[dict], sources: tuple[str, ...] = PREFERRED) -> pd.DataFrame:
    """kg per person per year by M49 code (3 digits) and sector, with the Index's confidence and
    the source used, in the Index's latest year; a country takes the first of `sources` that has
    it (the database keeps Eurostat's figures, not the Index's, for European countries)."""
    df = pd.DataFrame(
        [
            {
                "m49": str(r["geoAreaCode"]).zfill(3),
                "year": int(r["timePeriodStart"]),
                "sector": SECTORS[r["dimensions"]["Food Waste Sector"]],
                "kg": float(r["value"]),
                "source": r["source"],
                "rank": sources.index(r["source"]),
                "confidence": next(iter(r.get("footnotes") or []), "")
                if r["source"] == sources[0]
                else f"{r['source']} (reported)",
            }
            for r in rows
            if r["source"] in sources and r["dimensions"].get("Food Waste Sector") in SECTORS
        ]
    )
    year = df.loc[df["rank"] == 0, "year"].max()
    best = df[df["year"] == year].sort_values("rank")
    first = best.groupby("m49")["rank"].transform("min")
    return best[best["rank"] == first].drop(columns=["year", "rank"]).reset_index(drop=True)


def by_iso3(table: pd.DataFrame, iso3_of_m49: dict[str, str]) -> pd.DataFrame:
    """One row per ISO3 code with a column per sector; areas without an ISO3 code dropped."""
    rows = table.assign(iso3=table["m49"].map(iso3_of_m49)).dropna(subset=["iso3"])
    return rows.pivot_table(index="iso3", columns="sector", values="kg", aggfunc="first").reindex(
        columns=FIELDS
    )


def region_filled(
    known: pd.DataFrame, countries: list[str], regions: dict[str, str]
) -> tuple[pd.DataFrame, dict[str, str]]:
    """A row for every country: its own estimate where it has all three sectors, otherwise the
    median of its region's countries (each sector on its own), or the world median when the region
    has none. Returns the rows and, for each filled country, what it was filled from."""
    complete = known.dropna()
    complete = complete[complete.index.isin(countries)]

    def region_median(region: str | None) -> tuple[dict[str, float], str]:
        peers = complete[complete.index.map(regions.get) == region] if region else complete[:0]
        source = peers if len(peers) else complete
        label = f"{region} median" if len(peers) else "world median"
        return {f: float(median(source[f])) for f in FIELDS}, label

    missing = [c for c in countries if c not in complete.index]
    fills = {c: region_median(regions.get(c)) for c in missing}
    filled = pd.DataFrame({c: values for c, (values, _) in fills.items()}, index=FIELDS).T
    rows = pd.concat([complete, filled]).reindex(countries)
    return rows, {c: label for c, (_, label) in fills.items()}


def edible(rows: pd.DataFrame, high_income: set[str]) -> pd.DataFrame:
    shares = pd.DataFrame([EDIBLE_SHARE[c in high_income] for c in rows.index], index=rows.index)
    return rows[FIELDS] * shares[FIELDS]


def capped(
    rows: pd.DataFrame, food_kg_per_person: pd.Series, cap: float = MAX_SHARE_OF_FOOD
) -> tuple[pd.DataFrame, list[str]]:
    """Scales a country's three sectors down together where their sum exceeds `cap` of its food
    supply per person. Countries without a food supply are left as they are."""
    total = rows[FIELDS].sum(axis=1)
    limit = food_kg_per_person.reindex(rows.index) * cap
    factor = (limit / total).where(total > limit).fillna(1.0).clip(upper=1.0)
    return rows.mul(factor, axis=0), sorted(factor[factor < 1].index)


def waste_json(rows: pd.DataFrame, source: str = SOURCE) -> dict:
    return {
        "byCountry": {
            iso3: {f: round(float(values[f]), 2) for f in FIELDS}
            for iso3, values in rows.sort_index().iterrows()
        },
        "source": source,
    }


def confidence_counts(table: pd.DataFrame, iso3_of_m49: dict[str, str]) -> pd.DataFrame:
    """How many countries have each confidence level, by sector."""
    rows = table[table["m49"].isin(iso3_of_m49)]
    return rows.pivot_table(
        index="confidence", columns="sector", values="m49", aggfunc="count", fill_value=0
    )
