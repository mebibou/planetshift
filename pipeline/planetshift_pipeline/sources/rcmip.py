"""RCMIP v5.1.0 emissions: the SSP scenarios with their history. FaIR runs them after its
calibration's own history (`fair_history`), which RCMIP's history is only used for when none
is given."""

from pathlib import Path

import numpy as np
import pandas as pd
from fair.structure.units import compound_convert, desired_emissions_units, prefix_convert

from ..cache import fetched
from . import fair_history

VERSION = "5.1.0"
EMISSIONS_URL = (
    "https://rcmip-protocols-au.s3-ap-southeast-2.amazonaws.com/"
    "v5.1.0/rcmip-emissions-annual-means-v5-1-0.csv"
)
LICENCE = "CC BY-SA 4.0"

FAIR_NAMES = {
    "CO2 FFI": "CO2|MAGICC Fossil and Industrial",
    "CO2 AFOLU": "CO2|MAGICC AFOLU",
    "NOx aviation": "NOx|MAGICC Fossil and Industrial|Aircraft",
}


def load(cache_dir: Path) -> pd.DataFrame:
    return pd.read_csv(fetched(cache_dir / "rcmip", EMISSIONS_URL))


def rcmip_name(specie: str) -> str:
    return FAIR_NAMES.get(specie, specie.replace("-", ""))


def _row(df: pd.DataFrame, scenario: str, variable: str) -> pd.DataFrame:
    world = df[(df["Scenario"] == scenario) & (df["Region"] == "World")]
    return world[world["Variable"] == variable]


def series(df: pd.DataFrame, scenario: str, variable: str, years: np.ndarray) -> np.ndarray:
    """One RCMIP variable in its own unit, interpolated linearly to `years`, held flat beyond."""
    row = _row(df, scenario, variable)
    if len(row) != 1:
        raise KeyError(f"{scenario} {variable}: {len(row)} rows")
    values = row.loc[:, "1750":"2500"].iloc[0].astype(float)
    known = values.dropna()
    return np.interp(years, known.index.astype(int), known.to_numpy())


def unit(df: pd.DataFrame, scenario: str, variable: str) -> str:
    return _row(df, scenario, variable)["Unit"].iloc[0]


def to_fair_units(values: np.ndarray, rcmip_unit: str, specie: str) -> np.ndarray:
    prefix, rest = rcmip_unit.split()
    compound = rest.split("/")[0]
    target_prefix, target_rest = desired_emissions_units[specie].split()
    target_compound = target_rest.split("/")[0]
    return (
        values * prefix_convert[prefix][target_prefix] * compound_convert[compound][target_compound]
    )


def variable_of(df: pd.DataFrame, specie: str) -> str:
    """The RCMIP variable for a FaIR specie: the one whose name ends with its RCMIP name."""
    names = df["Variable"].drop_duplicates()
    matches = names[names.str.endswith("|" + rcmip_name(specie))].tolist()
    if len(matches) != 1:
        raise KeyError(f"{specie}: {matches}")
    return matches[0]


def fair_emissions(
    df: pd.DataFrame,
    scenario: str,
    species: list[str],
    years: np.ndarray,
    history: pd.DataFrame | None = None,
) -> dict[str, np.ndarray]:
    """Emissions of each FaIR specie for `scenario`, in FaIR's units, on calendar `years`; with
    `history` (`fair_history.load`), that history to its last year, then the scenario joined
    to it."""

    def one(specie: str, on: np.ndarray = years) -> np.ndarray:
        variable = variable_of(df, specie)
        return to_fair_units(
            series(df, scenario, variable, on), unit(df, scenario, variable), specie
        )

    def kept(specie: str) -> np.ndarray:
        last = np.array([fair_history.LAST_YEAR])
        return (
            fair_history.joined(
                one(specie), history.loc[specie], float(one(specie, last)[0]), years
            )
            if history is not None and specie in history.index
            else one(specie)
        )

    return {specie: kept(specie) for specie in species}
