"""Carbon that large pelagic fish left uncaught would sink to the deep ocean when they die
(deadfall), per tonne of each seafood item a country produces (docs/methodology/en/seafood.md).

Mariani et al. (2020) give, for tunas, billfishes, mackerels and sharks, the share of a fish's
carbon that would sink and stay in the deep ocean had it not been caught. Only the three ISSCAAP
groups of large pelagic fish in `seafood_isscaap.csv` count; their catch at sea is weighed against
the whole production of the item it belongs to, so a tonne less of the item is a tonne less of
each of its parts.
"""

from pathlib import Path

import pandas as pd

from . import seafood as Sf

HERE = Path(__file__).resolve().parent.parent
DEADFALL_CSV = HERE / "seafood_deadfall.csv"

#: Carbon in a fish's wet weight, and tonnes of CO2 per tonne of carbon (Mariani et al. 2020).
CARBON = 0.125
CO2_PER_C = 44 / 12
#: The share of the large-pelagic catch taken where a carcass's carbon would be kept: over waters
#: deeper than 200 m, outside the four eastern boundary upwelling systems. Mariani et al. count 1.09
#: MtC of large fish caught there in 2014, 8.7 Mt at 12.5% carbon, against 19.6 Mt of FishStat
#: capture of the three groups that year. An assumption: it also holds the species they leave out.
DEEP_WATER_SHARE = 0.44
#: Years for the storage to build up once catch falls, as a first-order recovery of the stocks.
BUILD_UP_YEARS = 10

MARIANI = "https://doi.org/10.1126/sciadv.abb4848"
SOURCES = [
    {
        "id": "mariani-2020",
        "name": "Mariani et al. (2020), Let more big fish sink: Fisheries prevent blue carbon "
        "sequestration, half in unprofitable areas, Science Advances 6, eabb4848, Fig. 1 and "
        "fig. S2",
        "version": "2020, catches 1950-2014",
        "url": MARIANI,
        "licence": "CC BY-NC 4.0",
    },
]


def load(path: Path = DEADFALL_CSV) -> pd.DataFrame:
    return pd.read_csv(path)


def group_fractions(table: pd.DataFrame) -> pd.Series:
    """isscaap_group -> the share of its catch's carbon that would sink, the taxa's fractions
    weighted by their share of the carbon Mariani et al. find caught."""
    weighted = table.assign(w=table["sinking_fraction"] * table["carbon_share"])
    sums = weighted.groupby("isscaap_group")[["w", "carbon_share"]].sum()
    return sums["w"] / sums["carbon_share"]


def stored_per_tonne(fractions: pd.Series, deep: float = DEEP_WATER_SHARE) -> pd.Series:
    """isscaap_group -> tonnes of CO2 kept in the deep ocean per tonne of catch avoided."""
    return deep * fractions * CARBON * CO2_PER_C


def per_item(
    fishstat: pd.DataFrame,
    year: int,
    countries: set[str],
    isscaap: pd.DataFrame | None = None,
    table: pd.DataFrame | None = None,
) -> dict[str, dict[str, float]]:
    """iso3 -> {fbs_code: kg of CO2 kept in the deep ocean per tonne less of the item produced},
    from FishStat's window of years; items without large pelagic catch at sea are left out."""
    groups = Sf.load_isscaap() if isscaap is None else isscaap
    per_t = stored_per_tonne(group_fractions(load() if table is None else table))
    rows = Sf.window(fishstat, year).merge(groups[["isscaap_group", "fbs_code"]])
    rows = rows[rows["iso3"].isin(countries)]
    at_sea = (rows["system"] == "capture") & ~rows["inland"]
    stored = rows["tonnes"] * rows["isscaap_group"].map(per_t).fillna(0.0).where(at_sea, 0.0)
    sums = rows.assign(stored=stored).groupby(["iso3", "fbs_code"])[["stored", "tonnes"]].sum()
    kept = sums[(sums["stored"] > 0) & (sums["tonnes"] > 0)]
    kg = (kept["stored"] / kept["tonnes"] * 1000).round(3)
    return {
        iso3: {str(code): float(v) for (_, code), v in s.items()}
        for iso3, s in kg.groupby(level="iso3")
    }


def world_stored(fishstat: pd.DataFrame, year: int, table: pd.DataFrame | None = None) -> dict:
    """World large pelagic catch at sea, t a year, and the CO2 its deadfall would keep, t a year,
    over FishStat's window of years, for the log and the methodology."""
    per_t = stored_per_tonne(group_fractions(load() if table is None else table))
    rows = Sf.window(fishstat, year)
    caught = rows[
        (rows["system"] == "capture") & ~rows["inland"] & rows["isscaap_group"].isin(per_t.index)
    ]
    tonnes = caught.groupby("isscaap_group")["tonnes"].sum() / Sf.YEARS
    return {"catch": float(tonnes.sum()), "co2": float((tonnes * per_t).sum())}


def deadfall_json(factors: dict[str, dict[str, float]]) -> dict:
    return {
        "kgCo2PerTonne": factors,
        "deepWaterShare": DEEP_WATER_SHARE,
        "buildUpYears": BUILD_UP_YEARS,
        "source": MARIANI,
    }
