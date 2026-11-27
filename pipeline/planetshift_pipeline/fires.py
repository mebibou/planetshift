"""Each country's fires in the latest fire season against the seasons before it: the State of
Wildfires 2025-26 regional summaries, burned area from MODIS MCD64A1 split by forest and
non-forest, and fire carbon as the mean of GFED5.1 and GFAS."""

from pathlib import Path

import pandas as pd

from .cache import fetched

PIPELINE_DIR = Path(__file__).resolve().parent.parent
#: The source's country names FAOSTAT spells otherwise.
NAMES_CSV = PIPELINE_DIR / "fire_names.csv"
RECORD = "21262381"
DOI = f"10.5281/zenodo.{RECORD}"
LICENCE = "CC BY 4.0"
VERSION = "State of Wildfires 2025-26"
PREFIX = "State_of_Wildfires_2025-26_"
FILES = {
    "burned": f"{PREFIX}Burned_Area_annual_data_with_anomalies.csv",
    "carbon": f"{PREFIX}Carbon_Emissions_annual_data_with_anomalies.csv",
}
#: A title line and nine comment lines come before the header.
HEADER_ROW = 10
LAYER = "Countries"
WORLD = "Global"
#: The burned-area product. MODIS Terra stops in December 2026 and later summaries move to
#: VIIRS (VNP64A1): a file without this product stops the build, to be read again on purpose.
BURNED_PRODUCT = "MODIS_MCD64A1_c6.1"
COVERS = {"Total": "burned", "Forest (>=30% tree cover)": "forest"}
CARBON_PRODUCTS = ("GFED5.1", "CAMS_GFAS")
#: The source's mean of the two products' anomalies.
SYNTHESIS = "Synthesis_value"
SEASON = ("Fire Season Start Year", "Fire Season End Year")
#: Below these baseline means an anomaly is a ratio of near nothing, so it is left out.
MIN_MEAN_KM2 = 10.0
MIN_MEAN_KG_C = 1e6
#: How far the source's baseline mean may be from the mean of the seasons before the last.
TOLERANCE = 1e-6

SOURCES = [
    {
        "id": "state-of-wildfires-2025-26",
        "name": "State of Wildfires 2025-26, regional summaries of burned area (MODIS MCD64A1) "
        "and fire carbon emissions (GFED5.1, GFAS)",
        "version": VERSION,
        "url": f"https://doi.org/{DOI}",
        "licence": LICENCE,
    }
]


def url(name: str) -> str:
    return f"https://zenodo.org/records/{RECORD}/files/{name}?download=1"


def path(cache_dir: Path, kind: str) -> Path:
    return fetched(Path(cache_dir) / "sow", url(FILES[kind]), FILES[kind])


def read(file: Path) -> pd.DataFrame:
    """The rows of the countries and of the world."""
    raw = pd.read_csv(file, skiprows=HEADER_ROW)
    return raw[raw["Regional Layer"].isin([LAYER, WORLD])]


def load_names(path: Path = NAMES_CSV) -> dict[str, str]:
    df = pd.read_csv(path)
    return dict(zip(df["name"].str.strip(), df["iso3"], strict=True))


def last_season(rows: pd.DataFrame) -> tuple[int, int]:
    last = rows[SEASON[0]].max()
    return int(last), int(rows.loc[rows[SEASON[0]] == last, SEASON[1]].iloc[0])


def burned_rows(rows: pd.DataFrame) -> pd.DataFrame:
    """The burned-area product's rows; raises when the file has none of it."""
    kept = rows[rows["Product"] == BURNED_PRODUCT]
    if kept.empty:
        raise ValueError(f"no {BURNED_PRODUCT} rows: the product changed, read the file again")
    return kept


