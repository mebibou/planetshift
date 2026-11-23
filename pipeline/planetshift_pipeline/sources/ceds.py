"""CEDS (Community Emissions Data System) v_2024_07_08: world emissions of each species by CEDS
sector and fuel, 1750–2022, from the aggregate summary files."""

import zipfile
from pathlib import Path

import pandas as pd

from ..cache import fetched

VERSION = "v_2024_07_08"
FILE_VERSION = "v2024_07_08"
DOI = "10.5281/zenodo.12803197"
LICENCE = "CC BY 4.0"
URL = "https://zenodo.org/api/records/12803197/files/CEDS_v_2024_07_08_aggregate.zip/content"
FILE = "CEDS_v_2024_07_08_aggregate.zip"
LAST_YEAR = 2022

# kg per unit of each species' file (kt of the species; BC and OC in kt of carbon, NOx as NO₂).
KG_PER_UNIT = dict.fromkeys(
    ("ktCO2", "ktCH4", "ktSO2", "ktC", "ktNO2", "ktNH3", "ktCO", "ktNMVOC", "ktN2O"), 1e6
)


def path(cache_dir: Path) -> Path:
    return fetched(cache_dir / "ceds", URL, FILE)


def by_sector_fuel(archive: Path, species: str, year: int = LAST_YEAR) -> pd.DataFrame:
    """World emissions of `species` (CEDS name: CO2, CH4, SO2, BC, OC, NOx…) in `year`, kg, one
    row per CEDS sector and fuel: columns sector, fuel, kg."""
    name = f"{species}_CEDS_global_emissions_by_sector_fuel_{FILE_VERSION}.csv"
    with zipfile.ZipFile(archive) as z, z.open(name) as f:
        frame = pd.read_csv(f)
    units = frame["units"].unique()
    if len(units) != 1 or units[0] not in KG_PER_UNIT:
        raise ValueError(f"{species}: units {units}")
    return pd.DataFrame(
        {
            "sector": frame["sector"],
            "fuel": frame["fuel"],
            "kg": frame[f"X{year}"].astype(float) * KG_PER_UNIT[units[0]],
        }
    )
