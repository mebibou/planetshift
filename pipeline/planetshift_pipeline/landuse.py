"""Each country's net CO₂ from land-use change: the Global Carbon Budget's national estimates, the
mean of its bookkeeping models."""

from pathlib import Path

import pandas as pd

from .cache import fetched

PIPELINE_DIR = Path(__file__).resolve().parent.parent
NAMES_CSV = PIPELINE_DIR / "landuse_names.csv"

OBJECT = "milTbWkl0G-MSpdYG3IBIfzy"
PAGE = f"https://meta.icos-cp.eu/objects/{OBJECT}"
URL = f"https://data.icos-cp.eu/licence_accept?ids=%5B%22{OBJECT}%22%5D"
CACHED_NAME = "National_LandUseChange_Carbon_Emissions_2025_v1.0.xlsx"
DOI = "10.18160/GCP-2025"
LICENCE = "CC BY 4.0"
VERSION = "GCB 2025 v1.0"

MODELS = ("BLUE", "OSCAR", "LUCE")
HEADER_ROW = 7
WORLD = "Global"
#: Columns that are not countries: the EU's sum, and what no country holds.
AGGREGATES = ("EU27",)
UNASSIGNED = ("OTHER", "DISPUTED")
#: The latest ten years, the decade the Global Carbon Budget gives its mean and spread for.
YEARS = (2015, 2024)
CO2_PER_C = 44.0 / 12.0
#: How far the countries and the unassigned columns may be from the world total, as a share.
TOLERANCE = 1e-3

SOURCES = [
    {
        "id": "gcb-landuse",
        "name": "Global Carbon Budget, national land-use change carbon emissions "
        "(BLUE, OSCAR and LUCE)",
        "version": VERSION,
        "url": PAGE,
        "licence": LICENCE,
    }
]


def path(cache_dir: Path) -> Path:
    return fetched(cache_dir, URL, CACHED_NAME)


def read(cache_dir: Path) -> dict[str, pd.DataFrame]:
    """Each model's sheet: Tg C a year by year (rows) and country name (columns)."""
    return {
        m: pd.read_excel(path(cache_dir), sheet_name=m, header=HEADER_ROW, index_col=0)
        for m in MODELS
    }


def load_names(path: Path = NAMES_CSV) -> dict[str, str]:
    df = pd.read_csv(path)
    return dict(zip(df["name"].str.strip(), df["iso3"], strict=True))


def check_total(sheet: pd.DataFrame, tolerance: float = TOLERANCE) -> float:
    """The largest gap between the world total and its parts (the countries and the unassigned
    columns), as a share of the largest world total; raises if over `tolerance`."""
    parts = sheet.drop(columns=[WORLD, *AGGREGATES]).sum(axis=1)
    gap = float((parts - sheet[WORLD]).abs().max() / sheet[WORLD].abs().max())
    if gap > tolerance:
        raise ValueError(f"countries add up to the world total within {gap:.2%} only")
    return gap


def mean_co2(sheets: dict[str, pd.DataFrame], years: tuple[int, int] = YEARS) -> pd.Series:
    """t CO₂ a year by column, the models' mean over `years`."""
    means = [s.loc[years[0] : years[1]].mean() for s in sheets.values()]
    return pd.concat(means, axis=1).mean(axis=1) * CO2_PER_C * 1e6


def by_country(mean: pd.Series, iso3_by_name: dict[str, str], countries: set[str]) -> dict:
    """{iso3: t CO₂ a year}, negative for a net sink, rounded to the tonne."""
    named = mean.rename(index=iso3_by_name)
    kept = named[named.index.isin(countries)]
    return {iso3: round(float(t)) for iso3, t in sorted(kept.items())}


def unnamed(mean: pd.Series, iso3_by_name: dict[str, str]) -> pd.Series:
    """The columns that are neither a known country nor an aggregate."""
    skip = {WORLD, *AGGREGATES, *UNASSIGNED}
    return mean[[n for n in mean.index if n not in iso3_by_name and n not in skip]]


def landuse_json(data: dict, world: float, years: tuple[int, int] = YEARS) -> dict:
    return {
        "byCountry": data,
        "world": round(world),
        "years": list(years),
        "source": f"Global Carbon Budget 2025, national land-use change emissions, mean of "
        f"{', '.join(MODELS[:-1])} and {MODELS[-1]}, doi:{DOI} ({LICENCE})",
    }
