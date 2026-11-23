"""Deforestation attributed to agricultural commodities (DeDuCE), on FBS items: its CO₂ and the
forest area cleared."""

import logging
from pathlib import Path
from urllib.parse import quote

import pandas as pd

from .cache import downloaded_on, fetched

log = logging.getLogger(__name__)

PIPELINE_DIR = Path(__file__).resolve().parent.parent
ITEMS_CSV = PIPELINE_DIR / "deforestation_items.csv"
QCL_ITEMS_CSV = PIPELINE_DIR / "qcl_items.csv"

RECORD = "https://zenodo.org/records/18953516"
DOI = "10.5281/zenodo.18953516"
FILE = (
    "1. DeDuCE_Deforestation_attributed to agricultural and forestry commodities (2001-2023).xlsx"
)
URL = f"https://zenodo.org/api/records/18953516/files/{quote(FILE, safe='()')}/content"
CACHED_NAME = "DeDuCE_deforestation_2001-2023_v2.1.xlsx"
EXTRACT = Path(CACHED_NAME).with_suffix(".pkl").name
LICENCE = "CC BY 4.0"
VERSION = "2.1 (2001-2023)"

#: The latest five years: DeDuCE amortises each year's clearing over the five years after it.
YEARS = (2019, 2023)
FORESTRY_GROUP = "Forest plantation"
EMISSIONS = "Deforestation emissions excl. peat drainage, amortized (MtCO2)"
PEAT = "Peatland drainage emissions (MtCO2)"
AREA = "Deforestation attribution, unamortized (ha)"

COLUMNS = {
    "ISO": "iso3",
    "Year": "year",
    "Commodity group": "group",
    "Commodity": "commodity",
    EMISSIONS: "mt_co2",
    PEAT: "peat_mt_co2",
    AREA: "ha",
}

SOURCES = [
    {
        "id": "deduce",
        "name": "DeDuCE, commodity-driven deforestation and associated carbon emissions "
        "(Singh, Persson et al.)",
        "version": VERSION,
        "url": RECORD,
        "licence": LICENCE,
    }
]


def path(cache_dir: Path) -> Path:
    return fetched(cache_dir, URL, CACHED_NAME)


def read(cache_dir: Path) -> pd.DataFrame:
    """DeDuCE's attribution table, one row per producer country, year and commodity."""
    extract = cache_dir / "extracts" / EXTRACT
    if extract.exists():
        cached = pd.read_pickle(extract)
        if set(COLUMNS.values()) <= set(cached.columns):
            return cached
    log.info("reading DeDuCE")
    raw = pd.read_excel(path(cache_dir), sheet_name=0)
    df = raw.rename(columns=COLUMNS)[list(COLUMNS.values())]
    extract.parent.mkdir(parents=True, exist_ok=True)
    df.to_pickle(extract)
    return df


def item_map(
    qcl_items: pd.DataFrame | None = None, overrides: pd.DataFrame | None = None
) -> pd.DataFrame:
    """Commodity name → FBS item and the share of the commodity's emissions it takes; an
    empty fbs_code is a non-food commodity. deforestation_items.csv wins over qcl_items.csv."""
    qcl = pd.read_csv(QCL_ITEMS_CSV) if qcl_items is None else qcl_items
    extra = pd.read_csv(ITEMS_CSV) if overrides is None else overrides
    rows = pd.concat(
        [
            extra[["commodity", "fbs_code", "share"]],
            qcl.rename(columns={"qcl_item": "commodity"})[["commodity", "fbs_code", "share"]],
        ],
        ignore_index=True,
    )
    return rows.drop_duplicates("commodity").assign(
        fbs_code=lambda d: pd.to_numeric(d["fbs_code"], errors="coerce").astype("Int64")
    )


def yearly_mean(df: pd.DataFrame, years: tuple[int, int] = YEARS) -> pd.DataFrame:
    """Tonnes of CO₂ and hectares cleared a year by country and commodity, averaged over
    `years`."""
    n = years[1] - years[0] + 1
    kept = df[df["year"].between(*years)]
    means = kept.groupby(["iso3", "group", "commodity"], as_index=False)[
        ["mt_co2", "peat_mt_co2", "ha"]
    ].sum()
    return means.assign(
        t_co2=means["mt_co2"] * 1e6 / n,
        peat_t_co2=means["peat_mt_co2"] * 1e6 / n,
        ha=means["ha"] / n,
    ).drop(columns=["mt_co2", "peat_mt_co2"])


def attributed(means: pd.DataFrame, items: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """(t CO₂ and hectares by iso3 and fbs_code, t CO₂ by commodity left out and why)."""
    crops = means[means["group"] != FORESTRY_GROUP]
    joined = crops.merge(items, on="commodity", how="left", indicator=True)
    food = joined[joined["fbs_code"].notna()]
    kept = (
        food.assign(
            t_co2=food["t_co2"] * food["share"],
            ha=food["ha"] * food["share"],
            fbs_code=food["fbs_code"].astype(int),
        )
        .groupby(["iso3", "fbs_code"], as_index=False)[["t_co2", "ha"]]
        .sum()
    )
    reasons = pd.concat(
        [
            means[means["group"] == FORESTRY_GROUP].assign(reason="forestry"),
            joined[joined["_merge"] == "left_only"].assign(reason="unmapped"),
            joined[(joined["_merge"] == "both") & joined["fbs_code"].isna()].assign(
                reason="non-food"
            ),
            food[food["share"] < 1].assign(
                t_co2=food["t_co2"] * (1 - food["share"]), reason="non-food share"
            ),
        ],
        ignore_index=True,
    )
    dropped = (
        reasons.groupby(["reason", "commodity"], as_index=False)["t_co2"]
        .sum()
        .sort_values("t_co2", ascending=False, key=abs)
    )
    return kept, dropped


def by_country(
    kept: pd.DataFrame, countries: set[str], minimum: float = 1.0, value: str = "t_co2"
) -> dict:
    """{iso3: {fbs_code: `value` a year}}, t CO₂ or hectares, at least `minimum` (for CO₂, net
    emissions only: a tree crop replacing forest can store more than was cleared, and those
    cells are left out), rounded to the unit."""
    rows = kept[kept["iso3"].isin(countries) & (kept[value] >= minimum)]
    return {
        iso3: {str(code): round(float(t)) for code, t in zip(g["fbs_code"], g[value], strict=True)}
        for iso3, g in rows.sort_values(["iso3", "fbs_code"]).groupby("iso3")
    }


def deforestation_json(data: dict, area: dict, years: tuple[int, int] = YEARS) -> dict:
    return {
        "byCountry": data,
        "areaByCountry": area,
        "years": list(years),
        "source": f"DeDuCE v{VERSION.split()[0]}, Singh, Persson et al., doi:{DOI} ({LICENCE}); "
        "amortised emissions excluding peat drainage, and forest area cleared, unamortised, "
        "producer countries",
    }


def summary(data: dict, top: int = 10) -> tuple[float, list[tuple[str, float]]]:
    totals = {iso3: sum(items.values()) for iso3, items in data.items()}
    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:top]
    return sum(totals.values()), ranked


def version_note(cache_dir: Path) -> str:
    cached = cache_dir / CACHED_NAME
    return f"{VERSION}, downloaded {downloaded_on(cached) or 'unknown'}"
