"""Poore & Nemecek (2018)'s emissions per kg of food by stage of the supply chain, as Our World in
Data publishes them: land-use change, farm, animal feed, processing, transport, retail, packaging
and losses, kg CO₂e per kg of food, for 42 foods."""

from pathlib import Path

import pandas as pd

from ..cache import fetched

URL = (
    "https://ourworldindata.org/grapher/food-emissions-supply-chain.csv"
    "?v=1&csvType=full&useColumnShortNames=true"
)
FILE = "food-emissions-supply-chain.csv"
PAGE = "https://ourworldindata.org/grapher/food-emissions-supply-chain"
STAGES = ("processing", "transport", "retail", "packaging")

SOURCES = [
    {
        "id": "owid-food-supply-chain",
        "name": "Our World in Data, Food: greenhouse gas emissions across the supply chain "
        "(Poore & Nemecek 2018): kg CO2e per kg of food for processing, transport, retail and "
        "packaging, as weights to share FAOSTAT's country totals between foods",
        "version": "2018",
        "url": PAGE,
        "licence": "CC BY 4.0",
    }
]


def path(cache_dir: Path) -> Path:
    return fetched(Path(cache_dir) / "owid", URL, FILE)


def read(file: Path) -> pd.DataFrame:
    """One row per food (`product`) and a column per stage of STAGES, kg CO₂e per kg."""
    raw = pd.read_csv(file)
    columns = {f"food_emissions_{s}": s for s in STAGES}
    return (
        raw.rename(columns={"entity": "product", **columns})[["product", *STAGES]]
        .set_index("product")
        .astype(float)
    )
