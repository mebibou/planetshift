"""people.json: each SSP's human emissions above their pre-industrial (1750) level, of the
greenhouse gases and air pollutants the app has a response for, and the forcing of that air
pollution, the parts of them that are fossil fuels and industry and land use, as the causes of
warming count them, and each SSP's own population. The people-on-Earth thought experiment scales
them by person: over the SSP's population, times the number of people chosen."""

import numpy as np
import pandas as pd

from . import climate_fair
from .climate import LAST_HISTORY
from .climate_scenarios import cause_emissions
from .sources import ar6db, fair_history, primap, rcmip

SSPS = ("ssp126", "ssp245", "ssp370")
FIRST_YEAR = 2000
LAST_YEAR = 2100
SIGNIFICANT = 4
PERCENTILES = (5, 50, 95)
# The app's species and the FaIR species each adds up; halogenated gases are left out. RCMIP's
# NOx total has aviation's in it.
SPECIES = {
    "co2": ("CO2 FFI", "CO2 AFOLU"),
    "ch4": ("CH4",),
    "n2o": ("N2O",),
    "so2": ("Sulfur",),
    "bc": ("BC",),
    "oc": ("OC",),
    "nh3": ("NH3",),
    "nox": ("NOx",),
    "co": ("CO",),
    "voc": ("VOC",),
}
KG_PER_FAIR_UNIT = {"CO2 FFI": 1e12, "CO2 AFOLU": 1e12}
DEFAULT_KG_PER_UNIT = 1e9
# FaIR's forcing of air pollution: aerosol-radiation, aerosol-cloud (a logarithm of the
# emissions), black carbon on snow and ice, and the tropospheric ozone of its precursors.
ARI = ("Sulfur", "BC", "OC", "NH3", "NOx", "VOC")
CLOUD = ("Sulfur", "BC", "OC")
OZONE = ("NOx", "CO", "VOC")
SNOW = "Light absorbing particles on snow and ice"
SOURCE = (
    "RCMIP v5.1.0 SSP emissions (doi:10.5281/zenodo.4589756), less FaIR calibration 1.4.1's "
    "pre-industrial emissions, halogenated gases left out; the forcing of their air pollution "
    "from the calibration's coefficients (doi:10.5281/zenodo.10566813); each SSP's population "
    "from its marker run in the IPCC AR6 Scenario Database (doi:10.5281/zenodo.5886911)"
)
PEOPLE_PER_UNIT = {"million": 1e6}


def human_kg(
    emissions: dict[str, np.ndarray], baseline: dict[str, float], fair_species: tuple[str, ...]
) -> np.ndarray:
    """kg a year of one app species: its FaIR species above their 1750 emissions, added up."""
    return sum(
        (emissions[s] - baseline[s]) * KG_PER_FAIR_UNIT.get(s, DEFAULT_KG_PER_UNIT)
        for s in fair_species
    )


def air_pollution_erf(
    parameters: pd.DataFrame,
    species: pd.DataFrame,
    emissions: dict[str, np.ndarray],
    baseline: dict[str, float],
) -> np.ndarray:
    """W/m² (year, member) of the air pollution above its 1750 level, as FaIR computes it from
    the emissions alone (its ozone also reads the greenhouse gases and the temperature)."""
    p = parameters

    def column(name: str) -> np.ndarray:
        return p[name].to_numpy()[None, :]

    def above(s: str) -> np.ndarray:
        return (emissions[s] - baseline[s])[:, None]

    def cloud(level: dict[str, np.ndarray]) -> np.ndarray:
        return np.log(1 + sum(column(f"aci_shape[{s}]") * level[s] for s in CLOUD))

    now = {s: emissions[s][:, None] for s in CLOUD}
    then = {s: np.full((1, 1), baseline[s]) for s in CLOUD}
    ari = sum(column(f"erfari_radiative_efficiency[{s}]") * above(s) for s in ARI)
    ozone = sum(column(f"ozone_radiative_efficiency[{s}]") * above(s) for s in OZONE)
    snow = (
        species.loc["BC", "lapsi_radiative_efficiency"] * column(f"forcing_scale[{SNOW}]")
    ) * above("BC")
    return ari + ozone + snow + column("aci_scale") * (cloud(now) - cloud(then))


