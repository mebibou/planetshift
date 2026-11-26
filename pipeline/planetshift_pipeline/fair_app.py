"""fair.json: what the app needs to run FaIR itself (issue #66). The calibrated parameters of the
members it runs, FaIR's own species and climate configs once FaIR has read the calibration, the
natural forcing, and each SSP's emissions of every specie and land-use forcing, as `climate`
runs them."""

import dataclasses
from pathlib import Path

import numpy as np
import pandas as pd
from fair import FAIR

from . import climate_fair
from .climate import HORIZON, PULSE_YEARS, SCENARIO_END, SSPS
from .sources import fair_history, rcmip

#: The members the app runs: 50 chosen to keep the full ensemble's median and 5–95% range on the
#: SSPs, without and with air pollution and with every emission stopped from 2025, the internal
#: variability off (app/test/model/fair/subset.test.ts).
MEMBERS_FILE = Path(__file__).resolve().parent.parent / "fair_members.csv"
FLAGS = (
    "greenhouse_gas",
    "aerosol_chemistry_from_emissions",
    "aerosol_chemistry_from_concentration",
)
#: Significant digits of the emissions: far below their own uncertainty, and a third the size.
DIGITS = 7


def listed(values: np.ndarray) -> list:
    """Nested lists with NaN as None, which JSON has no number for."""
    return np.where(np.isnan(values), None, values).tolist()


def compact(values: np.ndarray) -> dict:
    """A config-first array, without its config axis when every config holds the same values."""
    same = bool(np.all((values == values[:1]) | (np.isnan(values) & np.isnan(values[:1]))))
    return {"perConfig": not same, "values": listed(values[0] if same else values)}


def configured(setup: climate_fair.Setup, end: int) -> FAIR:
    """A FaIR filled as `climate_fair` fills it, every member, no emissions."""
    f = FAIR(ch4_method=climate_fair.CH4_METHOD)
    f.define_time(climate_fair.START, end, 1)
    f.define_scenarios(["none"])
    f.define_configs(setup.configs)
    f.define_species(setup.species, setup.properties)
    f.allocate()
    f.fill_species_configs(setup.species_file)
    f.override_defaults(setup.parameters)
    f._make_ebms()
    return f


def config_arrays(dataset) -> dict:
    return {
        name: compact(var.to_numpy().astype(float))
        if var.dims[0] == "config"
        else {"perConfig": False, "values": listed(var.to_numpy().astype(float))}
        for name, var in dataset.data_vars.items()
    }


def calibration(setup: climate_fair.Setup, f: FAIR) -> dict:
    natural = {
        s: listed(climate_fair._natural(setup, s, f.timebounds)) for s in ("Volcanic", "Solar")
    }
    return {
        "fair": {"version": "2.2.5", "calibration": climate_fair.CALIBRATION_VERSION},
        "species": [
            {
                "name": s,
                "type": setup.properties[s]["type"],
                "inputMode": setup.properties[s]["input_mode"],
                **{flag: bool(setup.properties[s][flag]) for flag in FLAGS},
            }
            for s in setup.species
        ],
        "configs": [int(c) for c in setup.configs],
        "speciesConfigs": config_arrays(f.species_configs),
        "climateConfigs": config_arrays(f.climate_configs.drop_vars(["seed", "use_seed"])),
        "timebounds": [float(t) for t in f.timebounds],
        "naturalForcing": natural,
    }


def ssp_inputs(setup: climate_fair.Setup, cache_dir: Path) -> dict[str, dict[str, np.ndarray]]:
    """Each SSP's emissions of every specie and land-use forcing, 1750–SCENARIO_END, as
    `climate.build` runs them."""
    rcmip_df = rcmip.load(cache_dir)
    forcing = rcmip.load_forcing(cache_dir)
    history = fair_history.load(cache_dir)
    fair_years = np.arange(climate_fair.START, max(PULSE_YEARS) + HORIZON + 1)
    years = np.arange(climate_fair.START, SCENARIO_END + 1)

    def full(ssp: str) -> dict[str, np.ndarray]:
        by = rcmip.fair_emissions(rcmip_df, ssp, setup.emitted, fair_years, history)
        land = rcmip.albedo_forcing(forcing, ssp, years)
        return {k: v[: len(years)] for k, v in by.items()} | {climate_fair.LAND_USE: land}

    return {ssp: full(ssp) for ssp in SSPS}


def chosen(setup: climate_fair.Setup, path: Path = MEMBERS_FILE) -> climate_fair.Setup:
    """The setup with only the members the app runs."""
    configs = pd.read_csv(path)["config"].astype(int).tolist()
    unknown = set(configs) - set(setup.configs)
    if unknown:
        raise ValueError(f"members not in the calibration: {sorted(unknown)}")
    return dataclasses.replace(setup, configs=configs)


def rounded(values: np.ndarray) -> list[float]:
    return [float(f"{v:.{DIGITS}g}") for v in values]


def fair_json(cache_dir: Path) -> dict:
    setup = chosen(climate_fair.load_setup(cache_dir))
    f = configured(setup, SCENARIO_END + 1)
    inputs = ssp_inputs(setup, cache_dir)
    return calibration(setup, f) | {
        "doi": climate_fair.CALIBRATION_DOI,
        "licence": climate_fair.CALIBRATION_LICENCE,
        "ssp": {
            ssp: {
                "emissions": {s: rounded(by[s]) for s in setup.emitted},
                "landUse": rounded(by[climate_fair.LAND_USE]),
            }
            for ssp, by in inputs.items()
        },
    }