def check_baseline(rows: pd.DataFrame, value: str, mean: str) -> float:
    """The largest gap between the source's baseline mean and the mean of every season before
    the last, as a share of it; raises if over `TOLERANCE`."""
    keys = ["Product", "Region Name", *(["Land Cover"] if "Land Cover" in rows else [])]
    ours = rows[rows[SEASON[0]] < rows[SEASON[0]].max()].groupby(keys)[value].mean()
    theirs = latest(rows).set_index(keys)[mean].dropna()
    gap = float(((ours.loc[theirs.index] - theirs).abs() / theirs.abs()).max())
    if gap > TOLERANCE:
        raise ValueError(f"the baseline is not the mean of the seasons before the last ({gap:.2%})")
    return gap


def latest(rows: pd.DataFrame) -> pd.DataFrame:
    return rows[rows[SEASON[0]] == rows[SEASON[0]].max()]


def anomalies(pct: pd.Series, mean: pd.Series, floor: float) -> pd.Series:
    """Percent departures from the mean as shares, NaN where the mean is below `floor`."""
    return (pct / 100).round(3).where(mean >= floor)


def cover(rows: pd.DataFrame, name: str) -> pd.DataFrame:
    """One land cover's km² burned in the last season and its anomaly, by region name."""
    r = rows.set_index("Region Name")
    return pd.DataFrame(
        {
            name: r["Burned Area (km^2)"].round(1),
            f"{name}Anomaly": anomalies(
                r["Burned Area Anomaly (%)"], r["Burned Area Mean Annual (km^2)"], MIN_MEAN_KM2
            ),
        }
    )


def burned(rows: pd.DataFrame) -> pd.DataFrame:
    """km² burned in the last season and its anomaly, in all and in forest, by region name."""
    last = latest(rows)
    return pd.concat(
        [cover(last[last["Land Cover"] == c], name) for c, name in COVERS.items()], axis=1
    )


def carbon(rows: pd.DataFrame) -> pd.DataFrame:
    """t C of the last season (the two products' mean) and the source's anomaly, by region name."""
    last = latest(rows)
    products = last[last["Product"].isin(CARBON_PRODUCTS)].groupby("Region Name")
    pct = last[last["Product"] == SYNTHESIS].set_index("Region Name")["Carbon Emitted Anomaly (%)"]
    mean = products["Carbon Emitted Mean Annual (kg)"].mean()
    return pd.DataFrame(
        {
            "carbon": (products["Carbon Emitted"].mean() / 1000).round(),
            "carbonAnomaly": anomalies(pct.reindex(mean.index), mean, MIN_MEAN_KG_C),
        }
    )


def record(row: pd.Series) -> dict:
    """One region's fields, those the file has no figure for left out."""
    return {k: (int(v) if k == "carbon" else float(v)) for k, v in row.items() if pd.notna(v)}


def by_region(area: pd.DataFrame, c: pd.DataFrame) -> dict[str, dict]:
    return {name: record(row) for name, row in area.join(c).iterrows()}


def by_country(regions: dict[str, dict], iso3_by_name: dict[str, str], countries: set[str]):
    """{iso3: fields} for the countries of the model the names reach, sorted."""
    named = {iso3_by_name.get(n): v for n, v in regions.items()}
    return {iso3: named[iso3] for iso3 in sorted(countries) if iso3 in named}


def unnamed(regions: dict[str, dict], iso3_by_name: dict[str, str]) -> list[str]:
    return sorted(n for n in regions if n not in iso3_by_name and n != WORLD)


def fires_json(
    data: dict, world: dict, season: tuple[int, int], baseline: dict[str, tuple[int, int]]
) -> dict:
    return {
        "season": list(season),
        "baseline": {k: list(v) for k, v in baseline.items()},
        "byCountry": data,
        "world": world,
        "source": f"State of Wildfires 2025-26 regional summaries (Burton et al., under review), "
        f"burned area MODIS MCD64A1 (Giglio et al. 2018), fire carbon GFED5.1 (van der Werf "
        f"et al. 2025) and GFAS (Kaiser et al. 2012), doi:{DOI} ({LICENCE})",
    }
