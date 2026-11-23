"""Food lost from harvest up to shops, as a share of production, from FAO's Food Loss Percentage
(SDG indicator 12.3.1(a)) in the UN SDG Global Database. It covers on-farm post-harvest losses,
storage, transport and processing, which FAOSTAT's food balance losses leave out in part."""

import json
from pathlib import Path

from .cache import fetched
from .waste import whole_series

SERIES = "AG_FLS_PCT"
URL = (
    f"https://unstats.un.org/sdgs/UNSDGAPIV5/v1/sdg/Series/Data?seriesCode={SERIES}&pageSize=10000"
)
CACHE_NAME = f"sdg_{SERIES}.json"
WORLD = "World"
ALL = "ALP"

#: The database's product codes -> waste.json's loss groups; the database splits them for the
#: world only, so a region's group share is its all-products share times the world's ratio.
GROUPS = {
    "CRL_PUL": "cerealsPulses",
    "FRT_VGT": "fruitVegetables",
    "RT_TBR": "rootsTubers",
    "ANMPROD": "animal",
    ALL: "all",
}

SOURCES = [
    {
        "id": "fao-food-loss-percentage",
        "name": "FAO Food Loss Percentage, SDG indicator 12.3.1(a)",
        "version": "latest year in the UN SDG Global Database",
        "url": "https://unstats.un.org/sdgs/metadata/files/Metadata-12-03-01A.pdf",
        "licence": (
            "UN SDG Global Database: free copying and distribution with the United Nations cited "
            "as the source; commercial redistribution needs the UN's permission"
        ),
    }
]


def download(cache_dir: Path) -> list[dict]:
    return whole_series(json.loads(fetched(cache_dir, URL, CACHE_NAME).read_text()))


def _value(row: dict) -> float | None:
    v = row.get("value")
    return None if v in (None, "", "NaN") else float(v) / 100


def latest(rows: list[dict]) -> dict[str, dict[str, float]]:
    """The latest year's shares (0..1) by lower-case area name and product code, NaN dropped."""
    year = max(r["timePeriodStart"] for r in rows if _value(r) is not None)
    found = [
        (r["geoAreaName"].lower(), r["dimensions"]["Type of product"], _value(r))
        for r in rows
        if r["timePeriodStart"] == year and _value(r) is not None
    ]
    return {
        area: {code: v for a, code, v in found if a == area and v is not None}
        for area in {a for a, _, _ in found}
    }


def loss_shares(
    rows: list[dict], countries: list[str], regions: dict[str, str]
) -> dict[str, dict[str, float]]:
    """Each country's loss share by group: its region's all-products share (the world's where the
    region has none) times the world's share of the group over the world's all-products share."""
    table = latest(rows)
    world = table[WORLD.lower()]
    ratio = {GROUPS[code]: world[code] / world[ALL] for code in GROUPS if code in world}

    def of(iso3: str) -> dict[str, float]:
        base = table.get(regions.get(iso3, "").lower(), {}).get(ALL, world[ALL])
        return {group: round(base * r, 4) for group, r in ratio.items()}

    return {iso3: of(iso3) for iso3 in countries}
