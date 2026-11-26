"""Plastic reaching the ocean through rivers, tonnes a year by country: Meijer et al. (2021)'s
model (Science Advances 7, eaaz5803, Table S8), as Our World in Data publishes it."""

from pathlib import Path

import pandas as pd

from ..cache import fetched

URL = (
    "https://ourworldindata.org/grapher/plastic-entering-ocean.csv"
    "?v=1&csvType=full&useColumnShortNames=true"
)
FILE = "plastic-entering-ocean.csv"
PAGE = "https://ourworldindata.org/grapher/plastic-entering-ocean"
ARTICLE = "https://doi.org/10.1126/sciadv.aaz5803"
#: The article and its supplementary tables are CC BY-NC 4.0; Our World in Data's page says
#: CC BY 4.0, so the stricter of the two is kept.
LICENCE = "CC BY-NC 4.0"
COLUMN = "me_tons_per_year"

SOURCES = [
    {
        "id": "meijer-2021-ocean-plastic",
        "name": "Meijer et al. (2021), More than 1000 rivers account for 80% of global riverine "
        "plastic emissions into the ocean, Science Advances 7, eaaz5803 (Table S8, through Our "
        "World in Data): plastic reaching the ocean through rivers, by country",
        "version": "2021, as Our World in Data published it",
        "url": ARTICLE,
        "licence": LICENCE,
    }
]


def path(cache_dir: Path) -> Path:
    return fetched(Path(cache_dir) / "owid", URL, FILE)


def read(file: Path) -> tuple[int, pd.Series]:
    """The year and the tonnes a year by ISO3 code; Our World in Data's own aggregates
    (OWID_ codes) and rows without a code left out."""
    raw = pd.read_csv(file)
    rows = raw[raw["code"].notna() & ~raw["code"].astype(str).str.startswith("OWID_")]
    return int(rows["year"].max()), rows.set_index("code")[COLUMN].astype(float).rename_axis("iso3")
