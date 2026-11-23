"""FAO FishStat global production (capture and aquaculture) by country, species and water area."""

from __future__ import annotations

import zipfile
from pathlib import Path

import pandas as pd

from ..cache import extracted, fetched

VERSION = "2025.1.0"
URL = f"https://www.fao.org/fishery/static/Data/GlobalProduction_{VERSION}.zip"
PAGE = "https://www.fao.org/fishery/en/collection/global_production"
LICENCE = "CC BY 4.0 (FAO statistical database terms of use)"
SOURCES = [
    {
        "id": "fao-fishstat-production",
        "name": "FAO FishStat, global fishery and aquaculture production (quantity)",
        "version": f"{VERSION}, 1950-2023",
        "url": PAGE,
        "licence": LICENCE,
    }
]

TONNES_LIVE_WEIGHT = "Q_tlw"
CAPTURE = "CAPTURE"
INLAND = "Inland waters"


def tidy(
    quantity: pd.DataFrame, species: pd.DataFrame, areas: pd.DataFrame, countries: pd.DataFrame
) -> pd.DataFrame:
    """Rows (iso3, year, isscaap_group, inland, system, tonnes) of live-weight production; system
    is capture or aquaculture (freshwater, brackish and marine together)."""
    q = quantity[quantity["MEASURE"] == TONNES_LIVE_WEIGHT]
    q = q.merge(
        species[["3A_Code", "ISSCAAP_Group_En"]],
        left_on="SPECIES.ALPHA_3_CODE",
        right_on="3A_Code",
    )
    q = q.merge(
        areas[["Code", "InlandMarine_Group_En"]], left_on="AREA.CODE", right_on="Code", how="left"
    )
    q = q.merge(countries[["UN_Code", "ISO3_Code"]], left_on="COUNTRY.UN_CODE", right_on="UN_Code")
    out = pd.DataFrame(
        {
            "iso3": q["ISO3_Code"],
            "year": q["PERIOD"].astype(int),
            "isscaap_group": q["ISSCAAP_Group_En"],
            "inland": q["InlandMarine_Group_En"] == INLAND,
            "system": (q["PRODUCTION_SOURCE_DET.CODE"] == CAPTURE).map(
                {True: "capture", False: "aquaculture"}
            ),
            "tonnes": pd.to_numeric(q["VALUE"], errors="coerce").fillna(0.0),
        }
    )
    keys = ["iso3", "year", "isscaap_group", "inland", "system"]
    out = out[out["iso3"].fillna("").str.len() == 3]
    return out.groupby(keys, as_index=False)["tonnes"].sum()


def read(cache_dir: Path, first: int, last: int) -> pd.DataFrame:
    """`tidy` rows for the years first..last, kept as an extract in the cache once read."""
    extract = Path(cache_dir) / "extracts" / f"fishstat_{VERSION}_{first}_{last}.pkl"
    return extracted(extract, lambda: from_zip(Path(cache_dir), first, last))


def from_zip(cache_dir: Path, first: int, last: int) -> pd.DataFrame:
    """FishStat's production quantities for first..last, with their species, areas and countries."""
    path = fetched(cache_dir, URL)
    text = {"dtype": str, "keep_default_na": False}
    with zipfile.ZipFile(path) as z:
        quantity = pd.read_csv(
            z.open("Global_production_quantity.csv"),
            dtype={"COUNTRY.UN_CODE": str, "AREA.CODE": str, "VALUE": float},
        )
        quantity = quantity[quantity["PERIOD"].between(first, last)]
        species = pd.read_csv(z.open("CL_FI_SPECIES_GROUPS.csv"), **text)
        areas = pd.read_csv(z.open("CL_FI_WATERAREA_GROUPS.csv"), **text)
        countries = pd.read_csv(z.open("CL_FI_COUNTRY_GROUPS.csv"), **text)
    return tidy(quantity, species, areas, countries)
