"""FaIR v2 with the fair-calibrate v1.4.1 calibrated, constrained ensemble, driven by emissions."""

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from fair import FAIR
from fair.interface import fill, initialise
from fair.io import read_properties

from .cache import fetched

CALIBRATION_VERSION = "1.4.1"
CALIBRATION_DOI = "10.5281/zenodo.10566813"
CALIBRATION_LICENCE = "CC BY 4.0"
# The calibration in the column names `override_defaults` reads, as FaIR's own example
# publishes it beside the species properties and the volcanic and solar forcing it used.
FAIR_EXAMPLE = (
    "https://raw.githubusercontent.com/OMS-NetZero/FAIR/v2.2.5/examples/data/"
    "calibrated_constrained_ensemble/"
)
PARAMETERS_URL = FAIR_EXAMPLE + "calibrated_constrained_parameters_calibration1.4.1.csv"
SPECIES_URL = FAIR_EXAMPLE + "species_configs_properties_calibration1.4.1.csv"
NATURAL_FORCING_URL = FAIR_EXAMPLE + "volcanic_solar.csv"
NATURAL_FORCING_SCENARIO = "medium-extension"

START = 1750
BATCH = 4


@dataclass(frozen=True)
class Setup:
    parameters: Path
    species_file: Path
    species: list[str]
    properties: dict
    natural_forcing: pd.DataFrame
    configs: list[int]

    @property
    def emitted(self) -> list[str]:
        return [s for s in self.species if self.properties[s]["input_mode"] == "emissions"]


@dataclass(frozen=True)
class Result:
    """Annual means for calendar years `years`, shaped (year, scenario, config); `ch4_airborne`
    is the methane above its pre-industrial level, in FaIR's emission unit (Mt CH₄)."""

    years: np.ndarray
    scenarios: list[str]
    temperature: np.ndarray
    co2: np.ndarray
    ch4_airborne: np.ndarray


def load_setup(cache_dir: Path, members: int | None = None) -> Setup:
    folder = cache_dir / "fair"
    parameters = fetched(folder, PARAMETERS_URL)
    species_file = fetched(folder, SPECIES_URL)
    species, properties = read_properties(filename=species_file)
    natural = pd.read_csv(fetched(folder, NATURAL_FORCING_URL), encoding="utf-8-sig")
    configs = pd.read_csv(parameters, index_col=0).index.tolist()
    return Setup(
        parameters=parameters,
        species_file=species_file,
        species=species,
        properties=properties,
        natural_forcing=natural[natural["Scenario"] == NATURAL_FORCING_SCENARIO],
        configs=configs[:members] if members else configs,
    )


def baseline_emissions(setup: Setup) -> dict[str, float]:
    """Each emitted specie's pre-industrial (1750) emissions, which perturb nothing."""
    table = pd.read_csv(setup.species_file, index_col=0)["baseline_emissions"]
    return {s: float(table[s]) for s in setup.emitted}


def _natural(setup: Setup, specie: str, timebounds: np.ndarray) -> np.ndarray:
    row = setup.natural_forcing[setup.natural_forcing["Variable"] == specie].iloc[0]
    values = row.loc["1750":].astype(float).dropna()
    return np.interp(timebounds, values.index.astype(float), values.to_numpy())


def annual_means(bounds: np.ndarray) -> np.ndarray:
    """Calendar-year means from values at year boundaries (trapezoid)."""
    return 0.5 * (bounds[1:] + bounds[:-1])


def _run_batch(
    setup: Setup, emissions: dict[str, dict[str, np.ndarray]], end: int, carbon_feedback: bool
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    scenarios = list(emissions)
    f = FAIR(ch4_method="Thornhill2021")
    f.define_time(START, end, 1)
    f.define_scenarios(scenarios)
    f.define_configs(setup.configs)
    f.define_species(setup.species, setup.properties)
    f.allocate()
    for scenario, by_specie in emissions.items():
        for specie in setup.emitted:
            values = by_specie[specie][: len(f.timepoints), None]
            fill(f.emissions, values, scenario=scenario, specie=specie)
    scales = pd.read_csv(setup.parameters, index_col=0).loc[setup.configs]
    for specie in ("Volcanic", "Solar"):
        forcing = _natural(setup, specie, f.timebounds)
        scale = scales[f"forcing_scale[{specie}]"].to_numpy()
        fill(f.forcing, forcing[:, None, None] * scale[None, None, :], specie=specie)
    f.fill_species_configs(setup.species_file)
    f.override_defaults(setup.parameters)
    if not carbon_feedback:
        fill(f.species_configs["iirf_temperature"], 0, specie="CO2")
    initialise(f.concentration, f.species_configs["baseline_concentration"])
    initialise(f.forcing, 0)
    initialise(f.temperature, 0)
    initialise(f.cumulative_emissions, 0)
    initialise(f.airborne_emissions, 0)
    initialise(f.ocean_heat_content_change, 0)
    f.run(progress=False)
    temperature = f.temperature.sel(layer=0).to_numpy()
    co2 = f.concentration.sel(specie="CO2").to_numpy()
    ch4 = f.airborne_emissions.sel(specie="CH4").to_numpy()
    return annual_means(temperature), annual_means(co2), annual_means(ch4)


def run(
    setup: Setup,
    emissions: dict[str, dict[str, np.ndarray]],
    end: int,
    carbon_feedback: bool = True,
) -> Result:
    """Run each scenario's emissions (per specie, one value per calendar year START..end-1).

    Scenarios go through FaIR a few at a time to bound memory. `carbon_feedback=False` turns off
    the effect of warming on carbon uptake, for diagnostics.
    """
    names = list(emissions)
    batches = [names[i : i + BATCH] for i in range(0, len(names), BATCH)]
    outputs = [
        _run_batch(setup, {n: emissions[n] for n in batch}, end, carbon_feedback)
        for batch in batches
    ]
    return Result(
        years=np.arange(START, end),
        scenarios=names,
        temperature=np.concatenate([o[0] for o in outputs], axis=1),
        co2=np.concatenate([o[1] for o in outputs], axis=1),
        ch4_airborne=np.concatenate([o[2] for o in outputs], axis=1),
    )