def by_cause(
    emissions: dict[str, np.ndarray],
    baseline: dict[str, float],
    fossil: dict[str, np.ndarray],
    agriculture: dict[str, np.ndarray],
    waste: dict[str, np.ndarray] | None = None,
) -> dict[str, dict[str, np.ndarray]]:
    """kg a year of the human emissions that are fossil fuels and industry, land use and waste, as
    the causes of warming count them: fossil CO₂ but farming's share of it, fossil CH₄ but
    waste's, all of land use's CO₂, and waste's CH₄ and N₂O."""
    return {
        "fossilIndustry": {
            "co2": human_kg(emissions, baseline, ("CO2 FFI",)) - agriculture["co2"],
            "ch4": fossil["ch4"],
            "n2o": fossil["n2o"],
        },
        "landUse": {"co2": human_kg(emissions, baseline, ("CO2 AFOLU",))},
    } | ({} if waste is None else {"waste": {"ch4": waste["ch4"], "n2o": waste["n2o"]}})


def rounded(values: np.ndarray) -> list[float]:
    return [float(f"{v:.{SIGNIFICANT}g}") for v in np.asarray(values, dtype=float)]


def band(values: np.ndarray) -> dict[str, list[float]]:
    """5th, 50th and 95th percentiles across members (last axis), as low, median and high."""
    low, median, high = np.percentile(values, PERCENTILES, axis=-1)
    return {"median": rounded(median), "low": rounded(low), "high": rounded(high)}


def ssp_population(rows: list[dict], ssp: str, years: np.ndarray) -> list[float]:
    """People in the SSP's marker run, by year."""
    values, unit = ar6db.series(rows, ssp, ar6db.POPULATION, years)
    return rounded(values * PEOPLE_PER_UNIT[unit])


def people_json(
    rcmip_df: pd.DataFrame,
    baseline: dict[str, float],
    parameters: pd.DataFrame,
    species: pd.DataFrame,
    population_rows: list[dict],
    primap_df: pd.DataFrame,
    history: pd.DataFrame | None = None,
) -> dict:
    years = np.arange(FIRST_YEAR, LAST_YEAR + 1)
    fair_species = sorted({s for group in SPECIES.values() for s in group})

    def one(ssp: str) -> dict:
        emissions = rcmip.fair_emissions(rcmip_df, ssp, fair_species, years, history)
        sector = {
            c: cause_emissions(primap_df, rcmip_df, ssp, c, years, LAST_HISTORY)
            for c in ("agriculture", "fossilIndustry", "waste")
        }
        causes = by_cause(
            emissions, baseline, sector["fossilIndustry"], sector["agriculture"], sector["waste"]
        )
        return {k: rounded(human_kg(emissions, baseline, v)) for k, v in SPECIES.items()} | {
            "erf": band(air_pollution_erf(parameters, species, emissions, baseline)),
            "byCause": {
                c: {g: rounded(kg) for g, kg in gases.items()} for c, gases in causes.items()
            },
        }

    return {
        "years": [int(y) for y in years],
        "bySsp": {ssp: one(ssp) for ssp in SSPS},
        "population": {ssp: ssp_population(population_rows, ssp, years) for ssp in SSPS},
        "source": SOURCE,
    }


def build_people(cache_dir) -> dict:
    setup = climate_fair.load_setup(cache_dir)
    return people_json(
        rcmip.load(cache_dir),
        climate_fair.baseline_emissions(setup),
        pd.read_csv(setup.parameters, index_col=0).loc[setup.configs],
        pd.read_csv(setup.species_file, index_col=0),
        ar6db.load(cache_dir, (ar6db.POPULATION,), ar6db.POPULATION_FILE),
        primap.load(cache_dir),
        fair_history.load(cache_dir),
    )
