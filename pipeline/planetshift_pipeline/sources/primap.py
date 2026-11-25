"""PRIMAP-hist v2.8: world emissions by IPCC 2006 category and gas, 1750 to the last year."""

from pathlib import Path

import numpy as np
import pandas as pd

from ..cache import fetched

VERSION = "2.8"
DOI = "10.5281/zenodo.22876287"
URL = (
    "https://zenodo.org/records/22876287/files/"
    "Guetschow_et_al_2026-PRIMAP-hist_v2.8_final_no_rounding_22-Sep-2026.csv"
)
LICENCE = "CC BY-NC-SA 4.0"
SCENARIO = "HISTCR"
WORLD = "EARTH"
KG_PER_GG = 1e6

AGRICULTURE = "M.AG"
ENERGY = "1"
INDUSTRIAL_PROCESSES = "2"
WASTE = "4"
GASES = {"co2": "CO2", "ch4": "CH4", "n2o": "N2O"}


def load(cache_dir: Path) -> pd.DataFrame:
    """World rows of the country-reported scenario, for CO₂, CH₄ and N₂O."""
    df = pd.read_csv(fetched(cache_dir / "primap", URL))
    return df[
        (df["area (ISO3)"] == WORLD)
        & (df["scenario (PRIMAP-hist)"] == SCENARIO)
        & (df["entity"].isin(GASES.values()))
    ]


def world_kg(df: pd.DataFrame, category: str, gas: str, years: np.ndarray) -> np.ndarray:
    """kg/yr of `gas` ('co2', 'ch4', 'n2o') in `category` on `years`; categories absent are 0."""
    rows = df[(df["category (IPCC2006_PRIMAP)"] == category) & (df["entity"] == GASES[gas])]
    if not rows.empty and not (rows["unit"].str.contains("gigagram / yr")).all():
        raise ValueError(f"unexpected unit {rows['unit'].tolist()}")
    return (
        np.zeros(len(years))
        if rows.empty
        else rows[[str(y) for y in years]].iloc[0].astype(float).fillna(0.0).to_numpy() * KG_PER_GG
    )


def last_year(df: pd.DataFrame) -> int:
    return max(int(c) for c in df.columns if c.isdigit())
