"""The FaIR calibration and a few scenarios with their Python FaIR temperatures, written for the
TypeScript port's prototype (issue #66) to read: not part of the app's data.

Run with `uv run python -m planetshift_pipeline.fair_ts_export [--out <folder>]`; the app's
validation test reads `pipeline/cache/fair/ts-prototype/` by default. `--fixture <file>` writes
instead the small, self-contained case the app's unit tests keep: a few members, a made-up
scenario, and Python FaIR's temperatures for it.
"""

import argparse
import json
import logging
from pathlib import Path

import numpy as np
from fair import FAIR

from . import climate_fair, fair_app
from .cache import DEFAULT_CACHE
from .climate import LAST_HISTORY, SCENARIO_END
from .climate_scenarios import cause_emissions, removals, without
from .fair_app import configured, listed, ssp_inputs
from .sources import primap, rcmip

log = logging.getLogger(__name__)

DEFAULT_OUT = DEFAULT_CACHE / "fair" / "ts-prototype"
#: The year the "stopped" scenario brings every emission back to its 1750 level.
STOP_YEAR = 2025


def calibration(setup: climate_fair.Setup, f: FAIR) -> dict:
    """The app's calibration, and FaIR's discretised energy balance model to check the port's."""
    ebm = {k: listed(f.ebms[k].to_numpy()) for k in ("eb_matrix_d", "forcing_vector_d")}
    return fair_app.calibration(setup, f) | {"ebm": ebm}


def stopped(emissions: dict[str, np.ndarray], baseline: dict[str, float]) -> dict:
    """Every emitted specie at its 1750 level from STOP_YEAR; the land-use forcing kept."""
    years = climate_fair.START + np.arange(len(emissions["CH4"]))
    return {
        s: np.where(years >= STOP_YEAR, baseline[s], v) if s in baseline else v
        for s, v in emissions.items()
    }


def scenarios(setup: climate_fair.Setup, cache_dir: Path) -> dict[str, dict[str, np.ndarray]]:
    """The three SSPs as `climate.build` makes them, and on SSP2-4.5 two of its attribution runs
    (agriculture and air pollution removed) and every emission stopped from STOP_YEAR."""
    rcmip_df = rcmip.load(cache_dir)
    primap_df = primap.load(cache_dir)
    years = np.arange(climate_fair.START, SCENARIO_END + 1)
    baseline = climate_fair.baseline_emissions(setup)
    runs = ssp_inputs(setup, cache_dir)
    sector = {
        c: cause_emissions(primap_df, rcmip_df, "ssp245", c, years, LAST_HISTORY)
        for c in ("agriculture", "fossilIndustry", "waste")
    }
    base = runs["ssp245"]
    taken = removals(
        base, sector["agriculture"], sector["fossilIndustry"], baseline, sector["waste"]
    )
    return runs | {
        "ssp245-agriculture": without(base, taken["agriculture"]),
        "ssp245-airPollution": without(base, taken["airPollution"]),
        "ssp245-stopped": stopped(base, baseline),
    }


def write_scenarios(
    setup: climate_fair.Setup, runs: dict[str, dict[str, np.ndarray]], out: Path
) -> None:
    result = climate_fair.run(setup, runs, SCENARIO_END + 1)
    for i, name in enumerate(result.scenarios):
        by_specie = runs[name]
        document = {
            "emissions": {s: by_specie[s].tolist() for s in setup.emitted},
            "landUse": by_specie[climate_fair.LAND_USE].tolist(),
        }
        (out / f"{name}.json").write_text(json.dumps(document))
        temperature = np.ascontiguousarray(result.temperature[:, i, :].T, dtype="<f8")
        (out / f"{name}.temperature.f64").write_bytes(temperature.tobytes())


def export(cache_dir: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    setup = climate_fair.load_setup(cache_dir)
    f = configured(setup, SCENARIO_END + 1)
    (out / "calibration.json").write_text(json.dumps(calibration(setup, f)))
    write_scenarios(setup, scenarios(setup, cache_dir), out)
    log.info("wrote %s", out)


FIXTURE_MEMBERS = 3
FIXTURE_END = 2101
#: Species the fixture's scenario moves away from their 1750 emissions, and by how much a year.
FIXTURE_RAMPS = {
    "CO2 FFI": 0.22,
    "CO2 AFOLU": 0.01,
    "CH4": 1.5,
    "N2O": 0.04,
    "Sulfur": 0.4,
    "BC": 0.03,
    "NOx": 0.5,
    "CFC-11": 2.0,
    "HFC-134a": 1.0,
}


def fixture_scenario(setup: climate_fair.Setup) -> dict[str, np.ndarray]:
    """1750 emissions, those of FIXTURE_RAMPS ramping up from 1850 and down after 2050, and a
    prescribed land-use forcing; rounded so the file holds exactly what Python FaIR ran."""
    years = np.arange(climate_fair.START, FIXTURE_END)
    ramp = np.clip(years - 1850, 0, None) - 5 * np.clip(years - 2050, 0, None)
    base = climate_fair.baseline_emissions(setup)
    emissions = {s: np.round(base[s] + FIXTURE_RAMPS.get(s, 0) * ramp, 6) for s in setup.emitted}
    land = np.round(-0.001 * np.clip(years - 1850, 0, None), 6)
    return emissions | {climate_fair.LAND_USE: land}


def fixture_temperature(setup: climate_fair.Setup, scenario: dict) -> np.ndarray:
    """Python FaIR's surface temperature at each timebound, by member."""
    f = climate_fair.filled(setup, {"fixture": scenario}, FIXTURE_END)
    f.run(progress=False)
    return f.temperature.sel(layer=0, scenario="fixture").to_numpy().T


def write_fixture(cache_dir: Path, path: Path) -> None:
    setup = climate_fair.load_setup(cache_dir, FIXTURE_MEMBERS)
    f = configured(setup, FIXTURE_END)
    scenario = fixture_scenario(setup)
    document = {
        "calibration": calibration(setup, f),
        # A series that never changes is given once.
        "emissions": {
            s: float(scenario[s][0])
            if np.all(scenario[s] == scenario[s][0])
            else scenario[s].tolist()
            for s in setup.emitted
        },
        "landUse": scenario[climate_fair.LAND_USE].tolist(),
        "temperature": fixture_temperature(setup, scenario).tolist(),
    }
    path.write_text(json.dumps(document))
    log.info("wrote %s", path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--fixture", type=Path)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    if args.fixture:
        write_fixture(args.cache, args.fixture)
    else:
        export(args.cache, args.out)


if __name__ == "__main__":
    main()
