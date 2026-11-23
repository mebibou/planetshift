"""Emissions by cause: PRIMAP-hist history joined to each SSP's sector trajectory, and FaIR inputs
with one cause taken out."""

import numpy as np
import pandas as pd

from .sources import primap, rcmip

CAUSES = ("fossilIndustry", "agriculture", "landUse", "airPollution")
# The causes whose emissions are greenhouse gases, which add up nearly exactly when taken out.
GREENHOUSE = ("fossilIndustry", "agriculture", "landUse")
# Aerosols and their precursors, as FaIR runs them: sulphur, black and organic carbon, ammonia and
# nitrogen oxides, from every sector.
AEROSOLS = ("Sulfur", "BC", "OC", "NH3", "NOx")
GASES = ("co2", "ch4", "n2o")
FAIR_GAS = {"co2": "CO2 FFI", "ch4": "CH4", "n2o": "N2O"}
GAS_SPECIES = {"co2": ("CO2 FFI", "CO2 AFOLU"), "ch4": ("CH4",), "n2o": ("N2O",)}
KG_PER_FAIR_UNIT = {"CO2 FFI": 1e12, "CO2 AFOLU": 1e12, "CH4": 1e9, "N2O": 1e9}
KG_PER_RCMIP_UNIT = {"Mt CH4/yr": 1e9, "kt N2O/yr": 1e6, "Mt CO2/yr": 1e9}

# Each SSP's trajectory for agriculture and for fossil fuels and industry, by gas, as RCMIP
# variables: added (+1) or subtracted (-1). None: no SSP variable, held at the last history year.
SSP_AGRICULTURE = {
    "co2": None,
    "ch4": {"Emissions|CH4|MAGICC AFOLU|Agriculture": 1},
    "n2o": {"Emissions|N2O|MAGICC AFOLU": 1},
}
SSP_FOSSIL_INDUSTRY = {
    "co2": {"Emissions|CO2|MAGICC Fossil and Industrial": 1},
    "ch4": {
        "Emissions|CH4|MAGICC Fossil and Industrial": 1,
        "Emissions|CH4|MAGICC Fossil and Industrial|Waste": -1,
    },
    "n2o": {"Emissions|N2O|MAGICC Fossil and Industrial": 1},
}
PRIMAP_CATEGORIES = {
    "agriculture": (primap.AGRICULTURE,),
    "fossilIndustry": (primap.ENERGY, primap.INDUSTRIAL_PROCESSES),
}


def harmonised(
    years: np.ndarray, history: np.ndarray, scenario: np.ndarray | None, last: int
) -> np.ndarray:
    """History up to `last`, then the scenario scaled so it meets history in `last`.

    With no scenario, the last historical value is held.
    """
    at_last = history[years == last][0]
    future = (
        np.full(len(years), at_last)
        if scenario is None
        else scenario * (at_last / scenario[years == last][0])
    )
    return np.where(years <= last, history, future)


def ssp_kg(
    rcmip_df: pd.DataFrame, scenario: str, variables: dict[str, int], years: np.ndarray
) -> np.ndarray:
    return sum(
        sign
        * rcmip.series(rcmip_df, scenario, variable, years)
        * KG_PER_RCMIP_UNIT[rcmip.unit(rcmip_df, scenario, variable)]
        for variable, sign in variables.items()
    )


def cause_emissions(
    primap_df: pd.DataFrame,
    rcmip_df: pd.DataFrame,
    scenario: str,
    cause: str,
    years: np.ndarray,
    last: int,
) -> dict[str, np.ndarray]:
    """kg/yr by gas of `cause` ('agriculture' or 'fossilIndustry'), history then the SSP."""
    ssp = SSP_AGRICULTURE if cause == "agriculture" else SSP_FOSSIL_INDUSTRY
    history_years = years[years <= last]

    def one(gas: str) -> np.ndarray:
        history = sum(
            primap.world_kg(primap_df, category, gas, history_years)
            for category in PRIMAP_CATEGORIES[cause]
        )
        history = np.concatenate([history, np.zeros(len(years) - len(history_years))])
        trajectory = None if ssp[gas] is None else ssp_kg(rcmip_df, scenario, ssp[gas], years)
        return harmonised(years, history, trajectory, last)

    return {gas: one(gas) for gas in GASES}


# Net CO₂, which the scenarios take below zero with carbon removal: a removal keeps it there.
NET_SPECIES = ("CO2 FFI", "CO2 AFOLU")


def without(
    emissions: dict[str, np.ndarray], removed: dict[str, np.ndarray]
) -> dict[str, np.ndarray]:
    """FaIR emissions less `removed` (kg/yr by FaIR specie), never below zero but net CO₂."""

    def less(specie: str, values: np.ndarray) -> np.ndarray:
        left = values - removed[specie] / KG_PER_FAIR_UNIT.get(specie, 1)
        return left if specie in NET_SPECIES else np.maximum(left, 0)

    return {
        specie: less(specie, values) if specie in removed else values
        for specie, values in emissions.items()
    }


def removals(
    emissions: dict[str, np.ndarray],
    agriculture: dict[str, np.ndarray],
    fossil: dict[str, np.ndarray],
    baseline: dict[str, float],
) -> dict[str, dict[str, np.ndarray]]:
    """kg/yr to take out of the FaIR inputs for each cause, by FaIR specie.

    Fossil and industrial CO₂ is all of FaIR's fossil CO₂ but agriculture's share of it (urea and
    liming), so the two never take the same tonne out; land use is all of FaIR's AFOLU CO₂; air
    pollution brings each aerosol and precursor back to its pre-industrial (1750) emissions, in
    FaIR's own units.
    """
    ffi_kg = emissions["CO2 FFI"] * KG_PER_FAIR_UNIT["CO2 FFI"]
    return {
        "agriculture": {FAIR_GAS[g]: agriculture[g] for g in GASES},
        "fossilIndustry": {
            "CO2 FFI": ffi_kg - agriculture["co2"],
            "CH4": fossil["ch4"],
            "N2O": fossil["n2o"],
        },
        "landUse": {"CO2 AFOLU": emissions["CO2 AFOLU"] * KG_PER_FAIR_UNIT["CO2 AFOLU"]},
        "airPollution": {s: emissions[s] - baseline[s] for s in AEROSOLS if s in emissions},
    }


def of_gas(removal: dict[str, np.ndarray], gas: str) -> dict[str, np.ndarray]:
    """The part of a cause's removal that is `gas`, by FaIR specie."""
    return {s: v for s, v in removal.items() if s in GAS_SPECIES[gas]}


def all_of_gas(
    emissions: dict[str, np.ndarray], baseline: dict[str, float], gas: str
) -> dict[str, np.ndarray]:
    """kg/yr that brings every source of `gas` back to its pre-industrial (1750) emissions."""
    return {
        s: (emissions[s] - baseline[s]) * KG_PER_FAIR_UNIT[s]
        for s in GAS_SPECIES[gas]
        if s in emissions
    }


def gas_causes(taken: dict[str, dict[str, np.ndarray]], gas: str) -> tuple[str, ...]:
    """The greenhouse causes that emit `gas`."""
    return tuple(c for c in GREENHOUSE if of_gas(taken[c], gas))
